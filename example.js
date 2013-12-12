
var send = require('./');
var koa = require('koa');
var app = koa();

// $ GET /package.json
// $ GET /

app.use(function *(){
  if ('/' == this.path) return this.body = 'Try GET /package.json';
  yield send(this, this.path, { root: __dirname });
})

app.listen(3000);
console.log('listening on port 3000');