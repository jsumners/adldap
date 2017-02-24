'use strict'

const Promise = require('bluebird')
require('bluebird-co')

const Joi = require('joi')
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

/**
 * @module adlap
 */

/**
 * Initialize the module with a logger and return a client factory function.
 * If no logger instance is provided, a noop logger will be used.
 *
 * @param {object} [$log] A logger that conforms to the Log4j interface.
 * @return {clientFactory}
 * @alias init
 */
module.exports = function init ($log) {
  const log = $log || require('abstract-logging')
  if (!log.child) log.child = function () { return log }
  log.child({ module: 'adlap', clazz: 'client' })

  /**
   * Build an adldap instance.
   *
   * @param {ClientConfig} config Required configuration object to configure the client.
   * @returns {adldapClient}
   * @throws {Error} When an invalid configuration object is supplied.
   */
  function clientFactory (config) {
    const validated = Joi.validate(config, optionsSchema)
    if (validated.error) throw new Error(validated.error)

    const responseHandlerFactory = require('./response')(log)
    const options = validated.value
    const bindUser = options.searchUser
    const bindPass = options.searchUserPass
    const defaultLdapOptions = {
      scope: options.ldapjs.scope,
      attributes: options.ldapjs.attributes
    }
    const connectOptions = (options.ldapjs.url)
      ? {url: options.ldapjs.url}
      : {socketPath: options.ldapjs.socketPath}
    connectOptions.log = log.child({module: 'ldapjs'})

    /**
     * A simple `Promise` based interface to Active Directory backed by the `ldapjs`
     * library.
     *
     * @alias adldapClient
     */
    const adldap = Object.create({}, {
      isBound: {
        value: false,
        writable: true
      },
      _client: {
        value: ldapjs.createClient(connectOptions)
      }
    })

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
     * @returns {Promise}
     * @resolve {boolean} On successful authentication `true`, otherwise `false`.
     * @reject {Error} When an unrecoverable error occurs, e.g. connection failure.
     *
     * @memberof adldapClient
     * @method authenticate
     * @static
     */
    adldap.authenticate = function authenticate (username, password) {
      log.trace('authenticating user: %s', username)

      const auth = Promise.coroutine(function * auth (u, p) {
        log.trace('processing inner auth')
        const innerClient = clientFactory(options)
        yield innerClient.bind()
        try {
          yield new Promise((resolve, reject) => {
            innerClient._client.bind(u, p, (err) => {
              innerClient.unbind()
              if (err) {
                return reject(err)
              }
              return resolve()
            })
          })
          log.trace('inner auth succeded')
        } catch (e) {
          log.trace('inner auth failed: %s', e.message)
          if (e.code && e.code === 49) {
            log.trace('failure due to invalid credentials')
            return false
          }
          throw e
        }
        return true
      })

      function * generator () {
        if (username.toLowerCase().startsWith('cn') || username.toLowerCase().startsWith('dn')) {
          log.trace('authenticating via dn')
          try {
            const authResult = yield auth(username, password)
            return authResult
          } catch (e) {
            throw e
          }
        }

        if (username.indexOf('\\') > -1) {
          log.trace('authenticating via ad style')
          try {
            const user = yield adldap.findUser(username.split('\\')[1], {attributes: ['dn']})
            if (!user) {
              return false
            }
            return yield adldap.authenticate(user.dn, password)
          } catch (e) {
            throw e
          }
        }

        if (username.startsWith('(')) {
          log.trace('authenticating via filter')
          try {
            const user = yield adldap.findUser({filter: username, attributes: ['dn']})
            if (!user) {
              return false
            }
            return yield adldap.authenticate(user.dn, password)
          } catch (e) {
            throw e
          }
        }

        try {
          const user = yield adldap.findUser(username, {attributes: ['dn']})
          if (!user) {
            return false
          }
          return yield adldap.authenticate(user.dn, password)
        } catch (e) {
          throw e
        }
      }

      return Promise.coroutine(generator)()
    }

    /**
     * Bind to the directory using the search user's credentials. This method
     * must be invoked prior to any other method.
     *
     * @returns {Promise}
     * @resolve {*} No value is returned on success.
     * @reject {Error} On bind failure an error is returned.
     *
     * @memberof adldapClient
     * @method bind
     * @static
     */
    adldap.bind = function bind () {
      return new Promise((resolve, reject) => {
        adldap._client.bind(bindUser, bindPass, (err) => {
          if (err) {
            log.trace('bind error: %s', err.message)
            adldap._client.unbind() // not really, just close the connection
            return reject(err)
          }
          log.trace('bind successful for user: %s', bindUser)
          adldap.isBound = true
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
     * @returns {Promise}
     * @resolve {object} A user object with the properties specified in the
     * attributes option. The user returned is the first entry from a generic
     * search result set.
     * @reject {Error}
     *
     * @memberof adldapClient
     * @method findUser
     * @static
     */
    adldap.findUser = function findUser (username, options) {
      let filter = null
      if (typeof username === 'string') {
        if (username.charAt(0) === '(') {
          filter = username
        } else {
          filter = `(&(objectcategory=user)(sAMAccountName=${username}))`
        }
      }
      return adldap.search(Object.assign({filter}, options || username || {}))
        .then((results) => Promise.resolve(results[0]))
        .catch((error) => Promise.reject(error))
    }

    /**
     * Perform a generic LDAP query against the directory.
     *
     * @param {string} [base] The directory tree to use as the search root.
     * Default: {@link LdapjsOptions#searchBase}.
     * @param {SearchOptions} [options] Options to use during the search.
     * @param {array} [controls] A list of directory controls to use during the search.
     * @returns {Promise}
     * @resolve {Array} An array of search results.
     * @reject {Error}
     *
     * @memberof adldapClient
     * @method search
     * @static
     */
    adldap.search = function search (base, _options, controls) {
      let args = Array.from(arguments)
      if (args.length >= 2) {
        args[1] = Object.assign(defaultLdapOptions, args[1])
      } else if (args.length === 1 && typeof args[0] === 'object') {
        args[1] = Object.assign(defaultLdapOptions, args[0])
        args[0] = options.ldapjs.searchBase
      } else {
        args = [defaultLdapOptions]
      }
      if (!args[0]) {
        args = args.splice(1)
      }
      log.trace('doing ldap search: %j', args)

      return new Promise((resolve, reject) => {
        const searchCB = (err, res) => {
          if (err) {
            log.trace('ldap search failed: %s', err.message)
            return reject(err)
          }

          const response = responseHandlerFactory(res)
          response.on('tcperror', (err) => {
            log.error('ldap search failed with tcp error: %s', err.message)
            log.debug(err.stack)
            reject(err)
          })
          response.on('ldaperror', (err) => {
            log.error('ldap search failed: %s', err.message)
            log.debug(err.stack)
            reject(err)
          })
          response.on('complete', () => {
            log.trace('ldap search completed: %s results found', response.entries.length)
            resolve(response.entries)
          })
        }

        args.push(searchCB)
        try {
          adldap._client.search.apply(adldap._client, args)
        } catch (e) {
          searchCB(e)
        }
      })
    }

    /**
     * Close the connection to the directory.
     *
     * @returns {Promise}
     * @resolve {*} No value is returned on success
     * @reject {Error}
     *
     * @memberof adldapClient
     * @method unbind
     * @static
     */
    adldap.unbind = function unbind () {
      log.trace('issuing unbind')
      return new Promise((resolve, reject) => {
        adldap._client.unbind((err) => {
          adldap.isBound = false
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
     * @returns {Promise}
     * @resolve {boolean} If the user is a member then `true`, otherwise `false`.
     * @reject {Error}
     *
     * @memberof adldapClient
     * @method userInGroup
     * @static
     */
    adldap.userInGroup = function userInGroup (username, groupName) {
      log.trace('determining if user "%s" is in group: %s', username, groupName)
      const gn = groupName.toLowerCase()
      return adldap.findUser(username, {attributes: ['memberOf']})
        .then((user) => {
          const groups = user.memberOf.filter((group) => group.toLowerCase().indexOf(gn) > -1)
          return Promise.resolve(groups.length > 0)
        })
        .catch((err) => Promise.reject(err))
    }

    return adldap
  }

  return clientFactory
}
