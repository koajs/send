'use strict';

var request = require('supertest');
var koa = require('koa');
var send = require('../../');

describe('asyncAwait support with koa experimental', function(){
    it('should 200', function(done){
        var app = koa();

        app.experimental = true;

        app.use(async function(){
            var ctx  = this;
            await send(ctx, 'test/fixtures/hello.txt');
        });

        request(app.listen())
        .get('/')
        .expect(200)
        .expect('world', done);
    });
});
