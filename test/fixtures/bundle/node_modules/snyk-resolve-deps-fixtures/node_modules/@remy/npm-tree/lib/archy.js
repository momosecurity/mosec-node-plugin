module.exports = makeArchy;

var archy = require('archy');
var colour = require('ansicolors');
var ext = colour.bgBlack(colour.green('extraneous'));

function makeArchy(data) {
  return archy(walkDepTree(data, null, function (leaf) {
    var label = leaf.data.name;
    if (leaf.data.version) {
      label += '@' + leaf.data.version;
    }

    // if (leaf.data.license) {
    //   // label += ' (' + leaf.data.license + ')';
    // }

    if (leaf.data.extraneous) {
      label += ' ' + ext;
    }

    if (leaf.deps) {
      return {
        label: label,
        nodes: leaf.deps,
      };
    } else {
      return label;
    }
  }));
}

function walkDepTree(data, parent, fn) {
  var deps = null;

  if (!data.parent) {
    data.parent = [];
  }

  if (parent) {
    data.parent.push({
      name: parent.name,
      version: parent.version,
    });
  }

  if (data.dependencies) {
    deps = Object.keys(data.dependencies).map(function (module) {
      var dep = data.dependencies[module];
      return walkDepTree({
        dependencies: dep.dependencies,
        version: dep.version,
        name: module,
        license: dep.license,
        extraneous: dep.extraneous,
      }, data, fn);
    });
  }

  return fn({
    data: data,
    deps: deps,
  });
}
