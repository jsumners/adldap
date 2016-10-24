'use strict'

const events = require('events')
const ldapCodes = require('ldapjs/lib/errors/codes')

module.exports = function init ($log) {
  const log = $log.child({module: 'adldap', clazz: 'Response'})

  /**
   * A wrapper around ldapjs's search result events. This wrapper exposes events:
   *
   * + `tcperror`: maps to ldapjs's `error` event for search results.
   * + `ldaperror`: emitted when the ldapjs `end` event has fired and the
   *    result status is anything other than `0`.
   * + `complete`: emitted when all search entries have been returned and the
   *    ldapjs `end` event has fired. At this point you can retrieve the
   *    `entries` and/or `referrals` from your instance of {@code Response}.
   *
   * @property {array} entries The list of search results.
   * @property {array} referrals A list of referral URLs returned by the server.
   *
   * @private
   * @typedef {EventEmitter} ResponseHandler
   */

  /**
   *
   * @param {object} res  An ldapjs search result event emitter.
   * @private
   * @return {ResponseHandler}
   */
  function factory (res) {
    const response = new events.EventEmitter()
    response.entries = []
    response.referrals = []
    response.result = null

    function entryReceived (entry) {
      log.trace('received entry: %j', entry.object)
      response.entries.push(entry.object)
    }

    function referralReceived (referral) {
      log.trace('received referrals: %j', referral.uris)
      response.referrals = response.referrals.concat(referral.uris)
    }

    function errorReceived (error) {
      log.trace('received ldap tcp error: %s', error.message)
      response.emit('tcperror', error)
    }

    function receivedEnd (result) {
      log.trace('received end result: %j', result)
      response.result = result

      if (result.status !== 0) {
        log.trace('emitting ldap error')
        const code = Object.keys(ldapCodes).find(function (k) {
          return ldapCodes[k] === result.status
        })
        return response.emit('ldaperror', new Error(code))
      }
      log.trace('emitting complete')
      response.emit('complete')
    }

    res.on('searchEntry', entryReceived)
    res.on('searchReference', referralReceived)
    res.on('error', errorReceived)
    res.on('end', receivedEnd)

    return response
  }

  return factory
}
