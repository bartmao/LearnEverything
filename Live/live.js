var cp = require('child_process');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');

// 1. begin segmenting
// 2. watch generated, package it to m4s
var watchPath = __dirname + path.sep + '5';
var curSeq = 0;
var addQ = [];
var pkgQ = [];
var livetime;

//var ffmpegopt = '-r 15 -i 1.mp4 -map 0:0 -c:v libx264 -preset ultrafast -x264opts keyint=15:min-keyint=15:no-scenecut -b:v 200k -f segment -segment_time 4 -segment_format mpegts ./5/s_%05d.ts';
var ffmpegopt = '-r 15 -f dshow -i video=Microsoft%spLifeCam%spFront -map 0:0 -c:v libx264 -preset ultrafast -x264opts keyint=15:min-keyint=15:no-scenecut -b:v 200k -f segment -segment_time 4 -segment_format mpegts ./5/s_%05d.ts';
var ffmpegcmd = 'ffmpeg';

var mp4addopt_t = '-add %in %out';
var mp4pkgopt_t = '-dash-ctx ./5/dash-live.txt -dash 4000 -rap -ast-offset -no-frags-default -bs-switching no -min-buffer 4000 -url-template -time-shift 4000 -segment-name s_ -out %dirlive -dynamic -mpd-refresh 100000 %file';
var mp4cmd = 'MP4Box';

var fp; // ffmpeg process

function startLive() {
    remkFolder();
    var opts = ffmpegopt.split(' ')
    opts.forEach((v,i)=> opts[i] = opts[i].replace(/%sp/g, ' '));
    fp = cp.spawn(ffmpegcmd, opts, {stdio:"inherit"});
    livetime = new Date();
    console.log('begin segmenting...');

    fs.watch(watchPath, (evt, nf) => {
        if (evt == 'rename' && nf.endsWith('.ts')) {
            if (nf == 's_00000.ts') return;
            var f = getAvailFile(nf);
            console.log(`file ${f} generated`);
            addFile(f);
        }
    });
}

function stopLive(){
    fp.kill();
    console.log('live stopped');
}

function addFile(f) {
    var mp4addopt = mp4addopt_t.replace('%in', path.join(watchPath, f)).replace('%out', path.join(watchPath, f + '.mp4'));
    console.log('Add ' + mp4addopt);
    var mp1 = cp.spawn(mp4cmd, mp4addopt.split(' '));
    // package
    mp1.on('exit', () => {
        pkgFile(f);
    });
}

function pkgFile(f) {
    var mp4pkgopt = mp4pkgopt_t.replace('%file', path.join(watchPath, f + '.mp4')).replace('%dir', watchPath + path.sep);
    console.log('Package ' + mp4pkgopt);
    var mp2 = cp.spawn(mp4cmd, mp4pkgopt.split(' '), { stdio: 'inherit' });
    mp2.on('exit', () => {
        //console.log(`packaged ${path.join(watchPath, f + '.mp4')}`);
    })
}

function getAvailFile(f) {
    return f.replace(/(\d+)/, function (w) { return ('00000' + (parseInt(w) - 1)).slice(-5); })
}

function getLiveTime(){
    return livetime.toString();
}

function remkFolder(){
    rimraf.sync(watchPath);
    fs.mkdirSync(watchPath);
}

module.exports.startLive = startLive;
module.exports.stopLive = stopLive;
module.exports.liveTime = getLiveTime;