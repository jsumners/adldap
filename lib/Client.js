'use strict'

const Promise = require('bluebird')
require('bluebird-co')

const Joi = require('joi')
const pino = require('pino')
const ldapjs = require('ldapjs')

/**
 * @property {string} [filter] A valid LDAP filter to use as the query.
 * @property {string} [searchBase] The base tree to search through.
 * Default: {@link LdapjsOptions#searchBase}
 * @property {string} [scope] The search scope to use. Can be 'base', 'one',
 * or 'sub'. Default: {@link LdapjsOptions#scope}.
 * @property {attributes} [array] Default list of attributes to return from
 * searches. Default: {@link LdapjsOptions#attributes}.
 * @typedef {object} SearchOptions
 */

/**
 * @property {string} [url] The address of the LDAP (AD) server to connect to.
 * This property is required if `socketPath` is not set.
 * @property {string} [socketPath] A Unix socket path to connect to.
 * @property {string} searchBase The base tree to search through. Can be
 * overriden via options on certain methods.
 * @property {string} [scope] The search scope to use. Can be 'base', 'one',
 * or 'sub'. Default: 'base'.
 * @property {attributes} [array] Default list of attributes to return from
 * searches. Default: `['dn', 'cn', 'sn', 'givenName', 'mail', 'memberOf']`
 * @typedef {object} LdapjsOptions
 */

/**
 * @property {string} searchUser User to bind as that will be used to search the directory.
 * @property {string} searchUserPass The password for the `searchUser`.
 * @property {LdapjsConfig} ldapjs Default options to pass to `ldapjs` methods.
 * @typedef {object} ClientConfig
 */
const optionsSchema = Joi.object().keys({
  searchUser: Joi.string().required(),
  searchUserPass: Joi.string().required(),
  ldapjs: Joi.object()
    .keys({
      url: Joi.string().uri(['ldap', 'ldaps']),
      socketPath: Joi.string(),
      searchBase: Joi.string().required(),
      scope: Joi.string().valid(['base', 'one', 'sub']).default('base'),
      attributes: Joi.array().items(Joi.string()).default(
        ['dn', 'cn', 'sn', 'givenName', 'mail', 'memberOf']
      )
    })
    .required()
    .when('socketPath', {is: null, then: Joi.object({url: Joi.required()})})
})

let log
let Response

/**
 * A simple `Promise` based interface to Active Directory backed by the `ldapjs`
 * library.
 *
 * @param {ClientConfig} config Required configuration object to configure the client.
 * @constructor
 */
function Client (config) {
  const validated = Joi.validate(config, optionsSchema)
  if (validated.error) {
    throw new Error(validated.error)
  }
  this.options = validated.value
  this.bindUser = this.options.searchUser
  this.bindPass = this.options.searchUserPass

  this.defaultLdapOptions = {
    scope: this.options.ldapjs.scope,
    attributes: this.options.ldapjs.attributes
  }

  Response = require('./Response')(log)

  const connectOptions = (this.options.ldapjs.url)
    ? {url: this.options.ldapjs.url}
    : {socketPath: this.options.ldapjs.socketPath}
  connectOptions.log = log.child({module: 'ldapjs'})

  this.client = ldapjs.createClient(connectOptions)

  this.isBound = false
}

/**
 * Attempt to authenticate a given user by attempting to bind using the
 * supplied credentials. Username formats accepted:
 *
 * + Simple: regular user name, e.g. `juser` for `Joe User`
 * + Filter: an LDAP filter that resolves to the username
 * + DN: the full LDAP DN for the user, e.g. `cn=juser,ou=users,dn=example,dn=com`.
 * + Domain: an Active Directory style username, e.g. 'domain\user'
 * + Principal: a user principal name, e.g. 'juser@domain'
 *
 * @param {string} username The username for the user to authenticate.
 * @param {string} password The user's password.
 * @returns {Promise} Resolves with a value of `true` on success, `false` on
 * failure, and rejects with an `Error` if an unrecoverable error occurs.
 */
Client.prototype.authenticate = function authenticate (username, password) {
  log.trace('authenticating user: %s', username)

  function * auth (u, p) {
    log.trace('processing inner auth')
    const client = new Client(this.options)
    yield client.bind()
    try {
      yield new Promise((resolve, reject) => {
        client.client.bind(u, p, (err) => {
          client.unbind()
          if (err) {
            return reject(err)
          }
          return resolve()
        })
      })
      log.trace('inner auth succeded')
    } catch (e) {
      log.trace('inner auth failed: %s', e.message)
      throw e
    }
  }

  function * generator () {
    if (username.toLowerCase().startsWith('cn') || username.toLowerCase().startsWith('dn')) {
      log.trace('authenticating via dn')
      try {
        yield * auth.call(this, username, password)
        return true
      } catch (e) {
        throw e
      }
    }

    if (username.indexOf('\\') > -1) {
      log.trace('authenticating via ad style')
      try {
        const user = yield this.findUser(username.split('\\')[1], {attributes: ['dn']})
        if (!user) {
          return false
        }
        return yield this.authenticate(user.dn, password)
      } catch (e) {
        throw e
      }
    }

    if (username.startsWith('(')) {
      log.trace('authenticating via filter')
      try {
        const user = yield this.findUser({filter: username, attributes: ['dn']})
        if (!user) {
          return false
        }
        return yield this.authenticate(user.dn, password)
      } catch (e) {
        throw e
      }
    }

    try {
      const user = yield this.findUser(username, {attributes: ['dn']})
      if (!user) {
        return false
      }
      return yield this.authenticate(user.dn, password)
    } catch (e) {
      throw e
    }
  }

  return Promise.coroutine(generator.bind(this))()
}

