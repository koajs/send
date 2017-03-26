
const send = require('./');
const Koa = require('koa');
const app = new Koa();

// $ GET /package.json
// $ GET /

app.use(async (ctx) => {
  if ('/' == ctx.path) return ctx.body = 'Try GET /package.json';
  await send(ctx, ctx.path, { root: __dirname });
})

app.listen(3000);
console.log('listening on port 3000');