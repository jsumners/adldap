'use strict'

const ldap = require('ldapjs')

// This is a simple authentication method so that we can catch the various
// username types used during testing and return the appropriate responses.
module.exports = function authentication (server, settings) {
  const baseDN = 'dc=domain,dc=com'

  function trueResponse (req, res, next) {
    return res.end()
  }

  function falseResponse (req, res, next) {
    // code 49 is "invalid credentials"
    return res.end(49)
  }

  server.bind('auth@domain.com', trueResponse)
  server.bind(settings.authenticate.username.userPrincipalName, trueResponse)
  server.bind(settings.authenticate.username.domainUsername, trueResponse)

  server.bind(
    baseDN,
    function baseDNAuth (req, res, next) {
      if (req.dn.equals(`cn=auth,${baseDN}`)) {
        console.log('authorizing "auth" user')
        return trueResponse(req, res, next)
      }

      if (req.dn.equals(settings.authenticate.username.dn) && req.credentials === settings.authenticate.password) {
        return trueResponse(req, res, next)
      }

      if (req.dn.equals(settings.authenticate.username.dn) && req.credentials === settings.authenticate.invalidPassword) {
        return falseResponse(req, res, next)
      }

      if (req.dn.equals(`cn=invalid,${baseDN}`)) {
        return next(new ldap.InvalidCredentialsError())
      }
    }
  )
}
