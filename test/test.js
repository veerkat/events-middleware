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
    MiddlewareCollection,
    EventEmitter
} = require('../index');
const noop = function() {};

process.on('unhandledRejection', function(err, p) {
    console.warn("WARNING: Unhandled promise rejection. Reason: " + err.stack);
});

describe('events-middleware', function() {
    describe('EventMiddleware', function() {
        describe('setOptions', function() {
            const options = {
                multiArgs: false,
                globalArgs: true
            };
            it('should work', function() {
                const m = new EventMiddleware('test', noop);
                m._options.multiArgs.should.not.be.eql(options.multiArgs);
                m._options.globalArgs.should.not.be.eql(options.globalArgs);
                m.setOptions(options);
                m._options.multiArgs.should.be.eql(options.multiArgs);
                m._options.globalArgs.should.be.eql(options.globalArgs);
            });

            it('should be equivalent to setting options by constructor method', function() {
                const m1 = new EventMiddleware('test', noop, options);
                const m2 = new EventMiddleware('test', noop);
                m2.setOptions(options);
                m2._options.should.be.deepEqual(m1._options);
            });
        });

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

            it('should work when globalArgs is true', function() {
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

            it('should work when multiArgs is false', function() {
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

    describe('MiddlewareCollection', function() {
        describe('setOptions', function() {
            const options = {
                multiArgs: false,
                globalArgs: true
            };
            it('should work', function() {
                const mc = new MiddlewareCollection();
                mc.setOptions(options);
                mc._options.should.be.deepEqual(options);
            });
            it('should be equivalent to setting options by constructor method', function() {
                const mc1 = new MiddlewareCollection(options);
                const mc2 = new MiddlewareCollection();
                mc2.setOptions(options);
                mc2._options.should.be.deepEqual(mc1._options);
            });
        });

        describe('new', function() {
            it('should work with default options', function() {
                const options = {
                    multiArgs: false,
                    globalArgs: true
                };
                const mc = new MiddlewareCollection(options);
                const m = mc.new('test', noop);
                m.should.be.instanceof(EventMiddleware);
                m._options.should.be.deepEqual(m._options);
                mc._middlewares.get('test').should.be.eql(m);
            });

            it('should work when setting options', function() {
                const options = {
                    multiArgs: false,
                    globalArgs: true
                };
                const mc = new MiddlewareCollection();
                const m = mc.new('test', noop, options);
                m.should.be.instanceof(EventMiddleware);
                m._options.should.be.deepEqual(options);
                mc._middlewares.get('test').should.be.eql(m);
            });

            it('should throw error when eventName has added', function(done) {
                const mc = new MiddlewareCollection();
                const m = mc.new('test', noop);
                try {
                    mc.new('test', noop);
                } catch (err) {
                    err.should.be.instanceof(Error);
                    err.message.should.be.eql('eventName test has added');
                    done();
                }
            });
        });

        describe('empty', function() {
            it('should return true if empty', function() {
                const mc = new MiddlewareCollection();
                mc.empty().should.be.True();
            });

            it('should return false if empty', function() {
                const mc = new MiddlewareCollection();
                mc.new('test', noop);
                mc.empty().should.be.False();
            });
        });

        describe('eventNames', function() {
            it('should get eventName array', function() {
                const mc = new MiddlewareCollection();
                mc.eventNames().should.be.eql([]);
                mc.new('test1', noop);
                mc.eventNames().should.be.eql(['test1']);
                mc.new('test2', noop);
                mc.eventNames().should.be.eql(['test1', 'test2']);
            });
        });

        describe('pre', function() {
            it('should work when passing single function', function() {
                const mc = new MiddlewareCollection();
                mc.new('test1', noop);
                mc.new('test2', noop);
                mc.pre(noop);
                mc._middlewares.get('test1')._pres.length.should.be.eql(1);
                mc._middlewares.get('test1')._fns.length.should.be.eql(2);
                mc._middlewares.get('test2')._pres.length.should.be.eql(1);
                mc._middlewares.get('test2')._fns.length.should.be.eql(2);
            });

            it('should work when passing function array', function() {
                const mc = new MiddlewareCollection();
                mc.new('test1', noop);
                mc.new('test2', noop);
                mc.pre([noop, noop]);
                mc._middlewares.get('test1')._pres.length.should.be.eql(2);
                mc._middlewares.get('test1')._fns.length.should.be.eql(3);
                mc._middlewares.get('test2')._pres.length.should.be.eql(2);
                mc._middlewares.get('test2')._fns.length.should.be.eql(3);
            });
        });

        describe('post', function() {
            it('should work when passing single function', function() {
                const mc = new MiddlewareCollection();
                mc.new('test1', noop);
                mc.new('test2', noop);
                mc.post(noop);
                mc._middlewares.get('test1')._posts.length.should.be.eql(1);
                mc._middlewares.get('test1')._fns.length.should.be.eql(2);
                mc._middlewares.get('test2')._posts.length.should.be.eql(1);
                mc._middlewares.get('test2')._fns.length.should.be.eql(2);
            });

            it('should work when passing function array', function() {
                const mc = new MiddlewareCollection();
                mc.new('test1', noop);
                mc.new('test2', noop);
                mc.post(noop);
                mc._middlewares.get('test1')._posts.length.should.be.eql(1);
                mc._middlewares.get('test1')._fns.length.should.be.eql(2);
                mc._middlewares.get('test2')._posts.length.should.be.eql(1);
                mc._middlewares.get('test2')._fns.length.should.be.eql(2);
            });
        });

        describe('select', function() {
            it('should return new instance when eventNames in all eventNames', function() {
                const mc = new MiddlewareCollection();
                mc.new('test1', noop);
                mc.new('test2', noop);
                const nmc = mc.select(['test1']);
                nmc.should.be.instanceof(MiddlewareCollection);
                nmc.eventNames().should.be.deepEqual(['test1']);
            });

            it('should return new instance when some eventNames in all eventNames', function() {
                const mc = new MiddlewareCollection();
                mc.new('test1', noop);
                mc.new('test2', noop);
                const nmc = mc.select(['test1', 'test3']);
                nmc.should.be.instanceof(MiddlewareCollection);
                nmc.eventNames().should.be.deepEqual(['test1']);
            });

            it('should return empty instance when eventNames not in all eventNames', function() {
                const mc = new MiddlewareCollection();
                mc.new('test1', noop);
                mc.new('test2', noop);
                const nmc = mc.select(['test3']);
                nmc.empty().should.be.True();
            });

            it('should return new instance when passing single eventName', function() {
                const mc = new MiddlewareCollection();
                mc.new('test1', noop);
                mc.new('test2', noop);
                const nmc1 = mc.select('test1');
                nmc1.should.be.instanceof(MiddlewareCollection);
                nmc1.eventNames().should.be.deepEqual(['test1']);
                const nmc2 = mc.select('test3');
                nmc2.empty().should.be.True();
            });
        });

        describe('remove', function() {
            it('', function() {});
        });

        describe('clear', function() {
            it('', function() {});
        });

        describe('has', function() {
            it('should return false if event not exists', function() {
                const mc = new MiddlewareCollection();
                mc.has('test').should.be.False();
            });

            it('should return true if event exists', function() {
                const mc = new MiddlewareCollection();
                mc.new('test', noop);
                mc.has('test').should.be.True();
            });
        });

        describe('onError', function() {
            it('should catch listener error', function(done) {
                done();
            });

            it('should catch pre function error', function(done) {
                done();
            });

            it('should catch post function error', function(done) {
                done();
            });
        });

        describe('method chaining', function() {
            it('should work', function() {
                const mc = new MiddlewareCollection();
                mc.pre(noop).should.be.eql(mc);
                mc.post(noop).should.be.eql(mc);
                mc.onError(noop).should.be.eql(mc);
                mc.setOptions({}).should.be.eql(mc);
                mc.remove().should.be.eql(mc);
                mc.clear().should.be.eql(mc);
            });
        });
    });

    describe('EventEmitter', function() {
        describe('setOptions', function() {
            const options = {
                middleware: {
                    multiArgs: false,
                    globalArgs: true
                }
            };
            it('should work', function() {
                const e = new EventEmitter();
                e.setOptions(options);
                e._options.should.be.deepEqual(options);
            });
            it('should be equivalent to setting options by constructor method', function() {
                const e1 = new EventEmitter(options);
                const e2 = new MiddlewareCollection();
                e2.setOptions(options);
                e2._options.should.be.deepEqual(e1._options);
            });
        });

        describe('middleware', function() {
        });

        describe('emit', function() {
            it('should work with default options', function(done) {
                done();
            });

            it('should work when setting globalArgs to true', function(done) {
                done();
            });

            it('should work when setting multiArgs to false', function(done) {
                done();
            });
        });
    });
});
