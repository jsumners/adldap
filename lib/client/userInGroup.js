'use strict'

const Promise = require('bluebird')

module.exports = function (log, adldap) {
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
}
