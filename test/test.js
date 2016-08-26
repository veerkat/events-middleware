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
                m1.done(value => {
                    value.should.be.eql(2);
                });
                const m2 = new EventMiddleware('test', function(value) {
                    return Promise.resolve(value + 1);
                });
                m2.done(value => {
                    value.should.be.eql(2);
                });
                return Promise.all([
                    m1.call(1),
                    m2.call(1)
                ]);
            });

            it('should work with pre, main and post functions and default options by next callback', function() {
                const m = new EventMiddleware('test', function(value, next) {
                    next(null, value + 1);
                });
                m.done(value => {
                    value.should.be.eql(4);
                });

                m.pre(function(value, next) {
                    next(null, value + 1);
                });
                m.post(function(value, next) {
                    next(null, value + 1);
                });
                return m.call(1);
            });

            it('should work with pre, main and post functions and default options by promise', function() {
                const m = new EventMiddleware('test', function(value) {
                    return Promise.resolve(value + 1);
                });
                m.done(value => {
                    value.should.be.eql(4);
                });

                m.pre(function(value) {
                    return Promise.resolve(value + 1);
                });
                m.post(function(value) {
                    return Promise.resolve(value + 1);
                });
                return m.call(1);
            });

            it('should pass multiple value with default options when using next callback', function() {
                const m = new EventMiddleware('test', function(value1, value2, next) {
                    next(null, value1 + 1, value2 + 1);
                });
                m.done(value => {
                    value.should.be.eql([3, 4]);
                });
                m.post(function(value1, value2, next) {
                    next(null, value1 + 1, value2 + 1);
                });
                return m.call(1, 2);

            });

            it('should work when globalArgs is true', function() {
                const m = new EventMiddleware('test', function(g, next) {
                    next(null, g.value + 1);
                }, {
                    globalArgs: true,
                });
                m.done(_g => {
                    _g.should.be.deepEqual(g);
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
                return m.call(g);
            });

            it('should work when multiArgs is false', function() {
                const m = new EventMiddleware('test', function(value, next) {
                    next(null, value + 1);
                }, {
                    multiArgs: false
                });
                m.done(value => {
                    value.should.be.eql(4);
                });
                m.pre(function(value, next) {
                    return next(null, value + 1, 2, 3);
                });
                m.post(function(value, next) {
                    return next(null, value + 1, 2, 3);
                });
                return m.call(1, 2, 3);
            });

            it('should work when postMiddleware is false', function() {
                const m = new EventMiddleware('test', function(value, next) {
                    next(null, value + 1);
                }, {
                    postMiddleware: false
                });
                m.done(value => {
                    value.should.be.eql(2);
                });

                m.pre(function(value, next) {
                    return next(null, value + 1);
                });
                m.post(function(value, next) {
                    return next(null, value + 1);
                });
                return m.call(0);
            });

            it('should work when onlyPromise is true', function() {
                const m = new EventMiddleware('test', function(value, next) {
                    should(next).be.undefined();
                    return Promise.resolve(value + 1);
                }, {
                    onlyPromise: true
                });
                m.done(value => {
                    value.should.be.eql(3);
                });

                m.pre(function(value, next) {
                    should(next).be.undefined();
                    return Promise.resolve(value + 1);
                });
                m.post(function(value, next) {
                    should(next).be.undefined();
                    return Promise.resolve(value + 1);
                });
                return m.call(0);
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
            it('should set _onError callback', function() {
                const m = new EventMiddleware('test', noop);
                const callback = function() {};
                m.catch(callback);
                m._onError.should.be.equal(callback);
            });

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
                m.pre(noop).should.be.equal(m);
                m.post(noop).should.be.equal(m);
                m.catch(noop).should.be.equal(m);
                m.setOptions({}).should.be.equal(m);
            });
        });
    });

    describe('MiddlewareCollection', function() {
        describe('setOptions', function() {
            const options = {
                multiArgs: false,
                globalArgs: true,
                postMiddleware: false,
                onlyPromise: false
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
                    globalArgs: true,
                    postMiddleware: false,
                    onlyPromise: false
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
                    globalArgs: true,
                    postMiddleware: false,
                    onlyPromise: false
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
                mc._middlewares.size.should.be.eql(0);
                mc.empty().should.be.True();
            });

            it('should return false if empty', function() {
                const mc = new MiddlewareCollection();
                mc.new('test', noop);
                mc._middlewares.size.should.not.be.eql(0);
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
            it('should remove eventNames', function() {
                const mc = new MiddlewareCollection();
                mc.new('test1', noop);
                mc.new('test2', noop);
                mc.remove('test2');
                mc.eventNames().should.be.deepEqual(['test1']);
                mc.remove(['test1']);
                mc.empty().should.be.True();
            });

            it('should remove eventNames by sub collection', function() {
                const mc = new MiddlewareCollection();
                mc.new('test1', noop);
                mc.new('test2', noop);
                const sub = mc.select(['test1', 'test2']);
                sub.remove('test2');
                mc.eventNames().should.be.deepEqual(['test1']);
                sub.remove(['test1']);
                mc.empty().should.be.True();
            });
        });

        describe('clear', function() {
            it('should clear by sub collection', function() {
                const mc = new MiddlewareCollection();
                mc.new('test1', noop);
                mc.new('test2', noop);
                const sub = mc.select('test2');
                sub.clear();
                sub.empty().should.be.True();
                mc.eventNames().should.be.deepEqual(['test1']);
            });

            it('should clear all', function() {
                const mc = new MiddlewareCollection();
                mc.new('test1', noop);
                mc.new('test2', noop);
                mc.clear();
                mc.empty().should.be.True();
            });
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
            it('should bind onError callable by sub collection', function() {
                const mc = new MiddlewareCollection();
                const callback = function() {};
                const m1 = mc.new('test1', noop);
                const m2 = mc.new('test2', noop);
                const m3 = mc.new('test3', noop);
                mc.select(['test1', 'test2']).onError(callback);
                m1._onError.should.be.equal(callback);
                m2._onError.should.be.equal(callback);
                m3._onError.should.not.be.equal(callback);
            });

            it('should bind onError callable for all middlewares', function() {
                const mc = new MiddlewareCollection();
                const callback = function() {};
                const m1 = mc.new('test1', noop);
                const m2 = mc.new('test2', noop);
                mc.onError(callback);
                m1._onError.should.be.equal(callback);
                m2._onError.should.be.equal(callback);
            });
        });

        describe('method chaining', function() {
            it('should work', function() {
                const mc = new MiddlewareCollection();
                mc.pre(noop).should.be.equal(mc);
                mc.post(noop).should.be.equal(mc);
                mc.onError(noop).should.be.equal(mc);
                mc.setOptions({}).should.be.equal(mc);
                mc.remove().should.be.equal(mc);
                mc.clear().should.be.equal(mc);
            });
        });
    });

    describe('EventEmitter', function() {
        describe('setOptions', function() {
            const middlewareOptions = {
                multiArgs: false,
                globalArgs: true
            };
            const options = {
                middleware: middlewareOptions
            };
            it('should work', function() {
                const e = new EventEmitter();
                e.setOptions(options);
                e._options.should.be.deepEqual(options);
                e._middlewares._options.should.be.deepEqual(middlewareOptions);
            });

            it('should be equivalent to setting options by constructor method', function() {
                const e1 = new EventEmitter(options);
                const e2 = new EventEmitter();
                e2.setOptions(options);
                e2._options.should.be.deepEqual(e1._options);
                e2._middlewares._options.should.be.deepEqual(e1._middlewares._options);
            });
        });

        describe('middleware', function() {
            it('should new middleware and return sub middleware collection ', function() {
                const e = new EventEmitter();
                const mc = e.middleware('test', noop);
                mc.should.be.instanceof(MiddlewareCollection);
                mc.eventNames().should.be.eql(['test']);
            });

            it('should return middleware collection when passing no args', function() {
                const e = new EventEmitter();
                e.middleware('test1', noop);
                e.middleware('test2', noop);
                const mc = e.middleware();
                mc.should.be.instanceof(MiddlewareCollection);
                mc.eventNames().should.be.eql(['test1', 'test2']);
            });

            it('should return sub middleware collection when passing eventName', function() {
                const e = new EventEmitter();
                e.middleware('test1', noop);
                e.middleware('test2', noop);
                const mc1 = e.middleware('test1');
                mc1.should.be.instanceof(MiddlewareCollection);
                mc1.eventNames().should.be.eql(['test1']);
                const mc2 = e.middleware(['test1']);
                mc2.should.be.instanceof(MiddlewareCollection);
                mc2.eventNames().should.be.eql(['test1']);
            });
        });

        describe('emit', function() {
            it('should work with default options', function(done) {
                const e = new EventEmitter();
                e.middleware('test', (value1, value2, next) => {
                    next(null, value1 + 1, value2 + 1);
                }).pre((value1, value2, next) => {
                    next(null, value1 + 1, value2 + 1);
                }).post((value1, value2, next) => {
                    try {
                        value1.should.be.eql(2);
                        value2.should.be.eql(3);
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
                e.emit('test', 0, 1);
            });

            it('should work when setting globalArgs to true', function(done) {
                const e = new EventEmitter({
                    middleware: {
                        globalArgs: true
                    }
                });
                e.middleware('test', (g, next) => {
                    g.value += 1;
                    next();
                }).pre((g, next) => {
                    g.value += 1;
                    next();
                }).post((g, next) => {
                    try {
                        g.value.should.be.eql(2);
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
                e.emit('test', {
                    value: 0
                });
            });

            it('should work when setting multiArgs to false', function(done) {
                const e = new EventEmitter({
                    middleware: {
                        multiArgs: false
                    }
                });
                e.middleware('test', (value, next) => {
                    next(null, value + 1, 1);
                }).pre((value, next) => {
                    next(null, value + 1, 1);
                }).post((value, next) => {
                    try {
                        value.should.be.eql(2);
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
                e.emit('test', 0, 1);
            });

            it('should work when setting postMiddleware to false', function(done) {
                const e = new EventEmitter({
                    middleware: {
                        postMiddleware: false
                    }
                });
                e.middleware('test', (value, next) => {
                    next(null, value + 1);
                }).pre((value, next) => {
                    next(null, value + 1);
                }).post((value, next) => {
                    throw new Error('in post');
                }).onError(done);

                e.middleware()._middlewares.get('test').done(function(value) {
                    value.should.be.eql(2);
                    done();
                });
                e.emit('test', 0);
            });

            it('should work when setting onlyPromise to true', function(done) {
                const e = new EventEmitter({
                    middleware: {
                        onlyPromise: true
                    }
                });
                e.middleware('test', (value, next) => {
                    should(next).be.undefined();
                    return Promise.resolve(value + 1);
                }).pre((value, next) => {
                    should(next).be.undefined();
                    return Promise.resolve(value + 1);
                }).post((value, next) => {
                    should(next).be.undefined();
                    value.should.be.eql(2);
                    done();
                }).onError(done);
                e.emit('test', 0);
            });

            it('should catch error by middleware collection onError', function(done) {
                const e = new EventEmitter();
                e.middleware('test', next => {
                    throw new Error('error');
                }).onError(err => {
                    try {
                        err.should.be.instanceof(Error);
                        err.message.should.be.eql('error');
                        done();
                    } catch (_err) {
                        done(_err);
                    }
                });
                e.emit('test');
            });
        });
    });
});
