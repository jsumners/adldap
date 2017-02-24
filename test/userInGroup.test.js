'use strict'

const tap = require('tap')
const test = tap.test
const log = require('pino')({level: 'fatal'})
const clientFactory = require('../lib/client')(log)

let server
let client
tap.beforeEach((done) => {
  server = require('./mockServer')
  server((s, socket) => {
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
      tap.bailout('bind failed: ' + err.message)
      done()
    })
  })
})

tap.afterEach((done) => {
  try {
    client.unbind()
    server.server.close()
  } catch (e) {}
  done()
})

test('returns true for valid query', (t) => {
  t.plan(1)
  client.userInGroup('username1', 'budget users')
    .then((result) => {
      t.is(result, true)
    })
    .catch((err) => t.threw(err))
})

test('returns false for invalid query', (t) => {
  t.plan(1)
  client.userInGroup('username1', 'administrators')
    .then((result) => {
      t.is(result, false)
    })
    .catch((err) => t.threw(err))
})
