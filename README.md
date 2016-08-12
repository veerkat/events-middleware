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

pre or post

```js
// if eventName test has added
e.middleware('test').pre(function(value1, value2, next) {
    next(null, value1, value2);
}).post(function(value1, value2, next) {
    next(null, value1, value2);
});

// or not
e.middleware('test', function(value1, value2, next) {
    next(null, value1, value2);
}).pre(function(value1, value2, next) {
    next(null, value1, value2);
}).post(function(value1, value2, next) {
    next(null, value1, value2);
});

// use promise
e.middleware('test', function(value) {
    return Primise.resolve(value);
}).pre(function(value) {
    return Primise.resolve(value);
}).post(function(value) {
    return Primise.resolve(value);
});
```

# License

  MIT
