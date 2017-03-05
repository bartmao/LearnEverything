var http = require('http');
var fs = require('fs');
var live = require('./Live/live.js');

http.createServer((req, resp) => {
    console.log(req.url);
    if (req.url == '/') req.url = '/Live/live.html';
    if (req.url == '/Live/livestart') return startLive();
    if (req.url == '/Live/livetime') return getlivetime();
    return readFile(req.url);

    function readFile(url) {
        var path = __dirname + url;
        if (!fs.existsSync(path)) return handle404();
        var rs = fs.createReadStream(path);
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

    function getlivetime(){
        resp.end(live.liveTime());
    }
}).listen(8000);

console.log('server listen on 8000');