import path from 'node:path';

import Koa from 'koa';
import request from 'supertest';
import { decompress } from 'brotli';

import { send } from '../src';

describe('send(ctx, file)', () => {
  let server: ReturnType<InstanceType<typeof Koa>['listen']>;

  afterEach(() => {
    server?.close?.();
  });

  describe('with no .root', () => {
    describe('when the path is absolute', () => {
      it('should 404', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, path.join(__dirname, '/fixtures/hello.txt'));
        });

        server = app.listen();
        await request(server).get('/').expect(404);
      });

      it('should throw 404 error', async () => {
        const app = new Koa();

        // @ts-ignore
        let error;
        app.use(async (ctx) => {
          try {
            await send(ctx, path.join(__dirname, '/fixtures/hello.txt'));
          } catch (err) {
            error = err;
          }
        });

        server = app.listen();
        await request(server).get('/').expect(404);
        // @ts-ignore
        expect(error.status).toBe(404);
      });
    });

    describe('when the path is relative', () => {
      it('should 200', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/hello.txt');
        });

        server = app.listen();
        await request(server).get('/').expect(200).expect('world');
      });
    });

    describe('when the path contains ..', () => {
      it('should 403', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, '/../fixtures/hello.txt');
        });

        server = app.listen();
        await request(server).get('/').expect(403);
      });
    });
  });

  describe('with .root', () => {
    describe('when the path is absolute', () => {
      it('should 404', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          const opts = { root: 'test/fixtures' };
          await send(ctx, path.join(__dirname, '/fixtures/hello.txt'), opts);
        });

        server = app.listen();
        await request(server).get('/').expect(404);
      });
    });

    describe('when the path is relative and exists', () => {
      it('should serve the file', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          const opts = { root: 'test/fixtures' };
          await send(ctx, 'hello.txt', opts);
        });

        server = app.listen();
        await request(server).get('/').expect(200).expect('world');
      });
    });

    describe('when the path is relative and does not exist', () => {
      it('should 404', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          const opts = { root: 'test/fixtures' };
          await send(ctx, 'something', opts);
        });

        server = app.listen();
        await request(server).get('/').expect(404);
      });
    });

    describe('when the path resolves above the root', () => {
      it('should 403', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          const opts = { root: 'test/fixtures' };
          await send(ctx, '../../package.json', opts);
        });

        server = app.listen();
        await request(server).get('/').expect(403);
      });
    });

    describe('when the path resolves within root', () => {
      it('should 403', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          const opts = { root: 'test/fixtures' };
          await send(ctx, '../../test/fixtures/world/index.html', opts);
        });

        server = app.listen();
        await request(server).get('/').expect(403);
      });
    });
  });

  describe('with .index', () => {
    describe('when the index file is present', () => {
      it('should serve it', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          const opts = { root: 'test', index: 'index.html' };
          await send(ctx, 'fixtures/world/', opts);
        });

        server = app.listen();
        await request(server).get('/').expect(200).expect('html index');
      });

      it('should serve it', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          const opts = { root: 'test/fixtures/world', index: 'index.html' };
          await send(ctx, ctx.path, opts);
        });

        server = app.listen();
        await request(server).get('/').expect(200).expect('html index');
      });
    });
  });

  describe('when path is not a file', () => {
    it('should 404', async () => {
      const app = new Koa();

      app.use(async (ctx) => {
        await send(ctx, '/test');
      });

      server = app.listen();
      await request(server).get('/').expect(404);
    });

    it('should return undefined if format is set to false', async () => {
      const app = new Koa();

      app.use(async (ctx) => {
        const sent = await send(ctx, '/test', { format: false });
        expect(sent).toBeUndefined();
      });

      server = app.listen();
      await request(server).get('/').expect(404);
    });
  });

  describe('when path is a directory', () => {
    it('should 404', async () => {
      const app = new Koa();

      app.use(async (ctx) => {
        await send(ctx, '/test/fixtures');
      });

      server = app.listen();
      await request(server).get('/').expect(404);
    });
  });

  describe('when path does not finish with slash and format is disabled', () => {
    it('should 404', async () => {
      const app = new Koa();

      app.use(async (ctx) => {
        const opts = { root: 'test', index: 'index.html', format: false };
        await send(ctx, 'fixtures/world', opts);
      });

      server = app.listen();
      await request(server).get('/world').expect(404);
    });

    it('should 404', async () => {
      const app = new Koa();

      app.use(async (ctx) => {
        const opts = { root: 'test', index: 'index.html', format: false };
        await send(ctx, 'fixtures/world', opts);
      });

      server = app.listen();
      await request(server).get('/world').expect(404);
    });
  });

  describe('when path does not finish with slash and format is enabled', () => {
    it('should 200', async () => {
      const app = new Koa();

      app.use(async (ctx) => {
        const opts = { root: 'test', index: 'index.html' };
        await send(ctx, 'fixtures/world', opts);
      });

      server = app.listen();
      await request(server)
        .get('/')
        .expect('content-type', 'text/html; charset=utf-8')
        .expect('content-length', '10')
        .expect(200);
    });

    it('should 404 if no index', async () => {
      const app = new Koa();

      app.use(async (ctx) => {
        const opts = { root: 'test' };
        await send(ctx, 'fixtures/world', opts);
      });

      server = app.listen();
      await request(server).get('/').expect(404);
    });
  });

  describe('when path is malformed', () => {
    it('should 400', async () => {
      const app = new Koa();

      app.use(async (ctx) => {
        await send(ctx, '/%');
      });

      server = app.listen();
      await request(server).get('/').expect(400);
    });
  });

  describe('when path is a file', () => {
    it('should return the path', async () => {
      const app = new Koa();

      app.use(async (ctx) => {
        const p = '/test/fixtures/user.json';
        const sent = await send(ctx, p);
        expect(sent).toBe(path.join(__dirname, '/fixtures/user.json'));
      });

      server = app.listen();
      await request(server).get('/').expect(200);
    });

    describe('or .gz version when requested and if possible', () => {
      it('should return path', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, '/test/fixtures/gzip.json');
        });

        server = app.listen();
        await request(server)
          .get('/')
          .set('Accept-Encoding', 'deflate, identity')
          .expect('Content-Length', '18')
          .expect('{ "name": "tobi" }')
          .expect(200);
      });

      it('should return .gz path (gzip option defaults to true)', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, '/test/fixtures/gzip.json');
        });

        server = app.listen();
        await request(server)
          .get('/')
          .set('Accept-Encoding', 'gzip, deflate, identity')
          .expect('Content-Length', '48')
          .expect('{ "name": "tobi" }')
          .expect(200);
      });

      it('should return .gz path when gzip option is turned on', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, '/test/fixtures/gzip.json', { gzip: true });
        });

        server = app.listen();
        await request(server)
          .get('/')
          .set('Accept-Encoding', 'gzip, deflate, identity')
          .expect('Content-Length', '48')
          .expect('{ "name": "tobi" }')
          .expect(200);
      });

      it('should not return .gz path when gzip option is false', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, '/test/fixtures/gzip.json', { gzip: false });
        });

        server = app.listen();
        await request(server)
          .get('/')
          .set('Accept-Encoding', 'gzip, deflate, identity')
          .expect('Content-Length', '18')
          .expect('{ "name": "tobi" }')
          .expect(200);
      });
    });

    describe('or .br version when requested and if possible', () => {
      function parser(res: request.Response, cb: Function) {
        const chunks: Uint8Array[] = [];
        res.on('data', (chunk: Uint8Array) => {
          chunks.push(chunk);
        });
        res.on('end', () => {
          const data = decompress(Buffer.concat(chunks));
          cb(null, Buffer.from(data.buffer).toString());
        });
      }

      it('should return path', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, '/test/fixtures/gzip.json');
        });

        server = app.listen();
        await request(server)
          .get('/')
          .set('Accept-Encoding', 'deflate, identity')
          .expect('Content-Length', '18')
          .expect('{ "name": "tobi" }')
          .expect(200);
      });

      it('should return .br path (brotli option defaults to true)', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, '/test/fixtures/gzip.json');
        });

        server = app.listen();
        const response = await request(server)
          .get('/')
          .parse(parser)
          .set('Accept-Encoding', 'br, deflate, identity')
          .expect('Content-Length', '22')
          .expect(200);
        expect(response.body).toEqual('{ "name": "tobi" }');
      });

      it('should return .br path when brotli option is turned on', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, '/test/fixtures/gzip.json', { brotli: true });
        });

        server = app.listen();
        const response = await request(server)
          .get('/')
          .parse(parser)
          .set('Accept-Encoding', 'br, deflate, identity')
          .expect('Content-Length', '22')
          .expect(200);

        expect(response.body).toEqual('{ "name": "tobi" }');
      });

      it('should not return .br path when brotli option is false', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, '/test/fixtures/gzip.json', { brotli: false });
        });

        server = app.listen();
        await request(server)
          .get('/')
          .set('Accept-Encoding', 'br, deflate, identity')
          .expect('Content-Length', '18')
          .expect('{ "name": "tobi" }')
          .expect(200);
      });

      it('should return .gz path when brotli option is turned off', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, '/test/fixtures/gzip.json', { brotli: false });
        });

        server = app.listen();
        await request(server)
          .get('/')
          .set('Accept-Encoding', 'br, gzip, deflate, identity')
          .expect('Content-Length', '48')
          .expect('{ "name": "tobi" }')
          .expect(200);
      });
    });

    describe('and max age is specified', () => {
      it('should set max-age in seconds', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          const p = '/test/fixtures/user.json';
          const sent = await send(ctx, p, { maxage: 5000 });
          expect(sent).toBe(path.join(__dirname, '/fixtures/user.json'));
        });

        server = app.listen();
        await request(server)
          .get('/')
          .expect('Cache-Control', 'max-age=5')
          .expect(200);
      });

      it('should truncate fractional values for max-age', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          const p = '/test/fixtures/user.json';
          const sent = await send(ctx, p, { maxage: 1234 });
          expect(sent).toBe(path.join(__dirname, '/fixtures/user.json'));
        });

        server = app.listen();
        await request(server)
          .get('/')
          .expect('Cache-Control', 'max-age=1')
          .expect(200);
      });
    });

    describe('and immutable is specified', () => {
      it('should set the immutable directive', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          const p = '/test/fixtures/user.json';
          const sent = await send(ctx, p, {
            immutable: true,
            maxage: 31536000000,
          });
          expect(sent).toBe(path.join(__dirname, '/fixtures/user.json'));
        });

        server = app.listen();
        await request(server)
          .get('/')
          .expect('Cache-Control', 'max-age=31536000,immutable')
          .expect(200);
      });
    });
  });

  describe('.immutable option', () => {
    describe('when trying to get a non-existent file', () => {
      it('should not set the Cache-Control header', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/does-not-exist.json', {
            immutable: true,
          });
        });

        server = app.listen();
        await request(server)
          .get('/')
          .expect((res) => {
            expect(res.header['cache-control']).toBeUndefined();
          })
          .expect(404);
      });
    });
  });

  describe('.hidden option', () => {
    describe('when trying to get a hidden file', () => {
      it('should 404', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/.hidden');
        });

        server = app.listen();
        await request(server).get('/').expect(404);
      });
    });

    describe('when trying to get a file from a hidden directory', () => {
      it('should 404', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/.private/id_rsa.txt');
        });

        server = app.listen();
        await request(server).get('/').expect(404);
      });
    });

    describe('when trying to get a hidden file and .hidden check is turned off', () => {
      it('should 200', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/.hidden', { hidden: true });
        });

        server = app.listen();
        await request(server).get('/').expect(200);
      });
    });
  });

  describe('.extensions option', () => {
    describe('when trying to get a file without extension with no .extensions sufficed', () => {
      it('should 404', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/hello');
        });

        server = app.listen();
        await request(server).get('/').expect(404);
      });
    });

    describe('when trying to get a file without extension with no matching .extensions', () => {
      it('should 404', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/hello', {
            extensions: ['json', 'htm', 'html'],
          });
        });

        server = app.listen();
        await request(server).get('/').expect(404);
      });
    });

    describe('when trying to get a file without extension with non array .extensions', () => {
      it('should 404', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/hello', { extensions: {} as any });
        });

        server = app.listen();
        await request(server).get('/').expect(404);
      });
    });

    describe('when trying to get a file without extension with non string array .extensions', () => {
      it('throws if extensions is not array of strings', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/hello', {
            extensions: [2, {}, []] as any,
          });
        });

        server = app.listen();
        await request(server).get('/').expect(500);
      });
    });

    describe('when trying to get a file without extension with matching .extensions sufficed first matched should be sent', () => {
      it('should 200 and application/json', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/user', {
            extensions: ['html', 'json', 'txt'],
          });
        });

        server = app.listen();
        await request(server)
          .get('/')
          .expect(200)
          .expect('Content-Type', /application\/json/);
      });
    });

    describe('when trying to get a file without extension with matching .extensions sufficed', () => {
      it('should 200', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/hello', { extensions: ['txt'] });
        });

        server = app.listen();
        await request(server).get('/').expect(200);
      });
    });

    describe('when trying to get a file without extension with matching doted .extensions sufficed', () => {
      it('should 200', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/hello', { extensions: ['.txt'] });
        });

        server = app.listen();
        await request(server).get('/').expect(200);
      });
    });

    describe('when trying to get a file without extension with matching .extensions sufficed with other dots in path', () => {
      it('should 200', async () => {
        const app = new Koa();

        app.use(async (ctx) => {
          await send(ctx, 'test/fixtures/some.path/index', {
            extensions: ['json'],
          });
        });

        server = app.listen();
        await request(server).get('/').expect(200);
      });
    });
  });

  it('should set the Content-Type', async () => {
    const app = new Koa();

    app.use(async (ctx) => {
      await send(ctx, '/test/fixtures/user.json');
    });

    server = app.listen();
    await request(server)
      .get('/')
      .expect('Content-Type', /application\/json/);
  });

  it('should set the Content-Length', async () => {
    const app = new Koa();

    app.use(async (ctx) => {
      await send(ctx, '/test/fixtures/user.json');
    });

    server = app.listen();
    await request(server).get('/').expect('Content-Length', '18');
  });

  it('should set the Content-Type', async () => {
    const app = new Koa();

    const testFilePath = path.normalize('/test/fixtures/world/index.html');

    app.use(async (ctx) => {
      ctx.type = 'text/plain';
      await send(ctx, testFilePath);
    });

    server = app.listen();
    await request(server)
      .get('/')
      .expect('Content-Type', /text\/plain/);
  });

  it('should set Last-Modified', async () => {
    const app = new Koa();

    app.use(async (ctx) => {
      await send(ctx, '/test/fixtures/user.json');
    });

    server = app.listen();
    await request(server).get('/').expect('Last-Modified', /GMT/);
  });

  describe('with setHeaders', () => {
    it('throws if setHeaders is not a function', async () => {
      const app = new Koa();

      app.use(async (ctx) => {
        await send(ctx, '/test/fixtures/user.json', {
          setHeaders: 'foo' as any,
        });
      });

      server = app.listen();
      await request(server).get('/').expect(500);
    });

    it('should not edit already set headers', async () => {
      const app = new Koa();

      const testFilePath = '/test/fixtures/user.json';
      const normalizedTestFilePath = path.normalize(testFilePath);

      app.use(async (ctx) => {
        await send(ctx, testFilePath, {
          setHeaders: function (res, path, stats) {
            expect(path.slice(-normalizedTestFilePath.length)).toBe(
              normalizedTestFilePath
            );
            expect(stats.size).toBe(18);
            expect(res).toBeTruthy();

            // these can be set
            res.setHeader('Cache-Control', 'max-age=0,must-revalidate');
            res.setHeader('Last-Modified', 'foo');
            // this one can not
            res.setHeader('Content-Length', 9000);
          },
        });
      });

      server = app.listen();
      await request(server)
        .get('/')
        .expect(200)
        .expect('Cache-Control', 'max-age=0,must-revalidate')
        .expect('Last-Modified', 'foo')
        .expect('Content-Length', '18');
    });

    it('should correctly pass through regarding usual headers', async () => {
      const app = new Koa();

      app.use(async (ctx) => {
        await send(ctx, '/test/fixtures/user.json', {
          setHeaders: () => {},
        });
      });

      server = app.listen();
      await request(server)
        .get('/')
        .expect(200)
        .expect('Cache-Control', 'max-age=0')
        .expect('Content-Length', '18')
        .expect('Last-Modified', /GMT/);
    });
  });

  it('should cleanup on socket error', async () => {
    const app = new Koa();
    // @ts-ignore
    let stream;

    app.use(async (ctx) => {
      await send(ctx, '/test/fixtures/user.json');
      stream = ctx.body;
      ctx.socket.emit('error', new Error('boom'));
    });

    try {
      server = app.listen();
      await request(server).get('/');
    } catch (error) {
      expect(error).toBeTruthy();
      // @ts-ignore
      expect(stream.destroyed).toBeTruthy();
    }
  });
});
