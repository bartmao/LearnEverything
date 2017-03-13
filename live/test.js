var video;
var sourceBuf;
var dataq = [];
var mediaSource;
var liveTime;
var dur = 4000;
var curSeq = -1;
var curChunk;


function init() {
    video = document.getElementById('video0');
    mediaSource = new MediaSource();

    video.src = window.URL.createObjectURL(mediaSource);
    mediaSource.addEventListener('sourceopen', function () {
        //video/mp4;codecs="avc1.64001e"
        //video/mp4;codecs="avc1.42C01F"
        sourceBuf = mediaSource.addSourceBuffer('video/mp4;codecs="avc1.42c015"');
        loadInitData();
    });
}

function loadInitData() {
    try {

        ajax("getInitChunk", function (data) {

            waitForUpdateEnd(data, function () {
                sourceBuf.appendBuffer(data);
                loadData();
            });
        });
    } catch (err) {
        console.log(err);
    }
}

function loadData() {
    try {
        var reqUrl = "getNextChunk" + (curChunk ? '?lastChunk=' + curChunk : '');
        ajax(reqUrl, function (data, chunkName) {
            if (chunkName == curChunk) return setTimeout(loadData, 50);
            curChunk = chunkName;
            
            waitForUpdateEnd(data, function () {

                sourceBuf.appendBuffer(data);

                if(sourceBuf.buffered.length > 0){
                    alert(sourceBuf.buffered.start(0));
                    alert((curChunk.substring(2, 4) -1)*4);
                }

                if (video.readyState != 4) {
                    //video.currentTime = sourceBuf.buffered.start(0)
                    var seq = parseInt(curChunk.substring(2, 4));
                    video.currentTime = (seq - 1) * 4;
                }
                if (video.paused) {
                    //alert(video.paused);

                    video.play();

                }
                //video.currentTime= curTime;
                loadData();
            });
        });
    } catch (err) {
        console.log(err);
    }
}

function waitForUpdateEnd(buffer, callback) {
    var intervalId;
    var CHECK_INTERVAL = 50;

    var checkIsUpdateEnded = function () {
        // if updating is still in progress do nothing and wait for the next check again.
        if (buffer.updating) return;
        // updating is completed, now we can stop checking and resolve the promise
        clearInterval(intervalId);
        callback();
    };

    var updateEndHandler = function () {
        if (buffer.updating) return;

        buffer.removeEventListener('updateend', updateEndHandler, false);
        callback();
    };

    if (!buffer.updating) {
        callback();
        return;
    }

    // use updateend event if possible
    if (typeof buffer.addEventListener === 'function') {
        try {
            buffer.addEventListener('updateend', updateEndHandler, false);
        } catch (err) {
            // use setInterval to periodically check if updating has been completed
            intervalId = setInterval(checkIsUpdateEnded, CHECK_INTERVAL);
        }
    } else {
        // use setInterval to periodically check if updating has been completed
        intervalId = setInterval(checkIsUpdateEnded, CHECK_INTERVAL);
    }
}

function ajax(url, cb, type) {
    if(!type) type = 'arraybuffer';
    var oReq = new XMLHttpRequest();
    oReq.open("GET", url, true);
    oReq.responseType = type;
                

    oReq.onload = function (oEvent) {
        var buf = oReq.response;
        cb(type == 'arraybuffer' ? new Uint8Array(buf) : buf, oReq.getResponseHeader('Chunk-Name'));
    };
    oReq.onerror = function (err) {
        console.error(err);
    }
    oReq.send();
}

