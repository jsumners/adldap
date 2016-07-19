'use strict'
/* eslint-env node, mocha */

const events = require('events')
const expect = require('chai').expect
const log = require('pino')({level: 'fatal'})
const Response = require('../lib/Response')(log)

suite('Response', function ()  {
  let emitter
  setup(function (done) {
    emitter = new events.EventEmitter()
    done()
  })

  test('#entryReceived adds to .entries', function (done) {
    const response = new Response(emitter)
    emitter.emit('searchEntry', {object: {foo: 'bar'}})
    expect(response.entries.length).to.equal(1)
    expect(response.entries[0]).to.deep.equal({foo: 'bar'})
    done()
  })

  test('#referralReceived adds to .referrals', function (done) {
    const response = new Response(emitter)
    emitter.emit('searchReference', {uris: ['ldap://example.com/']})
    expect(response.referrals.length).to.equal(1)
    expect(response.referrals[0]).to.equal('ldap://example.com/')
    done()
  })

  test('#errorReceived returns a connection error', function (done) {
    const response = new Response(emitter)
    response.on('tcperror', function (error) {
      expect(error).to.be.instanceof(Error)
      expect(error.message).to.equal('foo')
      done()
    })
    emitter.emit('error', new Error('foo'))
  })

  suite('#recievedEnd', function () {
    test('passes along ldap errors', function (done) {
      const response = new Response(emitter)
      response.on('ldaperror', function (error) {
        expect(error).to.be.instanceof(Error)
        expect(error.message).to.equal('LDAP_OPERATIONS_ERROR')
        done()
      })
      emitter.emit('end', { status: 1 })
    })

    test('issues complete event on no errors', function (done) {
      const response = new Response(emitter)
      response.on('complete', function () {
        expect(response.entries.length).to.equal(1)
        expect(response.entries[0]).to.deep.equal({foo: 'bar'})
        done()
      })
      emitter.emit('searchEntry', {object: {foo: 'bar'}})
      emitter.emit('end', {status: 0})
    })
  })
})
