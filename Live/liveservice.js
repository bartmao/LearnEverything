var live = require('live');
var eventbus = require('eventbus');
var fs = require('fs');
var path = require('path');

function liveservice(req, resp) {
    function startLive() {
        live.startLive();
        resp.end('ok');
    }

    function stoplive() {
        live.stopLive();
        resp.end('ok');
    }

    function getInitChuck() {
        var chuckname = 's_init.mp4';
        if (live.initialled)
            pipe(chuckname);
        else
            eventbus.on('LiveInitialled', function () { pipe(chuckname); });
    }

    function getLastestChuck() {
        
    }

    function pipe(fn) {
        var file = path.join(live.workingpath, 's_init.mp4')
        fs.exists(file, exists => {
            if (exists)
                fs.createReadStream(file).pipe(resp);
        });
    }
}

module.exports = liveservice;