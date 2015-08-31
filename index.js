/**
 * Module dependencies.
 */

var debug = require('debug')('koa-send');
var resolvePath = require('resolve-path');
var assert = require('assert');
var path = require('path');
var normalize = path.normalize;
var basename = path.basename;
var extname = path.extname;
var resolve = path.resolve;
var fs = require('mz/fs');

/**
 * Expose `send()`.
 */

module.exports = send;

/**
 * Send file at `path` with the
 * given `options` to the koa `ctx`.
 *
 * @param {Context} ctx
 * @param {String} path
 * @param {Object} [opts]
 * @return {Function}
 * @api public
 */

function send(ctx, path, opts) {
  assert(ctx, 'koa context required');
  assert(path, 'pathname required');
  opts = opts || {};

  // options
  debug('send "%s" %j', path, opts);
  var root = opts.root ? normalize(resolve(opts.root)) : '';
  path = path[0] == '/' ? path.slice(1) : path;
  var index = opts.index;
  var maxage = opts.maxage || opts.maxAge || 0;
  var hidden = opts.hidden || false;
  var gzip = opts.gzip || opts.gzip === undefined ? true : false;

  return function *(){
    var trailingSlash = '/' == path[path.length - 1];
    var encoding = this.acceptsEncodings('gzip', 'deflate', 'identity');

    // normalize path
    path = decode(path);

    if (-1 == path) return ctx.throw('failed to decode', 400);

    // index file support
    if (index && trailingSlash) path += index;

    path = resolvePath(root, path);

    // hidden file support, ignore
    if (!hidden && leadingDot(path)) return;

    // serve gzipped file when possible
    if (encoding === 'gzip' && gzip && (yield fs.exists(path + '.gz'))) {
      path = path + '.gz';
      ctx.set('Content-Encoding', 'gzip');
      ctx.res.removeHeader('Content-Length');
    }

    // stat
    try {
      var stats = yield fs.stat(path);
      if (stats.isDirectory()) return;
    } catch (err) {
      var notfound = ['ENOENT', 'ENAMETOOLONG', 'ENOTDIR'];
      if (~notfound.indexOf(err.code)) return;
      err.status = 500;
      throw err;
    }

    // stream
    ctx.set('Last-Modified', stats.mtime.toUTCString());
    ctx.set('Content-Length', stats.size);
    ctx.set('Cache-Control', 'max-age=' + (maxage / 1000 | 0));
    ctx.type = type(path);

    // if fresh, 304
    this.status = 200;
    if(this.fresh){
      this.status = 304;
    } else {
      ctx.body = fs.createReadStream(path);
    }

    return path;
  }
}

/**
 * Check if it's hidden.
 */

function leadingDot(path) {
  return '.' == basename(path)[0];
}

/**
 * File type.
 */

function type(file) {
  return extname(basename(file, '.gz'));
}

/**
 * Decode `path`.
 */

function decode(path) {
  try {
    return decodeURIComponent(path);
  } catch (err) {
    return -1;
  }
}
