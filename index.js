'use strict';

const util = require('util');
const _EventEmitter = require('events');

class EventMiddleware {
    constructor(eventName, fn, options = {}) {
        this._options = {
            globalArgs: false,
            multiArgs: true,
            postMiddleware: true,
            onlyPromise: false
        };

        this.eventName = eventName;
        this._main = fn;
        this.setOptions(options);

        this._onError = function(err) {
            return Promise.reject(err);
        };

        this._done = function() {};
        this._pres = [];
        this._posts = [];

        this.compose();
    }

    _initOptions(options) {
        const getBoolOption = (options, name) => {
            return util.isBoolean(options[name]) ? options[name] : this._options[name];
        };
        return {
            globalArgs: getBoolOption(options, 'globalArgs'),
            multiArgs: getBoolOption(options, 'multiArgs'),
            postMiddleware: getBoolOption(options, 'postMiddleware'),
            onlyPromise: getBoolOption(options, 'onlyPromise')
        };
    }

    setOptions(options) {
        this._options = this._initOptions(options);
        return this;
    }

    compose() {
        let wrapFn;
        if (this._options.onlyPromise) {
            wrapFn = this.constructor.promiseWrapper;
        } else {
            wrapFn = this.constructor.promiseWrapperWithCb;
        }
        this._fns = this._pres.map(preFn => wrapFn(preFn)).concat([wrapFn(this._main)]);
        if (this._options.postMiddleware) {
            this._fns = this._fns.concat(this._posts.map(postFn => wrapFn(postFn)));
        }
    }

    catch (callback) {
        this._onError = callback;
        return this;
    }

    done(callback) {
        this._done = callback;
        return this;
    }

    _addFns(role, fns) {
        if (!Array.isArray(fns)) {
            fns = [fns];
        }
        fns.forEach(fn => this[role].push(fn));
        this.compose();
    }

    pre(fns) {
        this._addFns('_pres', fns);
        return this;
    }

    post(fns) {
        this._addFns('_posts', fns);
        return this;
    }

    call(...valueList) {
        let idx = 0;
        const len = this._fns.length;
        return new Promise((resolve, reject) => {
            const next = (nextValueList) => {
                if (this._options.globalArgs) {
                    nextValueList = valueList;
                }
                if (!this._options.multiArgs) {
                    nextValueList = nextValueList.slice(0, 1);
                }
                if (idx >= len) {
                    const _valueList = nextValueList.length < 2 ? nextValueList[0] : nextValueList;
                    return resolve(_valueList);
                }
                const nextFn = this._fns[idx++];
                nextFn.apply(this, nextValueList).then(next).catch(reject);
            };
            next(valueList);
        }).then(this._done).catch(this._onError);
    }

    static promiseWrapperWithCb(fn) {
        return function(...args) {
            return new Promise((resolve, reject) => {
                const cb = function(err, ...value) {
                    if (err) {
                        return reject(err);
                    } else {
                        return resolve(value);
                    }
                };
                const promise = fn.apply(this, [...args, cb]);
                if (Promise.resolve(promise) == promise) {
                    promise.then(value => resolve(value ? value : [])).catch(reject);
                } else if (promise !== undefined) {
                    resolve(promise);
                }
            });
        };
    }

    static promiseWrapper(fn) {
        return function(...args) {
            return new Promise((resolve, reject) => {
                const promise = fn.apply(this, args);
                if (Promise.resolve(promise) == promise) {
                    promise.then(value => resolve(value ? value : [])).catch(reject);
                } else if (promise !== undefined) {
                    resolve(promise);
                }
            });
        };
    }
}

class MiddlewareCollection {
    constructor(options) {
        this._middlewares = new Map();
        this._parent = this;

        this.setOptions(options);
    }

    _setParent(parent) {
        this._parent = parent;
    }

    _update(middlewares) {
        for (let [eventName, middleware] of middlewares) {
            this._middlewares.set(eventName, middleware);
        }
    }

    empty() {
        return this._middlewares.size === 0;
    }

    setOptions(options) {
        this._options = options || {};
        return this;
    }

    eventNames() {
        return Array.from(this._middlewares.keys());
    }

    new(eventName, fn, options) {
        if (this._middlewares.has(eventName)) {
            throw Error(`eventName ${eventName} has added`);
        }
        const middleware = new EventMiddleware(eventName, fn,
            options || this._options || {});
        this._middlewares.set(eventName, middleware);
        return middleware;
    }

    select(eventNames) {
        if (!Array.isArray(eventNames)) {
            eventNames = [eventNames];
        }

        const middlewares = new Map();
        eventNames.forEach(eventName => {
            const middleware = this._middlewares.get(eventName);
            if (middleware) {
                middlewares.set(eventName, middleware);
            }
        });
        const mc = new MiddlewareCollection(this._options);
        mc._update(middlewares);
        mc._setParent(this._parent || this);
        return mc;
    }

    onError(callback) {
        this._eachMiddleware('catch', callback);
        return this;
    }

    _eachMiddleware(method, ...args) {
        for (let middleware of this._middlewares.values()) {
            middleware[method](...args);
        }
    }

    pre(fns) {
        this._eachMiddleware('pre', fns);
        return this;
    }

    post(fns) {
        this._eachMiddleware('post', fns);
        return this;
    }

    has(eventName) {
        return this._middlewares.has(eventName);
    }

    remove(eventNames) {
        if (!Array.isArray(eventNames)) {
            eventNames = [eventNames];
        }

        eventNames.forEach(eventName => {
            if (this.has(eventName)) {
                this._middlewares.delete(eventName);
                this._parent._middlewares.delete(eventName);
            }
        });
        return this;
    }

    clear() {
        this.eventNames().forEach(eventName => {
            this._middlewares.delete(eventName);
            this._parent._middlewares.delete(eventName);
        });
        return this;
    }
}

class EventEmitter extends _EventEmitter {
    constructor(options = {}) {
        super();
        this._middlewares = new MiddlewareCollection();
        this.setOptions(options);
    }

    setOptions(options) {
        this._options = options;
        this._middlewares.setOptions(this._options.middleware);
        return this;
    }

    middleware(eventName, listener, options) {
        if (!eventName) {
            return this._middlewares;
        }
        if (!listener) {
            return this._middlewares.select(eventName);
        }

        const middleware = this._middlewares.new(eventName, listener, options);
        super.on(eventName, this.constructor.callable(middleware));
        return this._middlewares.select(eventName);
    }

    static callable(instance) {
        return function(...args) {
            instance.call(...args);
        }
    }
}

module.exports = {
    EventMiddleware,
    MiddlewareCollection,
    EventEmitter
};