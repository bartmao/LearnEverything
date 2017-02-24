var fs = require('fs');
var config = require('./config');
var child_process = require('child_process');
var fs = require('fs');
var path = require('path');

function start(file) {
    // pre1. make folder for dash files
    var dirpath = __dirname + path.basename(file)
    if (!fs.existsSync(dirpath))
        fs.mkdirSync(dirpath);
        
    // 1. transcode using ffmpeg divide into video/audio files
    // 2. mp4box packages video/audio files
    // 3. merge AdaptationSet
    var ffmpegopts = config.ffmpegopts.replace(/%file/g, file).replace(/%dir/g, dirpath + path.sep).split(' ');
    var ps = child_process.spawn(config.cmd.ffmpeg, ffmpegopts, { stdio: ['pipe', process.stdout, process.stderr] });
    ps.on('exit', () => startpkg(dirpath).then(r => mergeMPD(dirpath)));
}

function startpkg(dirpath) {
    var p1 = child_process.spawn(config.cmd.mp4box, config.mp4boxopts4v.split(' '), { cwd: dirpath, stdio: ['pipe', process.stdout, process.stderr] });
    var p2 = child_process.spawn(config.cmd.mp4box, config.mp4boxopts4a.split(' '), { cwd: dirpath, stdio: ['pipe', process.stdout, process.stderr] });

    return new Promise(resolve => {
        var flags = [0, 0];
        p1.on('exit', () => new Promise(r => {
            flags[0] = 1;
            if (flags[1] == 1) resolve();
        }));
        p2.on('exit', () => new Promise(r => {
            flags[1] = 1;
            if (flags[0] == 1) resolve();
        }));
    });
}

function mergeMPD(dirpath) {
    var mpd = fs.readFileSync(dirpath + path.sep + '1v_dash.mpd', { encoding: 'utf8' });
    var mpda = fs.readFileSync(dirpath + path.sep + '1a_dash.mpd', { encoding: 'utf8' });
    var insertPt = mpd.lastIndexOf('</AdaptationSet>') + 16;
    var audioStart = mpda.indexOf('<AdaptationSet');
    var audioEnd = mpda.lastIndexOf('</AdaptationSet>') + 16;
    fs.writeFileSync(dirpath + path.sep + '1.mpd',
        mpd.substring(0, insertPt)
        + mpda.substring(audioStart, audioEnd)
        + mpd.substr(insertPt, mpd.length - 1)
    )
}

module.exports.start = start;