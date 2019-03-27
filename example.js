
const send = require('./')
const Koa = require('koa')
const app = new Koa()

// $ GET /package.json
// $ GET /

app.use(async (ctx) => {
  if (ctx.path === '/') {
    ctx.body = 'Try GET /package.json'
    return
  }
  await send(ctx, ctx.path, { root: __dirname, range: true })
})

app.listen(3000)
console.log('listening on port 3000')
