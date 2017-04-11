'use strict'

const Promise = require('bluebird')

module.exports = function (log, adldap, defaultLdapOptions, options) {
  const responseHandlerFactory = require('../response')(log)

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
}
