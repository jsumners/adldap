'use strict'

const Promise = require('bluebird')

module.exports = function (log, adldap, bindUser, bindPass) {
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
}
