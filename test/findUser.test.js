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

test('finds a user with simple name', (t) => {
  t.plan(4)
  client.findUser('username1')
    .then((user) => {
      t.ok(user)
      t.type(user, Object)
      t.is(user.givenName, 'First')
      t.is(user.sn, 'Last Name #1')
    })
    .catch((err) => t.threw(err))
})

test('finds a user with a filter', (t) => {
  t.plan(4)
  client.findUser('(sAMAccountName=username1)')
    .then((user) => {
      t.ok(user)
      t.type(user, Object)
      t.is(user.givenName, 'First')
      t.is(user.sn, 'Last Name #1')
    })
    .catch((err) => t.threw(err))
})

test('finds a user with simple name and different search base', (t) => {
  t.plan(4)
  client.findUser('username1', {searchBase: 'OU=Domain Users,DC=domain,DC=com'})
    .then((user) => {
      t.ok(user)
      t.type(user, Object)
      t.is(user.givenName, 'First')
      t.is(user.sn, 'Last Name #1')
    })
    .catch((err) => t.threw(err))
})

test('finds a user using only search options', (t) => {
  t.plan(4)
  client.findUser({filter: '(sAMAccountName=username1)'})
    .then((user) => {
      t.ok(user)
      t.type(user, Object)
      t.is(user.givenName, 'First')
      t.is(user.sn, 'Last Name #1')
    })
    .catch((err) => t.threw(err))
})
