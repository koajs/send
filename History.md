
1.3.2 / 2018-09-12
==================

**others**
  * [[`47b26c9`](http://github.com/koajs/send/commit/47b26c908d56506e3b093ab64336a34fc60dd69c)] - deps: pin debug@2 (#110) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`e86357b`](http://github.com/koajs/send/commit/e86357b061ac7ccb810a0b209cd035e6867f478a)] - 1.3.1 (Jonathan Ong <<jonathanrichardong@gmail.com>>),

1.3.0 / 2014-09-07
==================

 * add automatically check and serve `.gz` files
 * remove `finished` dependency
 * refactor with `mz`
 
1.2.3 / 2014-02-11
==================

 * fix malicious path in windows
 * update finished
 * make assert message better

1.2.2 / 2014-01-07
==================

 * fix: ignore directories instead of crashing koa

1.2.1 / 2014-01-02
==================

 * add `content-length` header

1.2.0 / 2013-12-27
==================

 * add `maxage` option

1.1.2 / 2013-12-22
==================

 * replace deprecated ctx.error() with ctx.throw()

1.1.1 / 2013-12-20
==================

 * use: on-socket-error

1.1.0 / 2013-12-19
==================

 * add: `send` now returns the file path if sent
 * add: destroy streams on socket errors to prevent fd leaks
