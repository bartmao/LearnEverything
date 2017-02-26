var fs = require('fs');
var config = require('./config');

function service(req, resp, r) {
    var action = r[2];
    var fns = [];

    var list = function getAvailMedias() {
        var dirs = config.dirs;
        var fns = [];
        dirs.forEach(function (dir) {
            fns.push(fs.readdirSync(dir).filter(v => config.filters.indexOf(v.substring(v.lastIndexOf('.'))) != -1).map(v => v.substring(0, v.lastIndexOf('.'))));
        }, this);

        resp.end(fns.join(','));
        return true;
    };
    fns.push('list');

    if (fns.indexOf(action) != -1) return eval(action + '()');
    return false;
}

module.exports = service;