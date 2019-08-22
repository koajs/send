
const request = require('supertest')
const send = require('..')
const path = require('path')
const Koa = require('koa')
const fs = require('fs')
const assert = require('assert')
const decompress = require('iltorb').decompress

describe('send(ctx, file)', function () {
  describe('with no .root', function () {
    describe('when the path is absolute', function () {
      it('should 404', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, path.join(__dirname, '/fixtures/hello.txt'))
        })

        request(app.listen())
        .get('/')
        .expect(404, done)
      })

      it('should throw 404 error', function (done) {
        const app = new Koa()

        let error
        app.use(async (ctx) => {
          try {
            await send(ctx, path.join(__dirname, '/fixtures/hello.txt'))
          } catch (err) {
            error = err
          }
        })

        request(app.listen())
        .get('/')
        .expect(404, () => {
          assert.equal(error.status, 404)
          done()
        })
      })
    })

    describe('when the path is relative', function () {
      it('should 200', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/hello.txt')
        })

        request(app.listen())
        .get('/')
        .expect(200)
        .expect('world', done)
      })

      it('should 304', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/hello.txt')
        })

        request(app.listen())
          .get('/')
          .set('if-modified-since', fs.statSync(path.join(__dirname, 'fixtures/hello.txt')).mtime)
          .expect(304, done)
      })
    })

    describe('when the path contains ..', function () {
      it('should 403', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, '/../fixtures/hello.txt')
        })

        request(app.listen())
        .get('/')
        .expect(403, done)
      })
    })
  })

  describe('with .root', function () {
    describe('when the path is absolute', function () {
      it('should 404', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          const opts = { root: 'test/fixtures' }
          await send(ctx, path.join(__dirname, '/fixtures/hello.txt'), opts)
        })

        request(app.listen())
        .get('/')
        .expect(404, done)
      })
    })

    describe('when the path is relative and exists', function () {
      it('should serve the file', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          const opts = { root: 'test/fixtures' }
          await send(ctx, 'hello.txt', opts)
        })

        request(app.listen())
        .get('/')
        .expect(200)
        .expect('world', done)
      })
    })

    describe('when the path is relative and does not exist', function () {
      it('should 404', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          const opts = { root: 'test/fixtures' }
          await send(ctx, 'something', opts)
        })

        request(app.listen())
        .get('/')
        .expect(404, done)
      })
    })

    describe('when the path resolves above the root', function () {
      it('should 403', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          const opts = { root: 'test/fixtures' }
          await send(ctx, '../../package.json', opts)
        })

        request(app.listen())
        .get('/')
        .expect(403, done)
      })
    })

    describe('when the path resolves within root', function () {
      it('should 403', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          const opts = { root: 'test/fixtures' }
          await send(ctx, '../../test/fixtures/world/index.html', opts)
        })

        request(app.listen())
        .get('/')
        .expect(403, done)
      })
    })
  })

  describe('with .index', function () {
    describe('when the index file is present', function () {
      it('should serve it', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          const opts = { root: 'test', index: 'index.html' }
          await send(ctx, 'fixtures/world/', opts)
        })

        request(app.listen())
        .get('/')
        .expect(200)
        .expect('html index', done)
      })

      it('should serve it', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          const opts = { root: 'test/fixtures/world', index: 'index.html' }
          await send(ctx, ctx.path, opts)
        })

        request(app.listen())
        .get('/')
        .expect(200)
        .expect('html index', done)
      })
    })
  })

  describe('when path is not a file', function () {
    it('should 404', function (done) {
      const app = new Koa()

      app.use(async (ctx) => {
        await send(ctx, '/test')
      })

      request(app.listen())
      .get('/')
      .expect(404, done)
    })

    it('should return undefined if format is set to false', function (done) {
      const app = new Koa()

      app.use(async (ctx) => {
        const sent = await send(ctx, '/test', { format: false })
        assert.equal(sent, undefined)
      })

      request(app.listen())
      .get('/')
      .expect(404, done)
    })
  })

  describe('when path is a directory', function () {
    it('should 404', function (done) {
      const app = new Koa()

      app.use(async (ctx) => {
        await send(ctx, '/test/fixtures')
      })

      request(app.listen())
      .get('/')
      .expect(404, done)
    })
  })

  describe('when path does not finish with slash and format is disabled', function () {
    it('should 404', function (done) {
      const app = new Koa()

      app.use(async (ctx) => {
        const opts = { root: 'test', index: 'index.html', format: false }
        await send(ctx, 'fixtures/world', opts)
      })

      request(app.listen())
        .get('/world')
        .expect(404, done)
    })

    it('should 404', function (done) {
      const app = new Koa()

      app.use(async (ctx) => {
        const opts = { root: 'test', index: 'index.html', format: false }
        await send(ctx, 'fixtures/world', opts)
      })

      request(app.listen())
        .get('/world')
        .expect(404, done)
    })
  })

  describe('when path does not finish with slash and format is enabled', function () {
    it('should 200', function (done) {
      const app = new Koa()

      app.use(async (ctx) => {
        const opts = { root: 'test', index: 'index.html' }
        await send(ctx, 'fixtures/world', opts)
      })

      request(app.listen())
        .get('/')
        .expect('content-type', 'text/html; charset=utf-8')
        .expect('content-length', '10')
        .expect(200, done)
    })

    it('should 404 if no index', function (done) {
      const app = new Koa()

      app.use(async (ctx) => {
        const opts = { root: 'test' }
        await send(ctx, 'fixtures/world', opts)
      })

      request(app.listen())
        .get('/')
        .expect(404, done)
    })
  })

  describe('when path is malformed', function () {
    it('should 400', function (done) {
      const app = new Koa()

      app.use(async (ctx) => {
        await send(ctx, '/%')
      })

      request(app.listen())
      .get('/')
      .expect(400, done)
    })
  })

  describe('when path is a file', function () {
    it('should return the path', function (done) {
      const app = new Koa()

      app.use(async (ctx) => {
        const p = '/test/fixtures/user.json'
        const sent = await send(ctx, p)
        assert.equal(sent, path.join(__dirname, '/fixtures/user.json'))
      })

      request(app.listen())
      .get('/')
      .expect(200, done)
    })

    describe('or .gz version when requested and if possible', function () {
      it('should return path', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, '/test/fixtures/gzip.json')
        })

        request(app.listen())
        .get('/')
        .set('Accept-Encoding', 'deflate, identity')
        .expect('Content-Length', '18')
        .expect('{ "name": "tobi" }')
        .expect(200, done)
      })

      it('should return .gz path (gzip option defaults to true)', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, '/test/fixtures/gzip.json')
        })

        request(app.listen())
        .get('/')
        .set('Accept-Encoding', 'gzip, deflate, identity')
        .expect('Content-Length', '48')
        .expect('{ "name": "tobi" }')
        .expect(200, done)
      })

      it('should return .gz path when gzip option is turned on', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, '/test/fixtures/gzip.json', { gzip: true })
        })

        request(app.listen())
        .get('/')
        .set('Accept-Encoding', 'gzip, deflate, identity')
        .expect('Content-Length', '48')
        .expect('{ "name": "tobi" }')
        .expect(200, done)
      })

      it('should not return .gz path when gzip option is false', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, '/test/fixtures/gzip.json', { gzip: false })
        })

        request(app.listen())
        .get('/')
        .set('Accept-Encoding', 'gzip, deflate, identity')
        .expect('Content-Length', '18')
        .expect('{ "name": "tobi" }')
        .expect(200, done)
      })
    })

    describe('or .br version when requested and if possible', function () {
      function parser (res, cb) {
        const chunks = []
        res.on('data', chunk => {
          chunks.push(chunk)
        })
        res.on('end', () => {
          decompress(Buffer.concat(chunks), (err, data) => {
            cb(err, data.toString())
          })
        })
      }

      it('should return path', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, '/test/fixtures/gzip.json')
        })

        request(app.listen())
        .get('/')
        .set('Accept-Encoding', 'deflate, identity')
        .expect('Content-Length', '18')
        .expect('{ "name": "tobi" }')
        .expect(200, done)
      })

      it('should return .br path (brotli option defaults to true)', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, '/test/fixtures/gzip.json')
        })

        request(app.listen())
        .get('/')
        .parse(parser)
        .set('Accept-Encoding', 'br, deflate, identity')
        .expect('Content-Length', '22')
        .expect(200)
        .then(({body}) => {
          assert.deepStrictEqual(body, '{ "name": "tobi" }')
          done()
        })
      })

      it('should return .br path when brotli option is turned on', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, '/test/fixtures/gzip.json', { brotli: true })
        })

        request(app.listen())
        .get('/')
        .parse(parser)
        .set('Accept-Encoding', 'br, deflate, identity')
        .expect('Content-Length', '22')
        .expect(200)
        .then(({body}) => {
          assert.deepStrictEqual(body, '{ "name": "tobi" }')
          done()
        })
      })

      it('should not return .br path when brotli option is false', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, '/test/fixtures/gzip.json', { brotli: false })
        })

        request(app.listen())
        .get('/')
        .set('Accept-Encoding', 'br, deflate, identity')
        .expect('Content-Length', '18')
        .expect('{ "name": "tobi" }')
        .expect(200, done)
      })

      it('should return .gz path when brotli option is turned off', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, '/test/fixtures/gzip.json', { brotli: false })
        })

        request(app.listen())
        .get('/')
        .set('Accept-Encoding', 'br, gzip, deflate, identity')
        .expect('Content-Length', '48')
        .expect('{ "name": "tobi" }')
        .expect(200, done)
      })
    })

    describe('and max age is specified', function () {
      it('should set max-age in seconds', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          const p = '/test/fixtures/user.json'
          const sent = await send(ctx, p, { maxage: 5000 })
          assert.equal(sent, path.join(__dirname, '/fixtures/user.json'))
        })

        request(app.listen())
        .get('/')
        .expect('Cache-Control', 'max-age=5')
        .expect(200, done)
      })

      it('should truncate fractional values for max-age', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          const p = '/test/fixtures/user.json'
          const sent = await send(ctx, p, { maxage: 1234 })
          assert.equal(sent, path.join(__dirname, '/fixtures/user.json'))
        })

        request(app.listen())
        .get('/')
        .expect('Cache-Control', 'max-age=1')
        .expect(200, done)
      })
    })

    describe('and immutable is specified', function () {
      it('should set the immutable directive', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          const p = '/test/fixtures/user.json'
          const sent = await send(ctx, p, { immutable: true, maxage: 31536000000 })
          assert.equal(sent, path.join(__dirname, '/fixtures/user.json'))
        })

        request(app.listen())
        .get('/')
        .expect('Cache-Control', 'max-age=31536000,immutable')
        .expect(200, done)
      })
    })
  })

  describe('.immutable option', function () {
    describe('when trying to get a non-existent file', function () {
      it('should not set the Cache-Control header', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/does-not-exist.json', { immutable: true })
        })

        request(app.listen())
        .get('/')
        .expect((res) => {
          assert.equal(res.header['cache-control'], undefined)
        })
        .expect(404, done)
      })
    })
  })

  describe('.hidden option', function () {
    describe('when trying to get a hidden file', function () {
      it('should 404', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/.hidden')
        })

        request(app.listen())
        .get('/')
        .expect(404, done)
      })
    })

    describe('when trying to get a file from a hidden directory', function () {
      it('should 404', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/.private/id_rsa.txt')
        })

        request(app.listen())
        .get('/')
        .expect(404, done)
      })
    })

    describe('when trying to get a hidden file and .hidden check is turned off', function () {
      it('should 200', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/.hidden', { hidden: true })
        })

        request(app.listen())
        .get('/')
        .expect(200, done)
      })
    })
  })

  describe('.extensions option', function () {
    describe('when trying to get a file without extension with no .extensions sufficed', function () {
      it('should 404', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/hello')
        })

        request(app.listen())
        .get('/')
        .expect(404, done)
      })
    })

    describe('when trying to get a file without extension with no matching .extensions', function () {
      it('should 404', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/hello', { extensions: ['json', 'htm', 'html'] })
        })

        request(app.listen())
        .get('/')
        .expect(404, done)
      })
    })

    describe('when trying to get a file without extension with non array .extensions', function () {
      it('should 404', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/hello', { extensions: {} })
        })

        request(app.listen())
        .get('/')
        .expect(404, done)
      })
    })

    describe('when trying to get a file without extension with non string array .extensions', function () {
      it('throws if extensions is not array of strings', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/hello', { extensions: [2, {}, []] })
        })

        request(app.listen())
        .get('/')
        .expect(500)
        .end(done)
      })
    })

    describe('when trying to get a file without extension with matching .extensions sufficed first matched should be sent', function () {
      it('should 200 and application/json', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/user', { extensions: ['html', 'json', 'txt'] })
        })

        request(app.listen())
        .get('/')
        .expect(200)
        .expect('Content-Type', /application\/json/)
        .end(done)
      })
    })

    describe('when trying to get a file without extension with matching .extensions sufficed', function () {
      it('should 200', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/hello', { extensions: ['txt'] })
        })

        request(app.listen())
        .get('/')
        .expect(200, done)
      })
    })

    describe('when trying to get a file without extension with matching doted .extensions sufficed', function () {
      it('should 200', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/hello', { extensions: ['.txt'] })
        })

        request(app.listen())
        .get('/')
        .expect(200, done)
      })
    })

    describe('when trying to get a file without extension with matching .extensions sufficed with other dots in path', function () {
      it('should 200', function (done) {
        const app = new Koa()

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/some.path/index', { extensions: ['json'] })
        })

        request(app.listen())
        .get('/')
        .expect(200, done)
      })
    })
  })

  it('should set the Content-Type', function (done) {
    const app = new Koa()

    app.use(async (ctx) => {
      await send(ctx, '/test/fixtures/user.json')
    })

    request(app.listen())
    .get('/')
    .expect('Content-Type', /application\/json/)
    .end(done)
  })

  it('should set the Content-Length', function (done) {
    const app = new Koa()

    app.use(async (ctx) => {
      await send(ctx, '/test/fixtures/user.json')
    })

    request(app.listen())
    .get('/')
    .expect('Content-Length', '18')
    .end(done)
  })

  it('should set the Content-Type', function (done) {
    const app = new Koa()

    const testFilePath = path.normalize('/test/fixtures/world/index.html')

    app.use(async (ctx) => {
      ctx.type = 'text/plain'
      await send(ctx, testFilePath)
    })

    request(app.listen())
    .get('/')
    .expect('Content-Type', /text\/plain/)
    .end(done)
  })

  it('should set Last-Modified', function (done) {
    const app = new Koa()

    app.use(async (ctx) => {
      await send(ctx, '/test/fixtures/user.json')
    })

    request(app.listen())
    .get('/')
    .expect('Last-Modified', /GMT/)
    .end(done)
  })

  describe('with setHeaders', function () {
    it('throws if setHeaders is not a function', function (done) {
      const app = new Koa()

      app.use(async (ctx) => {
        await send(ctx, '/test/fixtures/user.json', {
          setHeaders: 'foo'
        })
      })

      request(app.listen())
      .get('/')
      .expect(500)
      .end(done)
    })

    it('should not edit already set headers', function (done) {
      const app = new Koa()

      const testFilePath = '/test/fixtures/user.json'
      const normalizedTestFilePath = path.normalize(testFilePath)

      app.use(async (ctx) => {
        await send(ctx, testFilePath, {
          setHeaders: function (res, path, stats) {
            assert.equal(path.substr(-normalizedTestFilePath.length), normalizedTestFilePath)
            assert.equal(stats.size, 18)
            assert(res)

            // these can be set
            res.setHeader('Cache-Control', 'max-age=0,must-revalidate')
            res.setHeader('Last-Modified', 'foo')
            // this one can not
            res.setHeader('Content-Length', 9000)
          }
        })
      })

      request(app.listen())
      .get('/')
      .expect(200)
      .expect('Cache-Control', 'max-age=0,must-revalidate')
      .expect('Last-Modified', 'foo')
      .expect('Content-Length', '18')
      .end(done)
    })

    it('should correctly pass through regarding usual headers', function (done) {
      const app = new Koa()

      app.use(async (ctx) => {
        await send(ctx, '/test/fixtures/user.json', {
          setHeaders: () => {}
        })
      })

      request(app.listen())
      .get('/')
      .expect(200)
      .expect('Cache-Control', 'max-age=0')
      .expect('Content-Length', '18')
      .expect('Last-Modified', /GMT/)
      .end(done)
    })
  })

  it('should cleanup on socket error', function (done) {
    const app = new Koa()
    var stream

    app.use(async (ctx) => {
      await send(ctx, '/test/fixtures/user.json')
      stream = ctx.body
      ctx.socket.emit('error', new Error('boom'))
    })

    request(app.listen())
    .get('/')
    .expect(500, function (err) {
      assert.ok(err)
      assert.ok(stream.destroyed)
      done()
    })
  })
})
