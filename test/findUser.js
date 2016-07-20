'use strict'
/* eslint-env node, mocha */

require('thunk-mocha')()
const expect = require('chai').expect
const log = require('pino')({level: 'fatal'})
const Client = require('../lib/Client')(log)

let server = require('./mockServer')

suite('Client#findUser(user, options)', function () {
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

  test('finds a user with simple name', function (done) {
    client.findUser('username1')
      .then((user) => {
        expect(user).to.not.be.undefined
        expect(user).to.be.an.object
        expect(user.givenName).to.equal('First')
        expect(user.sn).to.equal('Last Name #1')
        done()
      })
      .catch(done)
  })

  test('finds a user with a filter', function (done) {
    client.findUser('(sAMAccountName=username1)')
      .then((user) => {
        expect(user).to.not.be.undefined
        expect(user).to.be.an.object
        expect(user.givenName).to.equal('First')
        expect(user.sn).to.equal('Last Name #1')
        done()
      })
      .catch(done)
  })

  test('finds a user with simple name and different search base', function (done) {
    client.findUser('username1', {searchBase: 'OU=Domain Users,DC=domain,DC=com'})
      .then((user) => {
        expect(user).to.not.be.undefined
        expect(user).to.be.an.object
        expect(user.givenName).to.equal('First')
        expect(user.sn).to.equal('Last Name #1')
        done()
      })
      .catch(done)
  })

  test('finds a user using only search options', function (done) {
    client.findUser({filter: '(sAMAccountName=username1)'})
      .then((user) => {
        expect(user).to.not.be.undefined
        expect(user).to.be.an.object
        expect(user.givenName).to.equal('First')
        expect(user.sn).to.equal('Last Name #1')
        done()
      })
      .catch(done)
  })
})
