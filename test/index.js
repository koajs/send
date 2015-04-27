
var request = require('supertest');
var send = require('..');
var koa = require('koa');
var assert = require('assert');
var fs = require('fs');

describe('send(ctx, file)', function(){
  describe('with no .root', function(){
    describe('when the path is absolute', function(){
      it('should 404', function(done){
        var app = koa();

        app.use(function *(){
          yield send(this, __dirname + '/fixtures/hello.txt');
        });

        request(app.listen())
        .get('/')
        .expect(404, done);
      })
    })

    describe('when the path is relative', function(){
      it('should 200', function(done){
        var app = koa();

        app.use(function *(){
          yield send(this, 'test/fixtures/hello.txt');
        });

        request(app.listen())
        .get('/')
        .expect(200)
        .expect('world', done);
      })
    })

    describe('when the path contains ..', function(){
      it('should 403', function(done){
        var app = koa();

        app.use(function *(){
          yield send(this, '/../fixtures/hello.txt');
        });

        request(app.listen())
        .get('/')
        .expect(403, done);
      })
    })
  })

  describe('with .root', function(){
    describe('when the path is absolute', function(){
      it('should 404', function(done){
        var app = koa();

        app.use(function *(){
          var opts = { root: 'test/fixtures' };
          yield send(this, __dirname + '/fixtures/hello.txt', opts);
        });

        request(app.listen())
        .get('/')
        .expect(404, done);
      })
    })

    describe('when the path is relative and exists', function(){
      it('should serve the file', function(done){
        var app = koa();

        app.use(function *(){
          var opts = { root: 'test/fixtures' };
          yield send(this, 'hello.txt', opts);
        });

        request(app.listen())
        .get('/')
        .expect(200)
        .expect('world', done);
      })
    })

    describe('when the path is relative and does not exist', function(){
      it('should 404', function(done){
        var app = koa();

        app.use(function *(){
          var opts = { root: 'test/fixtures' };
          yield send(this, 'something', opts);
        });

        request(app.listen())
        .get('/')
        .expect(404, done);
      })
    })

    describe('when the path resolves above the root', function(){
      it('should 403', function(done){
        var app = koa();

        app.use(function *(){
          var opts = { root: 'test/fixtures' };
          yield send(this, '../../package.json', opts);
        });

        request(app.listen())
        .get('/')
        .expect(403, done);
      })
    })

    describe('when the path resolves within root', function(){
      it('should 403', function(done){
        var app = koa();

        app.use(function *(){
          var opts = { root: 'test/fixtures' };
          yield send(this, '../../test/fixtures/world/index.html', opts);
        });

        request(app.listen())
        .get('/')
        .expect(403, done);
      })
    })
  })

  describe('with .index', function(){
    describe('when the index file is present', function(){
      it('should serve it', function(done){
        var app = koa();

        app.use(function *(){
          var opts = { root: 'test', index: 'index.html' };
          yield send(this, 'fixtures/world/', opts);
        });

        request(app.listen())
        .get('/')
        .expect(200)
        .expect('html index', done);
      })
    })
  })

  describe('when path is not a file', function(){
    it('should 404', function(done){
      var app = koa();

      app.use(function *(){
        yield send(this, '/test');
      });

      request(app.listen())
      .get('/')
      .expect(404, done);
    })

    it('should return undefined', function(done){
      var app = koa();

      app.use(function *(){
        var sent = yield send(this, '/test');
        assert.equal(sent, undefined);
      });

      request(app.listen())
      .get('/')
      .expect(404, done);
    })
  })

  describe('when path is a directory', function(){
    it('should 404', function(done){
      var app = koa();

      app.use(function *(){
        yield send(this, '/test/fixtures');
      });

      request(app.listen())
      .get('/')
      .expect(404, done);
    })
  })

  describe('when path is malformed', function(){
    it('should 400', function(done){
      var app = koa();

      app.use(function *(){
        yield send(this, '/%');
      });

      request(app.listen())
      .get('/')
      .expect(400, done);
    })
  })

  describe('when path is a file', function(){

    it('should return the path', function(done){
      var app = koa();

      app.use(function *(){
        var p = '/test/fixtures/user.json';
        var sent = yield send(this, p);
        assert.equal(sent, __dirname + '/fixtures/user.json');
      });

      request(app.listen())
      .get('/')
      .expect(200, done);
    })

    describe('or .gz version when requested and if possible', function(){
      it('should return path', function(done){
        var app = koa();

        app.use(function *(){
          yield send(this, '/test/fixtures/gzip.json');
        });

        request(app.listen())
        .get('/')
        .set('Accept-Encoding', 'deflate, identity')
        .expect('Content-Length', 18)
        .expect('{ "name": "tobi" }')
        .expect(200, done);
      })

      it('should return .gz path (gzip option defaults to true)', function(done){
        var app = koa();

        app.use(function *(){
          yield send(this, '/test/fixtures/gzip.json');
        });

        request(app.listen())
        .get('/')
        .set('Accept-Encoding', 'gzip, deflate, identity')
        .expect('Content-Length', 48)
        .expect('{ "name": "tobi" }')
        .expect(200, done);
      })

      it('should return .gz path when gzip option is turned on', function(done){
        var app = koa();

        app.use(function *(){
          yield send(this, '/test/fixtures/gzip.json', { gzip: true });
        });

        request(app.listen())
        .get('/')
        .set('Accept-Encoding', 'gzip, deflate, identity')
        .expect('Content-Length', 48)
        .expect('{ "name": "tobi" }')
        .expect(200, done);
      })

      it('should not return .gz path when gzip option is false', function(done){
        var app = koa();

        app.use(function *(){
          yield send(this, '/test/fixtures/gzip.json', { gzip: false });
        });

        request(app.listen())
        .get('/')
        .set('Accept-Encoding', 'gzip, deflate, identity')
        .expect('Content-Length', 18)
        .expect('{ "name": "tobi" }')
        .expect(200, done);
      })
    })

    describe('and If-Modified-Since is given', function(){

      var path = '/user.json';
      var mtime;
      before(function(done){
        fs.stat(__dirname + '/fixtures' + path, function(err, stats) {
          mtime = stats.mtime;
          done(err);
        });
      });

      function testWithTime(time) {
        var app = koa();

        app.use(function *(){
          var sent = yield send(this, path, { root: __dirname + "/fixtures" });
          assert.equal(sent, __dirname + '/fixtures/user.json');
        });

        return request(app.listen())
          .get('/')
        // Dates specified by 7231 is of second resolution
          .set('If-Modified-Since', time)
          .expect('Last-Modified', mtime.toUTCString());
      }

      describe('a valid date', function(){
        it('should 304 if not changed', function(done){
          testWithTime((new Date(mtime.getTime()+1000)).toUTCString())
            .expect(304, done);
        })

        it('should serve current version if changed', function(done){
          testWithTime((new Date(mtime.getTime()-1000)).toUTCString())
            .expect(200, done);
        })
      })

      describe('an invalid date', function() {
        it('should continue serving', function(done){
          testWithTime('koa')
            .expect(200, done);
        })
      })
    })

    describe('and max age is specified', function(){
      it('should set max-age in seconds', function(done){
        var app = koa();

        app.use(function *(){
          var p = '/test/fixtures/user.json';
          var sent = yield send(this, p, { maxage: 5000 });
          assert.equal(sent, __dirname + '/fixtures/user.json');
        });

        request(app.listen())
        .get('/')
        .expect('Cache-Control','max-age=5')
        .expect(200, done);
      })

      it('should truncate fractional values for max-age', function(done){
        var app = koa();

        app.use(function *(){
          var p = '/test/fixtures/user.json';
          var sent = yield send(this, p, { maxage: 1234 });
          assert.equal(sent, __dirname + '/fixtures/user.json');
        });

        request(app.listen())
        .get('/')
        .expect('Cache-Control','max-age=1')
        .expect(200, done);
      })
    })
  })

  it('should set the Content-Type', function(done){
    var app = koa();

    app.use(function *(){
      yield send(this, '/test/fixtures/user.json');
    });

    request(app.listen())
    .get('/')
    .expect('Content-Type', /application\/json/)
    .end(done);
  })

  it('should set the Content-Length', function(done){
    var app = koa();

    app.use(function *(){
      yield send(this, '/test/fixtures/user.json');
    });

    request(app.listen())
    .get('/')
    .expect('Content-Length', '18')
    .end(done);
  })

  it('should cleanup on socket error', function(done){
    var app = koa();
    var stream

    app.use(function *(){
      yield send(this, '/test/fixtures/user.json');
      stream = this.body;
      this.socket.emit('error', new Error('boom'));
    })

    request(app.listen())
    .get('/')
    .expect(500, function(err){
      err.should.be.ok;
      stream.destroyed.should.be.ok;
      done();
    })
  })
})
