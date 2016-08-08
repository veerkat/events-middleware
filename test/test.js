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
            it('should work with only main function and default options', function() {
                const m1 = new EventMiddleware('test', function(value, next) {
                    next(null, value + 1);
                });
                const m2 = new EventMiddleware('test', function(value) {
                    return Promise.resolve(value + 1);
                });
                return Promise.all([
                    m1.call(1)
                    .then(value => {
                        value.should.be.eql(2);
                    }),
                    m2.call(1)
                    .then(value => {
                        value.should.be.eql(2);
                    })
                ]);
            });

            it('should work with pre, main and post functions and default options by next callback', function() {
                const m = new EventMiddleware('test', function(value, next) {
                    next(null, value + 1);
                });
                m.pre(function(value, next) {
                    next(null, value + 1);
                });
                m.post(function(value, next) {
                    next(null, value + 1);
                });
                return m.call(1).then(value => {
                    value.should.be.eql(4);
                });
            });

            it('should work with pre, main and post functions and default options by promise', function() {
                const m = new EventMiddleware('test', function(value) {
                    return Promise.resolve(value + 1);
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

            it('should pass multiple value with default options when using next callback', function() {
                const m = new EventMiddleware('test', function(value1, value2, next) {
                    next(null, value1 + 1, value2 + 1);
                });
                m.post(function(value1, value2, next) {
                    next(null, value1 + 1, value2 + 1);
                });
                return m.call(1, 2).then(value => {
                    value.should.be.eql([3, 4]);
                });
            });

            it('should work with globalArgs is true', function() {
                const m = new EventMiddleware('test', function(g, next) {
                    next(null, g.value + 1);
                }, {
                    globalArgs: true,
                });
                m.pre(function(g) {
                    g.value = g.value + 1;
                    return Promise.resolve();
                });
                m.post(function(g) {
                    g.value = g.value + 1;
                    return Promise.resolve();
                });
                const g = {
                    value: 1
                };
                return m.call(g).then(_g => {
                    _g.should.be.deepEqual(g);
                });
            });

            it('should work with multiArgs is false', function() {
                const m = new EventMiddleware('test', function(value, next) {
                    next(null, value + 1);
                }, {
                    multiArgs: false
                });
                m.pre(function(value, next) {
                    return next(null, value + 1, 2, 3);
                });
                m.post(function(value, next) {
                    return next(null, value + 1, 2, 3);
                });
                return m.call(1, 2, 3).then(value => {
                    value.should.be.eql(4);
                });
            });

            it('should catch error from pre function', function() {
                const m1 = new EventMiddleware('test', noop);
                m1.pre(function() {
                    throw new Error('error');
                });

                const m2 = new EventMiddleware('test', noop);
                m2.pre(function(next) {
                    next(new Error('error'));
                });

                const m3 = new EventMiddleware('test', noop);
                m3.pre(function() {
                    return Promise.reject(new Error('error'));
                });

                return Promise.all([
                    m1.call().catch(err => {
                        err.should.be.Error();
                        err.message.should.be.eql('error');
                    }),
                    m2.call().catch(err => {
                        err.should.be.Error();
                        err.message.should.be.eql('error');
                    }),
                    m3.call().catch(err => {
                        err.should.be.Error();
                        err.message.should.be.eql('error');
                    })
                ]);
            });

            it('should catch error from post function', function() {
                const m1 = new EventMiddleware('test', next => next());
                m1.post(function() {
                    throw new Error('error');
                });

                const m2 = new EventMiddleware('test', next => next());
                m2.post(function(next) {
                    next(new Error('error'));
                });

                const m3 = new EventMiddleware('test', next => next());
                m3.post(function() {
                    return Promise.reject(new Error('error'));
                });

                return Promise.all([
                    m1.call().catch(err => {
                        err.should.be.Error();
                        err.message.should.be.eql('error');
                    }),
                    m2.call().catch(err => {
                        err.should.be.Error();
                        err.message.should.be.eql('error');
                    }),
                    m3.call().catch(err => {
                        err.should.be.Error();
                        err.message.should.be.eql('error');
                    })
                ]);
            });

            it('should catch error from main function', function() {
                const m1 = new EventMiddleware('test', next => {
                    throw new Error('error');
                });

                const m2 = new EventMiddleware('test', next => {
                    next(new Error('error'));
                });

                const m3 = new EventMiddleware('test', next => {
                    return Promise.reject(new Error('error'));
                });

                return Promise.all([
                    m1.call().catch(err => {
                        err.should.be.Error();
                        err.message.should.be.eql('error');
                    }),
                    m2.call().catch(err => {
                        err.should.be.Error();
                        err.message.should.be.eql('error');
                    }),
                    m3.call().catch(err => {
                        err.should.be.Error();
                        err.message.should.be.eql('error');
                    })
                ]);
            });
        });

        describe('catch', function() {
            it('should catch main function error', function(done) {
                const m1 = new EventMiddleware('test', next => {
                    throw new Error('error');
                });

                const m2 = new EventMiddleware('test', next => {
                    next(new Error('error'));
                });

                const m3 = new EventMiddleware('test', next => {
                    return Promise.reject(new Error('error'));
                });

                m3.catch(err => {
                    try {
                        err.should.be.Error();
                        err.message.should.be.eql('error');
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
                m2.catch(err => {
                    try {
                        err.should.be.Error();
                        err.message.should.be.eql('error');
                        m3.call();
                    } catch (e) {
                        done(e);
                    }
                });
                m1.catch(err => {
                    try {
                        err.should.be.Error();
                        err.message.should.be.eql('error');
                        m2.call();
                    } catch (e) {
                        done(e);
                    }
                });
                m1.call();
            });

            it('should catch pre function error', function(done) {
                const m1 = new EventMiddleware('test', noop);
                m1.pre(() => {
                    throw new Error('error');
                });

                const m2 = new EventMiddleware('test', noop);
                m2.pre(next => {
                    next(new Error('error'));
                });

                const m3 = new EventMiddleware('test', noop);
                m3.pre(() => {
                    return Promise.reject(new Error('error'));
                });

                m3.catch(err => {
                    try {
                        err.should.be.Error();
                        err.message.should.be.eql('error');
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
                m2.catch(err => {
                    try {
                        err.should.be.Error();
                        err.message.should.be.eql('error');
                        m3.call();
                    } catch (e) {
                        done(e);
                    }
                });
                m1.catch(err => {
                    try {
                        err.should.be.Error();
                        err.message.should.be.eql('error');
                        m2.call();
                    } catch (e) {
                        done(e);
                    }
                });
                m1.call();
            });

            it('should catch post function error', function(done) {
                const m1 = new EventMiddleware('test', next => next());
                m1.post(() => {
                    throw new Error('error');
                });

                const m2 = new EventMiddleware('test', next => next());
                m2.post(next => {
                    next(new Error('error'));
                });

                const m3 = new EventMiddleware('test', next => next());
                m3.post(() => {
                    return Promise.reject(new Error('error'));
                });

                m3.catch(err => {
                    try {
                        err.should.be.Error();
                        err.message.should.be.eql('error');
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
                m2.catch(err => {
                    try {
                        err.should.be.Error();
                        err.message.should.be.eql('error');
                        m3.call();
                    } catch (e) {
                        done(e);
                    }
                });
                m1.catch(err => {
                    try {
                        err.should.be.Error();
                        err.message.should.be.eql('error');
                        m2.call();
                    } catch (e) {
                        done(e);
                    }
                });
                m1.call();
            });
        });

        describe('setOptions', function() {
            it('should work', function() {
                const m = new EventMiddleware('test', noop);
                const options = {
                    multiArgs: false,
                    globalArgs: true
                };
                m._options.multiArgs.should.not.be.eql(options.multiArgs);
                m._options.globalArgs.should.not.be.eql(options.globalArgs);
                m.setOptions(options);
                m._options.multiArgs.should.be.eql(options.multiArgs);
                m._options.globalArgs.should.be.eql(options.globalArgs);
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
            it('should work', function() {
                const e = new EventEmitter();
                e.on('test', noop);
                e._middlewares.get('test').should.be.instanceof(EventMiddleware);
                e.eventNames().includes('test').should.be.True();
            });

            it('throw error if eventName has added', function(done) {
                const e = new EventEmitter();
                e.on('test', noop);
                try {
                    e.on('test', noop);
                } catch (err) {
                    err.should.be.Error();
                    err.message.should.be.eql('eventName test has added');
                    done();
                }
            });
        });

        describe('has', function() {
            it('should return false if event not exists', function() {
                const e = new EventEmitter();
                e.has('test').should.be.False();
            });

            it('should return true if event exists', function() {
                const e = new EventEmitter();
                e.on('test', noop);
                e.has('test').should.be.True();
            });
        });

        describe('pre', function() {
            it('should work when passing single eventName and single fn', function() {
                const e = new EventEmitter();
                e.on('test', noop);
                e.pre('test', noop);
                const m = e._middlewares.get('test');
                m._fns.length.should.be.eql(2);
            });

            it('should work when passing single eventName and fn array', function() {
                const e = new EventEmitter();
                e.on('test', noop);
                e.pre('test', [noop, noop]);
                const m = e._middlewares.get('test');
                m._fns.length.should.be.eql(3);
            });

            it('should work when passing eventName array and single fn', function() {
                const e = new EventEmitter();
                e.on('test1', noop);
                e.on('test2', noop);
                e.pre(['test1', 'test2'], noop);
                const m1 = e._middlewares.get('test1');
                const m2 = e._middlewares.get('test2');
                m1._fns.length.should.be.eql(2);
                m2._fns.length.should.be.eql(2);
            });

            it('should work when passing eventName array and fn array', function() {
                const e = new EventEmitter();
                e.on('test1', noop);
                e.on('test2', noop);
                e.pre(['test1', 'test2'], [noop, noop]);
                const m1 = e._middlewares.get('test1');
                const m2 = e._middlewares.get('test2');
                m1._fns.length.should.be.eql(3);
                m2._fns.length.should.be.eql(3);
            });

            it('throw error when eventName not found', function(done) {
                const e = new EventEmitter();
                try {
                    e.pre('test', noop);
                } catch (err) {
                    err.should.be.instanceof(Error);
                    err.message.should.be.eql('eventName test not found');
                    done();
                }
            });
        });

        describe('post', function() {
            it('should work when passing single eventName and single fn', function() {
                const e = new EventEmitter();
                e.on('test', noop);
                e.post('test', noop);
                const m = e._middlewares.get('test');
                m._fns.length.should.be.eql(2);
            });

            it('should work when passing single eventName and fn array', function() {
                const e = new EventEmitter();
                e.on('test', noop);
                e.post('test', [noop, noop]);
                const m = e._middlewares.get('test');
                m._fns.length.should.be.eql(3);
            });

            it('should work when passing eventName array and single fn', function() {
                const e = new EventEmitter();
                e.on('test1', noop);
                e.on('test2', noop);
                e.post(['test1', 'test2'], noop);
                const m1 = e._middlewares.get('test1');
                const m2 = e._middlewares.get('test2');
                m1._fns.length.should.be.eql(2);
                m2._fns.length.should.be.eql(2);
            });

            it('should work when passing eventName array and fn array', function() {
                const e = new EventEmitter();
                e.on('test1', noop);
                e.on('test2', noop);
                e.post(['test1', 'test2'], [noop, noop]);
                const m1 = e._middlewares.get('test1');
                const m2 = e._middlewares.get('test2');
                m1._fns.length.should.be.eql(3);
                m2._fns.length.should.be.eql(3);
            });

            it('throw error when eventName not found', function(done) {
                const e = new EventEmitter();
                try {
                    e.post('test', noop);
                } catch (err) {
                    err.should.be.instanceof(Error);
                    err.message.should.be.eql('eventName test not found');
                    done();
                }
            });
        });

        describe('preEach', function() {
            it('should work when passing single fn', function() {
                const e = new EventEmitter();
                e.on('test1', noop);
                e.on('test2', noop);
                e.preEach(noop);
                const m1 = e._middlewares.get('test1');
                const m2 = e._middlewares.get('test2');
                m1._fns.length.should.be.eql(2);
                m2._fns.length.should.be.eql(2);
            });

            it('should work when passing fn array', function() {
                const e = new EventEmitter();
                e.on('test1', noop);
                e.on('test2', noop);
                e.preEach([noop, noop]);
                const m1 = e._middlewares.get('test1');
                const m2 = e._middlewares.get('test2');
                m1._fns.length.should.be.eql(3);
                m2._fns.length.should.be.eql(3);
            });
        });

        describe('postEach', function() {
            it('should work when passing single fn', function() {
                const e = new EventEmitter();
                e.on('test1', noop);
                e.on('test2', noop);
                e.postEach(noop);
                const m1 = e._middlewares.get('test1');
                const m2 = e._middlewares.get('test2');
                m1._fns.length.should.be.eql(2);
                m2._fns.length.should.be.eql(2);
            });

            it('should work when passing fn array', function() {
                const e = new EventEmitter();
                e.on('test1', noop);
                e.on('test2', noop);
                e.postEach([noop, noop]);
                const m1 = e._middlewares.get('test1');
                const m2 = e._middlewares.get('test2');
                m1._fns.length.should.be.eql(3);
                m2._fns.length.should.be.eql(3);
            });
        });

        describe('emit', function() {
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
