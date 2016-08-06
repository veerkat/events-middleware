'use strict';

const EventEmitter = require('events');

function callable(instance) {
    return function(...args) {
        instance.call.apply(instance, args);
    };
}

function wrapPromise(fn) {
    return function(...args) {
        return new Promise((resolve, reject) => {
            const cb = function(err, ...extra) {
                if (err) {
                    return reject(err);
                } else {
                    const value = extra.length < 2 ? extra[0] : extra;
                    return resolve(value);
                }
            };
            let promise = fn.apply(this, [...args, cb]);
            if (Promise.resolve(promise) == promise) {
                promise.then(resolve).catch(reject);
            }
        });
    };
}

class EventMiddleware {
    constructor(eventName, fn) {
        this.eventName = eventName;
        this._pres = [];
        this._posts = [];
        this._main = this.wrapPromise(fn);
        this._onError = function (err) {
            return Promise.reject(err);
        };
        this._compose();
    }

    _compose() {
        this._fns = this._pres.concat([this._main]).concat(this._posts);
    }

    catch(callback) {
        this._onError = callback;
    }

    _addFns(role, fns) {
        if (!Array.isArray(fns)) {
            fns = [fns];
        }
        fns.forEach(fn => this[role].push(wrapPromise(fn)));
        this._compose();
    }

    pre(fns) {
        return this._addFns('_pres', fns);
    }

    post(fns) {
        return this._addFns('_posts', fns);
    }

    call(...value) {
        let idx = 0;
        const len = this._fns.length;
        return new Promise((resolve, reject) => {
            const next = (nextValue) => {
                if (idx > len) {
                    resolve(nextValue);
                }
                const nextFn = this._fns[idx++];
                nextFn.apply(this, nextValue).then(next).catch(reject);
            };
            next(value);
        }).catch(this._onError);
    }
}

class _EventEmitter extends EventEmitter {
    constructor() {
        super();
        this._middlewares = new Map();
    }

    on(eventName, listener) {
        if (this.eventNames().includes(eventName)) {
            throw Error(`event ${eventName} has added`);
        }
        const middleware = new EventMiddleware(eventName, listener);
        this._middlewares.set(eventName, middleware);
        return super.on(eventName, callable(middleware));
    }

    onError(eventNames, callback) {
        if (callback === undefined) {
            callback = eventNames;
            this._eachMiddleware('catch', callback);
        } else {
            this._callMiddlewares('catch', eventNames, callback);
        }
        return this;
    }

    _callMiddlewares(method, eventNames, ...args) {
        if (!Array.isArray(eventNames)) {
            eventNames = [eventNames];
        }
        eventNames.forEach(eventName => {
            const middleware = this._middlewares.get(eventName);
            return middleware && middleware[method](...args);
        });
    }

    _eachMiddleware(method, ...args) {
        for (let middleware of this._middlewares.values) {
            middleware[method](...args);
        }
    }

    pre(eventNames, fns) {
        this._callMiddleware('pre', eventNames, fns);
        return this;
    }

    preEach(fns) {
        this._eachMiddleware('pre', fns);
        return this;
    }

    post(eventNames, fns) {
        this._callMiddleware('post', eventNames, fns);
        return this;
    }

    postEach(fns) {
        this._eachMiddleware('post', fns);
        return this;
    }

}

module.exports.EventMiddleware = EventMiddleware;
module.exports.EventEmitter = _EventEmitter;
