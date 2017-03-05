var video;
var sourceBuf;
var dataq = [];
var mediaSource;

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
        binaryget("Live/4/s_init.mp4", function (data) {
            waitForUpdateEnd(data, function () {
                sourceBuf.appendBuffer(data);
                var seq = 1;
                loadData(seq);
            });
        });
    } catch (err) {
        console.log(err);
    }
}

function loadData(seq) {
    try {
        binaryget("Live/4/s_" + seq + ".m4s", function (data) {
            waitForUpdateEnd(data, function () {
                sourceBuf.appendBuffer(data);
                if (video.paused) {
                    video.play();
                }
                setTimeout(function () {
                    if(seq == 1) seq = 2;
                        loadData(++seq);
                }, 2000);

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

function binaryget(url, cb) {
    var oReq = new XMLHttpRequest();
    oReq.open("GET", url, true);
    oReq.responseType = "arraybuffer";

    oReq.onload = function (oEvent) {
        var arrayBuffer = oReq.response;
        cb(new Uint8Array(arrayBuffer));
    };
    oReq.onerror = function (err) {
        console.error(err);
    }
    oReq.send();
}