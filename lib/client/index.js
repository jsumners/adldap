'use strict'

// Manually setup Bluebird with Bluebird-co since this is our main
// entry point but it doesn't use Promise anywhere.
const Promise = require('bluebird')
const bbco = require('bluebird-co/manual')
Promise.coroutine.addYieldHandler(bbco.toPromise)

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
 * @property {object} [tlsOptions] Standard Node.js TLS options to pass to
 * ldapjs.
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
      ),
      tlsOptions: Joi.object().optional()
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
     * @property {function} Change Method from the `ldapjs` library to create
     * change objects for use with {@link adldapClient#replace}. See the
     * `ldapjs` client API documentation for information on this function.
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
      },
      Change: {
        value: ldapjs.Change
      }
    })

    require('./authenticate')(log, adldap, clientFactory, options)
    require('./bind')(log, adldap, bindUser, bindPass)
    require('./findUser')(log, adldap)
    require('./search')(log, adldap, defaultLdapOptions, options)
    require('./userInGroup')(log, adldap)
    require('./replace')(log, adldap)

    return adldap
  }

  return clientFactory
}
