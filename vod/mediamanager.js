var fs = require('fs');
var path = require('path');
var config = require('./config.json');

function locateFile(fileName) {
    var dirs = config.dirs;
    var fpath;
    dirs.forEach(function (dir) {
        if (fpath) return false;
        var files = fs.readdirSync(dir);
        files.forEach(function (f) {
            var finfo = path.parse(f);
            if (fileName == finfo.name && config.filters.indexOf(finfo.ext) != -1) {
                fpath = path.join(dir, f);
                return false;
            }
        }, this);
    }, this);

    return fpath;
}

module.exports.locateFile = locateFile;