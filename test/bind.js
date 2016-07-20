'use strict'
/* eslint-env node, mocha */

const expect = require('chai').expect
const log = require('pino')({level: 'fatal'})
const Client = require('../lib/Client')(log)

const options = {
  searchUser: 'auth@domain.com',
  searchUserPass: 'password',
  ldapjs: {
    searchBase: 'dc=domain,dc=com'
  }
}

suite('Client#bind()', function () {
  test('succeeds with valid credentials', function (done) {
    const server = require('./mockServer')
    server(function (s, socket) {
      const localOptions = Object.assign({}, options)
      localOptions.ldapjs.socketPath = socket
      const client = new Client(localOptions)
      client.bind().then((result) => {
        expect(result).to.be.undefined
        client.unbind()
        s.server.close()
        done()
      })
    })
  })

  test('fails with invalid credentials', function (done) {
    const server = require('./mockServer')
    server(function (s, socket) {
      const localOptions = Object.assign(options, {searchUser: 'isbad'})
      localOptions.ldapjs.socketPath = socket
      const client = new Client(localOptions)
      client.bind()
        .catch((result) => {
          expect(result).to.be.instanceof(Error)
          expect(result.message).to.equal('No tree found for: isbad')
          client.unbind()
          s.server.close()
          done()
        })
    })
  })
})
