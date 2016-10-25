'use strict'
/* eslint-env node, mocha */

require('thunk-mocha')()
const expect = require('chai').expect
const log = require('pino')({level: 'fatal'})
const clientFactory = require('../lib/client')(log)

let server = require('./mockServer')

suite('adldap#authenticate(user, pass)', function () {
  let client
  suiteSetup(function (done) {
    server(function (s, socket) {
      client = clientFactory({
        searchUser: 'auth@domain.com',
        searchUserPass: 'password',
        ldapjs: {
          socketPath: socket,
          searchBase: 'dc=domain,dc=com'
        }
      })
      server = s
      client.bind().then(done).catch((err) => {
        console.log('bind failed: %s', err.message)
        done()
      })
    })
  })

  suiteTeardown(function () {
    try {
      client.unbind()
      server.server.close()
    } catch (e) {}
  })

  test('validates simple username and password', function * () {
    const result = yield client.authenticate('username', 'password')
    expect(result).to.be.true
  })

  test('validates username@domain and password', function * () {
    const result = yield client.authenticate('username@domain', 'password')
    expect(result).to.be.true
  })

  test('validates domain\\username and password', function * () {
    const result = yield client.authenticate('domain\\username', 'password')
    expect(result).to.be.true
  })

  test('validates FQDN username and password', function * () {
    const result = yield client.authenticate('CN=First Last Name,OU=Domain Users,DC=domain,DC=com', 'password')
    expect(result).to.be.true
  })

  test('validates filter username and password', function * () {
    const result = yield client.authenticate('(samaccountname=username)', 'password')
    expect(result).to.be.true
  })
})
