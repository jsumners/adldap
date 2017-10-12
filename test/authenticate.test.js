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

test('validates simple username and password', (t) => {
  t.plan(1)
  client.authenticate('username', 'password')
    .then((result) => {
      t.is(result, true)
    })
    .catch((err) => t.threw(err))
})

test('returns false for invalid credentials', (t) => {
  t.plan(1)
  client.authenticate('username', 'invalid')
    .then((result) => {
      t.is(result, false)
    })
    .catch((err) => t.threw(err))
})

test('validates username@domain and password', (t) => {
  t.plan(1)
  client.authenticate('username@domain.com', 'password')
    .then((result) => {
      t.is(result, true)
    })
    .catch((err) => t.threw(err))
})

test('validates domain\\username and password', (t) => {
  t.plan(1)
  client.authenticate('domain\\username', 'password')
    .then((result) => {
      t.is(result, true)
    })
    .catch((err) => t.threw(err))
})

test('validates FQDN username and password', (t) => {
  t.plan(1)
  client.authenticate('CN=First Last Name,OU=Domain Users,DC=domain,DC=com', 'password')
    .then((result) => {
      t.is(result, true)
    })
    .catch((err) => t.threw(err))
})

test('validates filter username and password', (t) => {
  t.plan(1)
  client.authenticate('(samaccountname=username)', 'password')
    .then((result) => {
      t.is(result, true)
    })
    .catch((err) => t.threw(err))
})

test('validates usernames that start with cn', (t) => {
  t.plan(1)
  client.authenticate('cname12', 'password')
    .then((result) => {
      t.is(result, true)
    })
    .catch((err) => t.threw(err))
})
