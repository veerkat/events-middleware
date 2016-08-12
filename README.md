# events-middleware
node.js extend EventEmitter to support event middleware

## Installation

```bash
$ npm install events-middleware
```
events-middleware is supported in node v6+.

## Usage

import

```js
const {EventEmitter} = require('events-middleware');
const e = new EventEmitter();
```

add listener with middleware

```js
e.middleware('test', function(value1, value2, next) {
    next(null, value1, value2);
});
```

select eventNames

```js
// all middleware collection
e.middleware();

// selected middleware collection
e.middleware('test');
e.middleware(['test']);
```

pre or post

```js
const fn = function(value1, value2, next) {
    next(null, value1, value2);
};
// if eventName test has added
e.middleware('test').pre(fn).post(fn);

// or not
e.middleware('test1', fn).pre(fn).post(fn);

// use promise
const promiseFn = function(value) {
    return Primise.resolve(value);
}; 
e.middleware('test2', promiseFn).pre(promiseFn).post(promiseFn);

// multiple pres or posts
e.middleware('test').pre(fn).pre(fn);
e.middleware('test').pre([fn, fn]);

// multiple eventNames
e.middleware().pre(fn);
e.middleware(['test', 'test1']).pre(fn);
```

catch error

```js
// middleware fn
const fn = function(value1, value2, next) {
    next('return error');
};
// or promise
const promiseFn = function(value1, value2) {
    return Promise.reject('return error');
};

const onerror = function(err) {
    console.log(err);
};
e.middleware().onError(onerror);
e.middleware('test').onError(onerror);
e.middleware(['test', 'test1']).onError(onerror);
```

emit

```js
e.emit('test', 0, 1);
e.emit('test');
```

remove

```js
e.middleware().remove('test');
e.middleware().remove(['test', 'test1']);
```

clear

```js
e.middleware().clear(); // clear all

// being equivalent to e.middleware().remove(['test', 'test1'])
e.middleware(['test', 'test1']).clear();
```

options
- `globalArgs`: (default: false) enable or disable every middleware function get same values which emit passed
- `multiArgs`: (default: true) enable or disable middleware function pass multiple values to next middleware function

```js
const options = {
    globalArgs: false,
    multiArgs: true
}
const e1 = new EventEmitter({
    middleware: options
});
// or
e1.setOptions({
    middleware: options
});
// or by middleware collection
e1.middleware().setOptions(options);
// or when new middleware
e1.middleware('test', fn, options);
```

option `globalArgs` is `true`

```js
e1.middleware('test1', function(g, next) {
    console.log(g.value); // => 1;
    g.value += 1;
    next();
}, {
    globalArgs: true
}).pre(function(g, next) {
    console.log(g.value); // => 0;
    g.value += 1;
    next();
}).post(function(g, next) {
    console.log(g.value); // => 2;
    next();
});
e1.emit('test1', {value: 0});
```

option `multiArgs` is `false`

```js
e1.middleware('test2', function(value, next) {
    // just get first value from pre fn
    next(null, value);
}, {
    multiArgs: false
}).pre(function(value, next) {
    next(null, value, 1); // return two values but pass first value to next
});
e1.emit('test2', 0);
```

# License

  MIT
