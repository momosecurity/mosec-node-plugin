#!/usr/bin/env node

let resolve = require('../dist/deps');

function main() {
  let target = process.argv[2];

  resolve(target).then(function (result) {
    console.log(JSON.stringify(result, null, 2));
  }).catch(function (error) {
    console.log('Error:', error.stack);
  });

};

main();
