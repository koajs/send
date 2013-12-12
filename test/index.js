
var request = require('supertest');
var send = require('..');
var koa = require('koa');

describe('send(ctx, file)', function(){
  describe('with no .root', function(){
    describe('when the path is absolute', function(){
      it('should serve the file', function(done){
        var app = koa();

        app.use(function *(){
          yield send(this, __dirname + '/fixtures/hello.txt');
        });

        request(app.listen())
        .get('/')
        .expect(200)
        .expect('world', done);
      })
    })

    describe('when the path is relative', function(){
      it('should 500', function(done){
        var app = koa();

        app.use(function *(){
          yield send(this, 'test/fixtures/hello.txt');
        });

        request(app.listen())
        .get('/')
        .expect(500, done);
      })
    })

    describe('when the path contains ..', function(){
      it('should 400', function(done){
        var app = koa();

        app.use(function *(){
          yield send(this, __dirname + '/../fixtures/hello.txt');
        });

        request(app.listen())
        .get('/')
        .expect(400, done);
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
      it('should 400', function(done){
        var app = koa();

        app.use(function *(){
          var opts = { root: 'test/fixtures' };
          yield send(this, '../../package.json', opts);
        });

        request(app.listen())
        .get('/')
        .expect(400, done);
      })
    })

    describe('when the path resolves within root', function(){
      it('should 400', function(done){
        var app = koa();

        app.use(function *(){
          var opts = { root: 'test/fixtures' };
          yield send(this, '../../test/fixtures/world/index.html', opts);
        });

        request(app.listen())
        .get('/')
        .expect(200)
        .expect('html index', done);
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
        yield send(this, __dirname + '/test');
      });

      request(app.listen())
      .get('/')
      .expect(404, done);
    })
  })

  it('should set the Content-Type', function(done){
    var app = koa();

    app.use(function *(){
      yield send(this, __dirname + '/fixtures/user.json');
    });

    request(app.listen())
    .get('/')
    .expect('Content-Type', 'application/json')
    .end(done);
  })
})