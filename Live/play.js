var video;
var sourceBuf;
var dataq = [];
var mediaSource;
var liveTime = new Date('Sun Mar 05 2017 22:40:34 GMT+0800 (CST)');
var dur = 4000;
var curSeq = -1;

function init() {
    // ajax('/Live/livetime', function(t){
    //     liveTime = new Date(t);
    // }, 'text');

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
        ajax("Live/5/s_init.mp4", function (data) {
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
        var t = Math.floor((new Date() - liveTime)/dur);
        if(t == curSeq) return setTimeout(loadData, 50);
        curSeq = t;

        ajax("Live/5/s_" + curSeq + ".m4s", function (data) {
            waitForUpdateEnd(data, function () {
                sourceBuf.appendBuffer(data);
                if (video.paused) {
                    video.play();
                }
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

function ajax(url, cb, type = 'arraybuffer') {
    var oReq = new XMLHttpRequest();
    oReq.open("GET", url, true);
    oReq.responseType = type;

    oReq.onload = function (oEvent) {
        var buf = oReq.response;
        cb(type == 'arraybuffer'?new Uint8Array(buf):buf);
    };
    oReq.onerror = function (err) {
        console.error(err);
    }
    oReq.send();
}