var test = require('tap').test;
var lib = require('../');
var fixture = require(__dirname + '/fixture.json');
var expect = require('fs').readFileSync(__dirname + '/fixture.txt', 'utf8').trim();

test('npm-tree', function (t) {
  t.equal(lib(fixture).trim(), expect, 'matches');
  t.end();
});