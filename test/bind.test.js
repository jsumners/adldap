'use strict'

const test = require('tap').test
const log = require('pino')({level: 'fatal'})
const clientFactory = require('../lib/client')(log)

const options = {
  searchUser: 'auth@domain.com',
  searchUserPass: 'password',
  ldapjs: {
    searchBase: 'dc=domain,dc=com'
  }
}

test('succeeds with valid credentials', (t) => {
  t.plan(1)
  const server = require('./mockServer')
  server((s, socket) => {
    const localOptions = Object.assign({}, options)
    localOptions.ldapjs.socketPath = socket
    const client = clientFactory(localOptions)
    client.bind()
      .then((result) => {
        t.is(result, undefined)
        client.unbind()
        s.server.close()
      })
      .catch((err) => t.threw(err))
  })
})

test('fails with invalid credentials', (t) => {
  t.plan(2)
  const server = require('./mockServer')
  server((s, socket) => {
    const localOptions = Object.assign({}, options, {searchUser: 'isbad'})
    localOptions.ldapjs.socketPath = socket
    const client = clientFactory(localOptions)
    client.bind()
      .then(() => t.fail('should not happen'))
      .catch((err) => {
        t.type(err, Error)
        t.is(err.message, 'No tree found for: isbad')
        client.unbind()
        s.server.close()
      })
  })
})
