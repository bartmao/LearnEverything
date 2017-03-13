var http = require('http');
var fs = require('fs');
var path = require('path');
var liveservice = require('./live/liveservice');
var live = require('./live/live');

http.createServer((req, resp) => {
    console.log(req.url);
    if(req.url == '/') req.url = '/live/live.html';
    req.url = req.url.toLowerCase();
    if(allowMimeTypes()) return handleStatics();
    else if (req.url.startsWith('/live')) return new liveservice(req, resp).process();
    
    return handle404();

    function handleStatics(){
        readFile(req.url);
    }

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

    function allowMimeTypes(){
        if(req.url.indexOf('?') > -1){
            return req.url.substring(0, req.url.indexOf('?')).match(/[^?]+(html|js|css|jpg|mp4|m4s)$/) != null;
        }
        
        return req.url.match(/[^?]+(html|js|css|jpg|mp4|m4s)$/) != null;
    }
}).listen(8000);

console.log('server listen on 8000');