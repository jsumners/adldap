'use strict'

const Promise = require('bluebird')
const ldapjs = require('ldapjs')

module.exports = function (log, adldap) {
  /**
   * A wrapper around the `ldapjs` library's `modify` method.
   *
   * @param {string} dn The full path to the object to modify.
   * @param {object} change An instance of `Change` from the `ldapjs` library
   * describing the change to be made. The `Change` method is available via
   * the `Change` property on the client.
   * @returns {Promise}
   * @resolve {undefined} Does not return anything on success.
   * @reject {Error}
   *
   * @memberof adldapClient
   * @method replace
   * @static
   */
  adldap.replace = function replace (dn, change) {
    log.trace('replacing values at DN: %s', dn)
    return new Promise((resolve, reject) => {
      adldap._client.modify(dn, change, (err) => {
        if (err) {
          log.trace('replacement failed: %s', err.message)
          return reject(err)
        }
        return resolve()
      })
    })
  }

  /**
   * Update an attribute at a specified path with a new value.
   *
   * @example
   * client.replaceAttribute('foobar', 'coolAttr', 'hello world')
   *
   * @param {string} dn The full path to the object that has the atribute
   * to be modified.
   * @param {string} attribute The name of the attribute to change.
   * @param {*} value Any valid LDAP attribute value, e.g. a string or an
   * array of strings.
   * @returns {Promise}
   * @resolve {undefined} No value is returned on success.
   * @reject {Error}
   *
   * @memberof adldapClient
   * @method replaceAttribute
   * @static
   */
  adldap.replaceAttribute = function replaceAttribute (cn, attribute, value) {
    log.trace('replacing `%s` for CN `%s` with value: %j', attribute, cn, value)
    return new Promise((resolve, reject) => {
      const modification = {}
      Object.defineProperty(modification, attribute, {value, enumerable: true})
      const change = new ldapjs.Change({
        operation: 'replace',
        modification
      })
      adldap.search({filter: `(cn=${cn})`, attributes: ['dn']})
        .then((results) => {
          if (results.length === 0) return reject(Error('zero objects found'))
          if (results.length > 1) return reject(Error('too many objects found'))
          const obj = results[0]
          log.trace('got object to modify: %j', obj)
          adldap.replace(obj.dn, change).then(resolve).catch(reject)
        })
    })
  }

  /**
   * Update an attribute that is a number by incrementing its value by one.
   *
   * @example
   * client.incrementAttribute('foobar', 'myCounter')
   *
   * @param {string} cn The `CN` value for the object to modify.
   * @param {string} attribute The name of the attribute to increment.
   * @returns {Promise}
   * @resolve {undefined} Does not return anything on success.
   * @reject {Error}
   *
   * @memberof adldapClient
   * @method incrementAttribute
   * @static
   */
  adldap.incrementAttribute = function incrementAttribute (cn, attribute) {
    log.trace('incrementing `%s` for CN: %s', attribute, cn)
    return new Promise((resolve, reject) => {
      adldap.search({filter: `(cn=${cn})`, attributes: ['dn', attribute]})
        .then((results) => {
          if (results.length === 0) return reject(Error('zero objects found'))
          if (results.length > 1) return reject(Error('too many objects found'))
          const obj = results[0]
          log.trace('got object to modify: %j', obj)
          const num = Number(obj[attribute])
          if (Number.isNaN(num)) return reject(Error('attribute is not a number'))
          const modification = {}
          Object.defineProperty(modification, attribute, {value: num + 1, enumerable: true})
          const change = new ldapjs.Change({
            operation: 'replace',
            modification
          })
          adldap.replace(obj.dn, change).then(resolve).catch(reject)
        })
        .catch(reject)
    })
  }
}
