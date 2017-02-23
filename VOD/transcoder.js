var fs = require('fs');
var config = require('./config');

function start(file){
    // Check file exist
    if(!fs.statSync(file).isFile()){
        console.error('Not file or file not exist');
        return;
    }


}

module.exports.start = start;