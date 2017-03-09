var http = require('http');
var fs = require('fs');
var live = require('./Live/live.js');
var path = require('path');

http.createServer((req, resp) => {
    console.log(req.url);
    if (req.url == '/') req.url = '/Live/live.html';
    if (req.url == '/Live/livestart') return startLive();
    if (req.url == '/Live/livestop') return stoplive();
    return readFile(req.url);

    function readFile(url) {
        var fpath = path.join(__dirname, url);
        if (!fs.existsSync(fpath)) return handle404();
        var rs = fs.createReadStream(fpath);
        rs.pipe(resp);
    }

    function handle404() {
        resp.statusCode = 404;
        resp.end();
    }

    function startLive() {
        live.startLive();
        resp.end('ok');
    }

    function stoplive(){
        live.stopLive();
        resp.end('ok');
    }
}).listen(8000);

console.log('server listen on 8000');