/**
 * Bind to the directory using the search user's credentials. This method
 * must be invoked prior to any other method.
 *
 * @returns {Promise} Resolves with no value on success, rejects with an
 * `Error` on failure.
 */
Client.prototype.bind = function bind () {
  return new Promise((resolve, reject) => {
    this.client.bind(this.bindUser, this.bindPass, (err) => {
      if (err) {
        log.trace('bind error: %s', err.message)
        this.client.unbind() // not really, just close the connection
        return reject(err)
      }
      log.trace('bind successful for user: %s', this.bindUser)
      this.isBound = true
      return resolve()
    })
  })
}

/**
 * Performs a search of the directory to find the user identified by the
 * given username.
 *
 * @param {string} [username] Either a simple name, e.g. 'juser', or an LDAP
 * filter that should result in a single user. If it returns multiple users,
 * only the first result will be returned. If omitted, a filter must be
 * supplied in the `options`. Default: `(&(objectcategory=user)(sAMAccountName=username))`.
 * @param {SearchOptions} [options] Options to be used for the search.
 * @returns {Promise.<object>} A user object with the properties specified in the
 * attributes option.
 */
Client.prototype.findUser = function findUser (username, options) {
  let filter = null
  if (typeof username === 'string') {
    if (username.charAt(0) === '(') {
      filter = username
    } else {
      filter = `(&(objectcategory=user)(sAMAccountName=${username}))`
    }
  }
  return this.search(Object.assign({filter}, options || username || {}))
    .then((response) => new Promise((resolve, reject) => {
      response.on('ldaperror', reject)
      response.on('complete', () => resolve(response.entries[0]))
    }))
    .catch((error) => Promise.reject(error))
}

/**
 * Perform a generic LDAP query against the directory.
 *
 * @param {string} [base] The directory tree to use as the search root.
 * Default: {@link LdapjsOptions#searchBase}.
 * @param {SearchOptions} [options] Options to use during the search.
 * @param {array} [controls] A list of directory controls to use during the search.
 * @returns {Promise} Resolves to a {@link Response} on success, rejects with
 * an `Error` on failure.
 */
Client.prototype.search = function search (base, options, controls) {
  let args = Array.from(arguments)
  if (args.length >= 2) {
    args[1] = Object.assign(this.defaultLdapOptions, args[1])
  } else if (args.length === 1 && typeof args[0] === 'object') {
    args[1] = Object.assign(this.defaultLdapOptions, args[0])
    args[0] = this.options.ldapjs.searchBase
  } else {
    args = [this.defaultLdapOptions]
  }
  if (!args[0]) {
    args = args.splice(1)
  }
  log.trace('doing search: %j', args)

  return new Promise((resolve, reject) => {
    const p = (err, res) => {
      if (err) {
        log.trace('search failed: %s', err.message)
        return reject(err)
      }

      const response = new Response(res)
      return resolve(response)
    }

    args.push(p)
    try {
      this.client.search.apply(this.client, args)
    } catch (e) {
      p(e)
    }
  })
}

/**
 * Close the connection to the directory.
 *
 * @returns {Promise} Resolves with an empty value on success, rejects with
 * an `Error` on failure.
 */
Client.prototype.unbind = function unbind () {
  log.trace('issuing unbind')
  return new Promise((resolve, reject) => {
    this.client.unbind((err) => {
      this.isBound = false
      if (err) {
        log.trace('unbind error: %s', err.message)
        return reject(err)
      }
      return resolve()
    })
  })
}

/**
 * Query the directory to determine if a user is a member of a specified group.
 *
 * @param {string} username A username as described in {@link Client#findUser}.
 * @param {string} groupName The name of the group to verify. Can be a partial
 * match.
 * @returns {Promise.<boolean>} Resolves with a `true` or `false` based on the
 * user's membership, rejects with an `Error` on failure.
 */
Client.prototype.userInGroup = function userInGroup (username, groupName) {
  log.trace('determining if user "%s" is in group: %s', username, groupName)
  const gn = groupName.toLowerCase()
  return this.findUser(username, {attributes: ['memberOf']})
    .then((user) => {
      const groups = user.memberOf.filter((group) => group.toLowerCase().indexOf(gn) > -1)
      return Promise.resolve(groups.length > 0)
    })
    .catch((err) => Promise.reject(err))
}

module.exports = function init ($log) {
  if (log) {
    return Client
  }

  log = ($log)
    ? $log.child({module: 'adlap', clazz: 'Client'})
    : pino({level: 'fatal'})
  return Client
}
