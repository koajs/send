2.0.1 / 2015-10-14
==================

 * fix judgement of trailing slash

2.0.0 / 2015-10-14
==================

 * serve directories without a trailing slash, closes #27
 * when .hidden option is set, also check hidden directories, closes #17
 * bump deps: mz@2, mocha@2, koa@1
 * use resolve-path, closes #9
 * gzip version of file should not be automatically sent
 * fix test: gzip.json.gz is not valid json data

1.3.1 / 2014-09-08
==================

 * add .maxAge alias

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
