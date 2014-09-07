1.2.5 / 2014-09-07
==================

 * add: automatically serve `.gz` version when possible

1.2.4 / 2014-06-23
==================

 * dependencies bump
 * fix: should set the Content-Type test

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
