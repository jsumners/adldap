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

test('finds a user from default search base', (t) => {
  t.plan(3)
  const options = {filter: '(sAMAccountName=username1)'}
  client.search(options)
    .then((results) => {
      t.type(results, Array)
      t.is(results.length, 1)
      t.is(results[0].givenName, 'First')
    })
    .catch((err) => t.threw(err))
})

test('finds a user from alternate search base', (t) => {
  t.plan(3)
  const options = {filter: '(sAMAccountName=username1)'}
  client.search('OU=Domain Users,DC=domain,DC=com', options)
    .then((results) => {
      t.type(results, Array)
      t.is(results.length, 1)
      t.is(results[0].givenName, 'First')
    })
    .catch((err) => t.threw(err))
})

test('finds a user with alternate attributes', (t) => {
  t.plan(3)
  const options = {filter: '(sAMAccountName=username1)', attributes: ['sAMAccountName']}
  client.search(options)
    .then((results) => {
      t.type(results, Array)
      t.is(results.length, 1)
      t.is(results[0].sAMAccountName, 'username1')
    })
    .catch((err) => t.threw(err))
})
