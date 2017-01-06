var fs = require('fs');
var http = require('http');

var fd = fs.createReadStream('./resources/1.gif');

function readGif() {
    // read header
    var id = readString(3);
    var ver = readString(3);
    console.log(`Header: ${id} Version: ${ver}`);

    // read LSD
    var bufLSD = readBytes(7);
    var width = bufLSD.readUInt16LE();
    var height = bufLSD.readUInt16LE(2);
    var m_cr_s_px = bufLSD.readUInt8(4);
    var m = (m_cr_s_px & 0x80) >> 7;
    var cr = (m_cr_s_px & 0x70) >> 4;
    var s = (m_cr_s_px & 0x8) >> 3;
    var px = (m_cr_s_px & 0x7);
    var bgc = bufLSD.readUInt8(5);
    var aspect = bufLSD.readUInt8(6);
    console.log(`Width: ${width}px, Height: ${height}px, m: ${m}, cr: ${cr}, s: ${s}, pixel: ${px}, background color: ${bgc}, aspect: ${aspect}`);

    // read GCT
    var tableSize = 3 * Math.pow(2, px + 1);
    var bufCr = readBytes(tableSize);
    console.log(`Color table of size ${tableSize}`);

    // read blocks
    var id = readBytes(1).readUInt8();
    while (id == 0x21 || id == 0x2C) {
        if (id == 0x2C) {
            var s = readBytes(10);
            // read LCT
            // read image data
            // var ss = readBytes(1); // LZW
            // console.log('LZW:' + ss.toString('hex'));
            var info = readSubBlocks();
            console.log(`Image Data, ${info[0]} Subblocks of total size ${info[1]}`);
            id = readBytes(1).readUInt8();
            continue;
        }

        var label = readBytes(1).readUInt8();
        if (label == 0xFF) {
            // read app ext
            var bkPos = pos - 2;
            var size = readBytes(1).readUInt8();

            readBytes(11);
            var info = readSubBlocks();
            console.log(`${bkPos} Application Ext, ${info[0]} Subblocks of total size ${info[1]}`);
        }
        else if (label == 0xFE) {
            var info = readSubBlocks();
            console.log(`Comment Ext, ${info[0]} Subblocks of total size ${info[1]}`);
        }
        else if (label == 0xF9) {
            var size = readBytes(1).readUInt8();
            readBytes(4);
            readBytes(1);
            // var info = readSubBlocks();
            console.log(`Graphic Control Ext`);
        }
        else if (label == 0x01) {
            var size = readBytes(1).readUInt8();
            readBytes(12);
            var info = readSubBlocks();
            console.log(`Plain Text Ext, ${info[0]} Subblocks of total size ${info[1]}`);
        }

        id = readBytes(1).readUInt8();
    }

    console.log('end');
}

function readSubBlocks(count = 0, totalSize = 0) {
    var size = readBytes(1).readUInt8();

    if (size !== 0) {
        var l = readBytes(size);
        //console.log(`Sub-Block ${count} size of ${size}`);
        var info = readSubBlocks(++count, size);
        return [info[0], totalSize + info[1]];
    }

    return [count, totalSize];
}

function readString(size) {
    var buf = readBytes(size);
    return buf.toString();
}

var i = 0;
fd.on('readable', () => {
    console.log('readable');
    if (i++ == 1) return;
    readGif();
});

var pos = 0;
function readBytes(num) {
    pos += num;
    return fd.read(num);
}