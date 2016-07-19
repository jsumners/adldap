'use strict'

const events = require('events')
const util = require('util')
const ldapCodes = require('ldapjs/lib/errors/codes')

let log

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
 * @param {object} res An ldapjs search result event emitter.
 * @constructor
 */
function Response (res) {
  this.res = res
  this.entries = []
  this.referrals = []
  this.result = null

  res.on('searchEntry', this.entryReceived.bind(this))
  res.on('searchReference', this.referralReceived.bind(this))
  res.on('error', this.errorReceived.bind(this))
  res.on('end', this.receivedEnd.bind(this))
}
util.inherits(Response, events.EventEmitter)

Response.prototype.entryReceived = function entryReceived (entry) {
  log.trace('received entry: %j', entry.object)
  this.entries.push(entry.object)
}

Response.prototype.referralReceived = function referralReceived (referral) {
  log.trace('received referrals: %j', referral.uris)
  this.referrals = this.referrals.concat(referral.uris)
}

Response.prototype.errorReceived = function errorReceived (error) {
  log.trace('received ldap tcp error: %s', error.message)
  this.emit('tcperror', error)
}

Response.prototype.receivedEnd = function receivedEnd (result) {
  log.trace('received end result: %j', result)
  this.result = result

  if (this.result.status !== 0) {
    log.trace('emitting ldap error')
    const code = Object.keys(ldapCodes).find((k) => ldapCodes[k] === this.result.status)
    return this.emit('ldaperror', new Error(code))
  }
  log.trace('emitting complete')
  return this.emit('complete')
}

module.exports = function init ($log) {
  if (log) {
    return Response
  }

  log = $log.child({module: 'adldap', clazz: 'Response'})
  return Response
}
