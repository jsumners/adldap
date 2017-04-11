'use strict'

const Promise = require('bluebird')

module.exports = function (log, adldap) {
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
        log.trace('finding user via custom filter: %s', username)
        filter = username
      } else {
        log.trace('finding user via default filter')
        filter = `(&(objectcategory=user)(sAMAccountName=${username}))`
      }
    }
    return adldap.search(Object.assign({filter}, options || username || {}))
      .then((results) => Promise.resolve(results[0]))
      .catch((error) => Promise.reject(error))
  }
}
