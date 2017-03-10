var live = require('./live');
var eventbus = require('../eventbus');
var fs = require('fs');
var path = require('path');
var url = require('url');

function liveservice(req, resp) {
    this.startlive = startLive;
    this.stoplive = stoplive;
    this.getinitchunk = getInitChunk;
    this.getlastestchunk = getLastestChunk;
    this.getnextchunk = getNextChunk;
    this.process = process;

    function process() {
        var m = req.url.match(/\/live\/(\w+)/);
        if (m && m[1] && this[m[1]])
            this[m[1]]();
        else handle404();
    }

    function startLive() {
        live.startLive();
        resp.end('ok');
    }

    function stoplive() {
        live.stopLive();
        resp.end('ok');
    }

    function getInitChunk() {
        var Chunkname = 's_init.mp4';
        if (live.liveStatus.isInitialled)
            pipeChunk(Chunkname);
        else
            eventbus.once('LiveInitialled', function () { pipeChunk(Chunkname); });
    }

    function getLastestChunk() {
        if (live.liveStatus.curChunk)
            pipeChunk(live.liveStatus.curChunk);
        else
            eventbus.once('ChunkGenerated', function (chunk) {
                pipeChunk(chunk);
            });
    }

    function getNextChunk() {
        var lastChunk = url.parse(req.url, true).lastChunk;
        if (!lastChunk) return getLastestChunk();

        var seq = parseInt(lastChunk.substring(2, 8));
        var curSeq = parseInt((live.liveStatus.curChunk).substring(2, 8));
        if (seq < curSeq)
            return pipeChunk('s_' + (seq + 1) + '.m4s');
        else if (seq == curSeq)
            return eventbus.once('ChunkGenerated', function (chunk) {
                pipeChunk(chunk);
            });
    }

    function pipeChunk(fn) {
        var file = path.join(live.liveStatus.workingPath, fn)
        fs.exists(file, exists => {
            if (exists) {
                resp.setHeader('Chunk-Name', fn);
                fs.createReadStream(file).pipe(resp);
            }
            else handle404();
        });
    }

    function handle404() {
        resp.statusCode = 404;
        resp.end();
    }
}

module.exports = liveservice;