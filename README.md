# [**@koa/send**](https://github.com/koajs/send)

[![NPM version][npm-image]][npm-url]
![Build Status][github-action-image]
[![Test coverage][coveralls-image]][coveralls-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

[npm-image]: https://img.shields.io/npm/v/@koa/send.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@koa/send
[github-action-image]: https://github.com/koajs/send/actions/workflows/ci.yml/badge.svg?style=flat-square
[coveralls-image]: https://img.shields.io/coveralls/koajs/send.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/koajs/send?branch=master
[license-image]: http://img.shields.io/npm/l/koa-send.svg?style=flat-square
[license-url]: LICENSE
[downloads-image]: http://img.shields.io/npm/dm/koa-send.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/koa-send

Koa static file serving middleware.

> Notice: We recommend using `@koa/send` for installation, as both `koa-send` and `@koa/send` refer to the same module. However, in our next major versions bumps, we will deprecate `koa-send` and only maintain the module under `@koa/send`.

## Install

[![NPM](https://nodei.co/npm/@koa/send.png?downloads=true)](https://nodei.co/npm/@koa/send)

```js
$ npm i @koa/send
```

## Options

- `maxage` Browser cache max-age in milliseconds. (defaults to `0`).
- `immutable` Tell the browser the resource is immutable and can be cached indefinitely. (defaults to `false`).
- `hidden` Allow transfer of hidden files. (defaults to `false`).
- [`root`](#root-path) Root directory to restrict file access.
- `index` Name of the index file to serve automatically when visiting the root location. (defaults to none).
- `gzip` Try to serve the gzipped version of a file automatically when `gzip` is supported by a client and if the requested file with `.gz` extension exists. (defaults to `true`).
- `brotli` Try to serve the brotli version of a file automatically when `brotli` is supported by a client and if the requested file with `.br` extension exists. (defaults to `true`).
- `format` If not `false` (defaults to `true`), format the path to serve static file servers and not require a trailing slash for directories, so that you can do both `/directory` and `/directory/`.
- [`setHeaders`](#setheaders) Function to set custom headers on response.
- `extensions` Try to match extensions from passed array to search for file when no extension is sufficed in URL. First found is served. (defaults to `false`)

### Root path

Note that `root` is required, defaults to `''` and will be resolved,
removing the leading `/` to make the path relative and this
path must not contain "..", protecting developers from
concatenating user input. If you plan on serving files based on
user input supply a `root` directory from which to serve from.

For example to serve files from `./public`:

```js
app.use(async (ctx) => {
  await send(ctx, ctx.path, { root: __dirname + "/public" });
});
```

To serve developer specified files:

```js
app.use(async (ctx) => {
  await send(ctx, "path/to/my.js");
});
```

### setHeaders

The function is called as `fn(res, path, stats)`, where the arguments are:

- `res`: the response object.
- `path`: the resolved file path that is being sent.
- `stats`: the stats object of the file that is being sent.

You should only use the `setHeaders` option when you wish to edit the `Cache-Control` or `Last-Modified` headers, because doing it before is useless (it's overwritten by `send`), and doing it after is too late because the headers are already sent.

If you want to edit any other header, simply set them before calling `send`.

## Example

```js
const send = require("@koa/send");
const Koa = require("koa");
const app = new Koa();

// $ GET /package.json
// $ GET /

app.use(async (ctx) => {
  if ("/" == ctx.path) return (ctx.body = "Try GET /package.json");
  await send(ctx, ctx.path);
});

app.listen(3000);
console.log("listening on port 3000");
```

## License

[MIT](/LICENSE)
