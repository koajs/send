/**
 * Module dependencies.
 */

const debug = require('debug')('koa-send')
const resolvePath = require('resolve-path')
const createError = require('http-errors')
const assert = require('assert')
const fs = require('mz/fs')

const {
  normalize,
  basename,
  extname,
  resolve,
  parse,
  sep
} = require('path')

/**
 * Expose `send()`.
 */

module.exports = send

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

async function send (ctx, path, opts = {}) {
  assert(ctx, 'koa context required')
  assert(path, 'pathname required')

  // options
  debug('send "%s" %j', path, opts)
  const root = opts.root ? normalize(resolve(opts.root)) : ''
  const trailingSlash = path[path.length - 1] === '/'
  path = path.substr(parse(path).root.length)
  const index = opts.index
  const maxage = opts.maxage || opts.maxAge || 0
  const immutable = opts.immutable || false
  const hidden = opts.hidden || false
  const format = opts.format !== false
  const extensions = Array.isArray(opts.extensions) ? opts.extensions : false
  const brotli = opts.brotli !== false
  const gzip = opts.gzip !== false
  const setHeaders = opts.setHeaders

  if (setHeaders && typeof setHeaders !== 'function') {
    throw new TypeError('option setHeaders must be function')
  }

  // normalize path
  path = decode(path)

  if (path === -1) return ctx.throw(400, 'failed to decode')
  path = resolvePath(root, path)

  /**
   * Create a list of all possible matches for the given path and options
   * The list will be in order of preferred match, namely, for each possible index:
   * A brotli version of the index
   * A gzip version of the index
   * The index
   * A brotli version of the index with one of its extensions
   * A gip version of the index with one of its extensions
   * The index with one of its extension
   */
  let paths = [].concat(trailingSlash ? index : [''].concat(format ? index : [])) // All of the possible index files
  .map(i=>path + (i ? '/' : '') + i) // The permutations of the path with all of the possible indexes
  .reduce((p,c)=>{ // each c is a possible match. Collect the compressed and extended versions and the compressed versions of the extended versions
    let eP = extensions ? extendedPath(c, extensions) : []
    return p.concat(
      compressedPath(ctx, c, brotli, gzip)
      ,{path:c, ext: extname(c)}
      ,eP.reduce((o,n)=>o.concat(compressedPath(ctx, n, brotli, gzip), n), []) 
    )
  }, [])

  for (let candidate of paths) {
    // hidden file support, ignore
    if (!hidden && isHidden(root, candidate.path)){
      if (Object.is(candidate, paths[paths.length-1]))
        return
      else
        continue
    }

    // stat
    let stats
    try {
      stats = await fs.stat(candidate.path)
      if (stats.isDirectory()){
        if (Object.is(candidate, paths[paths.length-1]))
          return
        else
          continue
      }
    } catch (err) {
      const notfound = ['ENOENT', 'ENAMETOOLONG', 'ENOTDIR']
      if (notfound.includes(err.code)) {
        if (Object.is(candidate, paths[paths.length-1]))
          throw createError(404, err)
        else
          continue
      }
      err.status = 500
      throw err
    }

    /**
     * The current candidate permutation exists and is not a directory
     * We will serve this and be done
     */
    if (setHeaders) setHeaders(ctx.res, candidate.path, stats)

    // stream
    ctx.set('Content-Length', stats.size)
    if (!ctx.response.get('Last-Modified')) ctx.set('Last-Modified', stats.mtime.toUTCString())
    if (!ctx.response.get('Cache-Control')) {
      const directives = ['max-age=' + (maxage / 1000 | 0)]
      if (immutable) {
        directives.push('immutable')
      }
      ctx.set('Cache-Control', directives.join(','))
    }
    ctx.type = candidate.ext
    if (candidate.fixup) candidate.fixup()
    ctx.body = fs.createReadStream(candidate.path)
    return candidate.path
  }
}

/**
 * Return permutations of the path appended with compression option extensions
 */

function compressedPath(ctx, path, brotli, gzip){
  let paths = []
  // serve brotli file when possible otherwise gzipped file when possible
  if (brotli && 'br' === ctx.acceptsEncodings('br', 'identity') && ! /\.br$/.test(path)){
    paths.push({path: path + '.br', ext: extname(path), fixup: function(){
      ctx.set('Content-Encoding', 'br')
    }})
  }
  if (gzip && 'gzip' === ctx.acceptsEncodings('gzip', 'identity') && ! /\.gz$/.test(path)){
    paths.push({path: path + '.gz', ext: extname(path), fixup: function(){
      ctx.set('Content-Encoding', 'gzip')
    }})
  }
  return paths
}

/**
 * Return permutations of the path appended with option extensions
 */

function extendedPath(path, extensions){
  let paths = []
  for (ext of [].concat(extensions||[])){
    if ('string' !== typeof ext) {
      throw new TypeError('option extensions must be array of strings or false')
    }
    ext.replace(/^\./, '')
    paths.push({path: [path,ext].join('.'), ext:'.'+ext})
  }
  return paths
}

/**
 * Check if it's hidden.
 */

function isHidden (root, path) {
  path = path.substr(root.length).split(sep)
  for (let i = 0; i < path.length; i++) {
    if (path[i][0] === '.') return true
  }
  return false
}

/**
 * Decode `path`.
 */

function decode (path) {
  try {
    return decodeURIComponent(path)
  } catch (err) {
    return -1
  }
}
