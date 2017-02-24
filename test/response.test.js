'use strict'

const events = require('events')
const tap = require('tap')
const test = tap.test
const log = require('pino')({level: 'fatal'})
const responseFactory = require('../lib/response')(log)

let emitter
tap.beforeEach((done) => {
  emitter = new events.EventEmitter()
  done()
})

test('adds to .entries', (t) => {
  t.plan(2)
  const response = responseFactory(emitter)
  emitter.emit('searchEntry', {object: {foo: 'bar'}})
  t.is(response.entries.length, 1)
  t.strictSame(response.entries[0], {foo: 'bar'})
})

test('adds to .referrals', (t) => {
  t.plan(2)
  const response = responseFactory(emitter)
  emitter.emit('searchReference', {uris: ['ldap://example.com/']})
  t.is(response.referrals.length, 1)
  t.is(response.referrals[0], 'ldap://example.com/')
})

test('returns a connection error', (t) => {
  t.plan(2)
  const response = responseFactory(emitter)
  response.on('tcperror', (error) => {
    t.type(error, Error)
    t.is(error.message, 'foo')
  })
  emitter.emit('error', new Error('foo'))
})

test('passes along ldap errors', (t) => {
  t.plan(2)
  const response = responseFactory(emitter)
  response.on('ldaperror', (error) => {
    t.type(error, Error)
    t.is(error.message, 'LDAP_OPERATIONS_ERROR')
  })
  emitter.emit('end', {status: 1})
})

test('issues complete event on no errors', (t) => {
  t.plan(2)
  const response = responseFactory(emitter)
  response.on('complete', () => {
    t.is(response.entries.length, 1)
    t.strictSame(response.entries[0], {foo: 'bar'})
  })
  emitter.emit('searchEntry', {object: {foo: 'bar'}})
  emitter.emit('end', {status: 0})
})
