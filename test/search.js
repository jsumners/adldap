'use strict'
/* eslint-env node, mocha */

require('thunk-mocha')()
const expect = require('chai').expect
const log = require('pino')({level: 'fatal'})
const Client = require('../lib/Client')(log)
const Response = require('../lib/Response')(log)

let server = require('./mockServer')

suite('Client#search(base, options, controls)', function () {
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

  test('finds a user from default search base', function (done) {
    const options = {filter: '(sAMAccountName=username1)'}
    client.search(options)
      .then((response) => {
        expect(response).to.be.an.instanceof(Response)
        response.on('complete', () => {
          expect(response.entries.length).to.equal(1)
          expect(response.entries[0].givenName).to.equal('First')
          done()
        })
      })
      .catch(done)
  })

  test('finds a user from alternate search base', function (done) {
    const options = {filter: '(sAMAccountName=username1)'}
    client.search('OU=Domain Users,DC=domain,DC=com', options)
      .then((response) => {
        expect(response).to.be.an.instanceof(Response)
        response.on('complete', () => {
          expect(response.entries.length).to.equal(1)
          expect(response.entries[0].givenName).to.equal('First')
          done()
        })
      })
      .catch(done)
  })

  test('finds a user with alternate attributes', function (done) {
    const options = {filter: '(sAMAccountName=username1)', attributes: ['sAMAccountName']}
    client.search(options)
      .then((response) => {
        expect(response).to.be.an.instanceof(Response)
        response.on('complete', () => {
          expect(response.entries.length).to.equal(1)
          expect(response.entries[0].sAMAccountName).to.equal('username1')
          done()
        })
      })
      .catch(done)
  })
})