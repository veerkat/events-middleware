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

select event

```js
// return all middleware collection
e.middleware();

// return selected middleware collection
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
e.middleware(['test', 'test1']).clear();
```

# License

  MIT
