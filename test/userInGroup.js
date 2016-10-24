'use strict'
/* eslint-env node, mocha */

require('thunk-mocha')()
const expect = require('chai').expect
const log = require('pino')({level: 'fatal'})
const Client = require('../lib/Client')(log)

let server = require('./mockServer')

suite('Client#userInGroup(username, groupName)', function () {
  let client
  suiteSetup(function (done) {
    server(function (s, socket) {
      client = new Client({
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
    } catch (e) {
    }
  })

  test('returns true for valid query', function (done) {
    client.userInGroup('username1', 'budget users')
      .then((result) => {
        expect(result).to.be.true
        done()
      })
  })

  test('returns false for invalid query', function (done) {
    client.userInGroup('username1', 'administrators')
      .then((result) => {
        expect(result).to.be.false
        done()
      })
  })
})
