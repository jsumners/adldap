'use strict'

const Promise = require('bluebird')

module.exports = function (log, adldap, clientFactory, options) {
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
      if (username.toLowerCase().startsWith('cn=') || username.toLowerCase().startsWith('dn=')) {
        log.trace('authenticating via dn')
        try {
          username = username.replace('dn=', '')
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
          return yield adldap.authenticate('dn=' + user.dn, password)
        } catch (e) {
          throw e
        }
      }

      if (username.includes('@')) {
        log.trace('authenticating with user principal name')
        try {
          const user = yield adldap.findUser({
            filter: `(userPrincipalName=${username})`,
            attributes: ['dn']
          })
          if (!user) return false
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
}
