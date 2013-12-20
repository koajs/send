
# koa-send [![Build Status](https://travis-ci.org/koajs/send.png)](https://travis-ci.org/koajs/send)

 Static file serving middleware.

## Installation

```js
$ npm install koa-send
```

## Options

 - `maxage` Browser cache max-age in milliseconds. defaults to 0
 - `hidden` Allow transfer of hidden files. defaults to false
 - `root` Root directory to restrict file access

## Root path

  Note that when `root` is _not_ used you __MUST__ provide an _absolute_
  path, and this path must not contain "..", protecting developers from
  concatenating user input. If you plan on serving files based on
  user input supply a `root` directory from which to serve from.

  For example to serve files from `./public`:

```js
app.use(function *(){
  yield send(this, this.path, { root: __dirname + '/public' });
})
```

  To serve developer specified files:

```js
app.use(function *(){
  yield send(this, 'path/to/my.js');
})
```

## Example

```js
var send = require('koa-send');
var koa = require('koa');
var app = koa();

// $ GET /package.json
// $ GET /

app.use(function *(){
  if ('/' == this.path) return this.body = 'Try GET /package.json';
  yield send(this, __dirname + '/package.json');
})

app.listen(3000);
console.log('listening on port 3000');
```

## License

  MIT