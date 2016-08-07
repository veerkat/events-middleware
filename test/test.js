/*global define: false,
 describe: false,
 assert: false,
 it: false,
 beforeEach: false,
 before: false,
 after: false*/

'use strict';

const should = require('should');
const {
    EventMiddleware,
    EventEmitter
} = require('../index');
const noop = function() {};

describe('events-middleware', function() {
    describe('EventMiddleware', function() {
        describe('pre', function() {
            it('should work when passing single pre function', function() {
                const m = new EventMiddleware('test', noop);
                const prefn = function() {};
                m.pre(prefn);
                m._fns.length.should.be.eql(2);
                m._fns.forEach(fn => fn.should.be.Function());
            });

            it('should work when passing pre function array', function() {
                const m = new EventMiddleware('test', noop);
                const prefn = function() {};
                m.pre([prefn, prefn, prefn]);
                m._fns.length.should.be.eql(4);
                m._fns.forEach(fn => fn.should.be.Function());
            });
        });

        describe('post', function() {
            it('should work when passing single post function', function() {
                const m = new EventMiddleware('test', noop);
                const postfn = function() {};
                m.post(postfn);
                m._fns.length.should.be.eql(2);
                m._fns.forEach(fn => fn.should.be.Function());
            });

            it('should work when passing post function array', function() {
                const m = new EventMiddleware('test', noop);
                const postfn = function() {};
                m.post([postfn, postfn, postfn]);
                m._fns.length.should.be.eql(4);
                m._fns.forEach(fn => fn.should.be.Function());
            });
        });

        describe('call', function() {
            it('should work with only main function', function() {
                const m1 = new EventMiddleware('test', function(value, next) {
                    next(null, value + 1);
                });
                return m1.call(1)
                    .then(value => {
                        value.should.be.eql(2);
                        const m2 = new EventMiddleware('test', function(value) {
                            return Promise.resolve(value + 1);
                        });
                        return m2.call(1, 2);
                    })
                    .then(value => {
                        value.should.be.eql(2);
                    });
            });

            it('should work with pre and main functions', function() {
                const m = new EventMiddleware('test', function(value, next) {
                    next(null, value + 1);
                });
                m.pre(function(value) {
                    return Promise.resolve(value + 1);
                });
                return m.call(1).then(value => {
                    value.should.be.eql(3);
                });
            });

            it('should work with main and post funcions', function() {
                const m = new EventMiddleware('test', function(value, next) {
                    next(null, value + 1);
                });
                m.post(function(value) {
                    return Promise.resolve(value + 1);
                });
                return m.call(1).then(value => {
                    value.should.be.eql(3);
                });
            });

            it('should work with pre, main and post functions', function() {
                const m = new EventMiddleware('test', function(value, next) {
                    next(null, value + 1);
                });
                m.pre(function(value) {
                    return Promise.resolve(value + 1);
                });
                m.post(function(value) {
                    return Promise.resolve(value + 1);
                });
                return m.call(1).then(value => {
                    value.should.be.eql(4);
                });
            });

            it('should pass multiple value to next function ' +
               'when calling next callback with multiple value', function() {
                const m = new EventMiddleware('test', function(value1, value2, next) {
                    next(null, value1 + 1, value2 + 1);
                });
                m.post(function(value1, value2, next) {
                    return next(null, value1 + 1, value2 + 1);
                });
                return m.call(1, 2).then(value => {
                    value.should.be.eql([3, 4]);
                });
            });

            it('should catch error when pre function throw error', function() {
                const m = new EventMiddleware('test', noop);
                m.pre(function() {
                    throw new Error('error');
                });
                return m.call().catch(err => {
                    err.should.be.Error();
                    err.message.should.be.eql('error');
                });
            });

            it('should catch error when pre function return error by next callback', function() {
                const m = new EventMiddleware('test', noop);
                m.pre(function(next) {
                    next(new Error('error'));
                });
                return m.call().catch(err => {
                    err.should.be.Error();
                    err.message.should.be.eql('error');
                });
            });

            it('should catch error when pre function return error by promise', function() {
                const m = new EventMiddleware('test', noop);
                m.pre(function() {
                    return Promise.reject(new Error('error'));
                });
                return m.call().catch(err => {
                    err.should.be.Error();
                    err.message.should.be.eql('error');
                });
            });

            it('should catch error when post function throw error', function() {
                const m = new EventMiddleware('test', function (next) {
                    next();
                });
                m.post(function() {
                    throw new Error('error');
                });
                return m.call().catch(err => {
                    err.should.be.Error();
                    err.message.should.be.eql('error');
                });
            });
            it('should catch error when post function return error by next callback', function() {
                const m = new EventMiddleware('test', next => next());
                m.post(function(next) {
                    next(new Error('error'));
                });
                return m.call().catch(err => {
                    err.should.be.Error();
                    err.message.should.be.eql('error');
                });
            });

            it('should catch error when post function return error by promise', function() {
                const m = new EventMiddleware('test', next => next());
                m.post(function() {
                    return Promise.reject(new Error('error'));
                });
                return m.call().catch(err => {
                    err.should.be.Error();
                    err.message.should.be.eql('error');
                });
            });

            it('should catch error when main function throw error', function() {
                const m = new EventMiddleware('test', next => {
                    throw new Error('error');
                });
                return m.call().catch(err => {
                    err.should.be.Error();
                    err.message.should.be.eql('error');
                });
            });

            it('should catch error when main function return error by next callback', function() {
                const m = new EventMiddleware('test', next => {
                    next(new Error('error'));
                });
                return m.call().catch(err => {
                    err.should.be.Error();
                    err.message.should.be.eql('error');
                });
            });

            it('should catch error when main function return error by promise', function() {
                const m = new EventMiddleware('test', next => {
                    return Promise.reject(new Error('error'));
                });
                return m.call().catch(err => {
                    err.should.be.Error();
                    err.message.should.be.eql('error');
                });
            });
        });

        describe('catch', function() {
            it('should catch main function error', function() {
            });

            it('should catch pre function error', function() {

            });

            it('should catch post function error', function() {

            });
        });

        describe('method chaining', function() {
            it('should work', function() {
                const m = new EventMiddleware('test', noop);
                m.pre(noop).should.be.eql(m);
                m.post(noop).should.be.eql(m);
                m.catch(noop).should.be.eql(m);
                m.setOptions({}).should.be.eql(m);
            });
        });
    });

    describe('EventEmitter', function() {
        describe('on', function() {
            it('', function() {});
        });

        describe('pre', function() {
            it('', function() {});
        });

        describe('post', function() {
            it('', function() {});
        });

        describe('preEach', function() {
            it('', function() {});
        });

        describe('postEach', function() {
            it('', function() {});
        });

        describe('onError', function() {
            it('', function() {});
        });

        describe('method chaining', function() {
            it('should work', function() {
                const e = new EventEmitter();
                e.on('test', noop).should.be.eql(e);
                e.pre('test', noop).should.be.eql(e);
                e.post('test', noop).should.be.eql(e);
                e.preEach(noop).should.be.eql(e);
                e.postEach(noop).should.be.eql(e);
                e.onError(noop).should.be.eql(e);
            });
        });
    });
});
