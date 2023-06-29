/**
 * Module dependencies.
 */
import fs from 'node:fs';
import asyncFs from 'node:fs/promises';
import path from 'node:path';
import safeResolvePath from 'resolve-path';
import createError from 'http-errors';
import type {SendOptions, ParameterizedContext} from './send.types';
import {isPathExists, isPathHidden, getFileType} from './send.utils';

/**
 * Send file at `path` with the
 * given `options` to the koa `ctx`.
 *
 * @param {Context} ctx
 * @param {String} filePath
 * @param {Object} [opts]
 * @return {Promise}
 * @api public
 */
export async function send(
  ctx: ParameterizedContext,
  filePath: string,
  opts: SendOptions = {},
): Promise<string | undefined> {
  if (!ctx) throw new Error('koa context required');
  if (!filePath) throw new Error('file pathname required');

  // options
  const root = opts.root ? path.resolve(opts.root) : '';
  const trailingSlash = filePath.at(-1) === '/';
  filePath = filePath.slice(path.parse(filePath).root.length);
  const {index} = opts;
  const maxage = opts.maxage || opts.maxAge || 0;
  const immutable = opts.immutable || false;
  const hidden = opts.hidden || false;
  const format = opts.format !== false;
  const extensions = Array.isArray(opts.extensions) ? opts.extensions : false;
  const brotli = opts.brotli !== false;
  const gzip = opts.gzip !== false;
  const {setHeaders} = opts;
  if (setHeaders && typeof setHeaders !== 'function')
    throw new TypeError('option setHeaders must be function');

  // normalize and decode path
  try {
    filePath = decodeURIComponent(filePath);
  } catch {
    return ctx.throw(400, 'failed to decode');
  }

  // index file support
  if (index && trailingSlash) filePath += index;
  filePath = safeResolvePath(root, filePath);

  // hidden file support, ignore
  if (!hidden && isPathHidden(root, filePath)) return;

  // serve brotli file when possible otherwise gzipped file when possible
  let encodingExt = '';
  if (
    ctx.acceptsEncodings('br', 'identity') === 'br' &&
    brotli &&
    (await isPathExists(filePath + '.br'))
  ) {
    filePath += '.br';
    ctx.set('Content-Encoding', 'br');
    ctx.res.removeHeader('Content-Length');
    encodingExt = '.br';
  } else if (
    ctx.acceptsEncodings('gzip', 'identity') === 'gzip' &&
    gzip &&
    (await isPathExists(filePath + '.gz'))
  ) {
    filePath += '.gz';
    ctx.set('Content-Encoding', 'gzip');
    ctx.res.removeHeader('Content-Length');
    encodingExt = '.gz';
  }

  if (extensions && !path.basename(filePath).includes('.')) {
    for (let ext of extensions) {
      if (typeof ext !== 'string')
        throw new TypeError(
          'option extensions must be array of strings or false',
        );
      if (!ext.startsWith('.')) ext = `.${ext}`;
      if (await isPathExists(`${filePath}${ext}`)) {
        filePath = `${filePath}${ext}`;
        break;
      }
    }
  }

  // stat
  let stats;
  try {
    stats = await asyncFs.stat(filePath);
    // Format the path to serve static file servers
    // and not require a trailing slash for directories,
    // so that you can do both `/directory` and `/directory/`
    if (stats.isDirectory()) {
      if (!format || !index) return;
      filePath += `/${index}`;
      stats = await asyncFs.stat(filePath);
    }
  } catch (err) {
    const notfound = ['ENOENT', 'ENAMETOOLONG', 'ENOTDIR'];
    if (notfound.includes(err.code)) throw createError(404, err);
    err.status = 500;
    throw err;
  }

  // inject headers
  setHeaders?.(ctx.res, filePath, stats);

  // stream
  ctx.set('Content-Length', stats.size.toString());
  if (!ctx.response.get('Last-Modified'))
    ctx.set('Last-Modified', stats.mtime.toUTCString());
  if (!ctx.response.get('Cache-Control')) {
    const directives = [`max-age=${(maxage / 1000) | 0}`];
    if (immutable) directives.push('immutable');
    ctx.set('Cache-Control', directives.join(','));
  }

  if (!ctx.type) ctx.type = getFileType(filePath, encodingExt);
  ctx.body = fs.createReadStream(filePath);

  return filePath;
}
