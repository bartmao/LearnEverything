import BinaryFileReader from './BinaryFileReader'
import fs = require('fs')
//import lzw = require("node-lzw");

let fd = fs.createReadStream(__dirname +  '/../resources/51.gif');
let rd = new BinaryFileReader(fd);

async function readGif() {
    // read header
    var gifStr = await rd.readString(3);
    var ver = await rd.readString(3);
    console.log(`Header: ${gifStr} Version: ${ver}`);

    // read LSD
    var bufLSD = await rd.readBytes(7);
    var width = bufLSD.readUInt16LE(0);
    var height = bufLSD.readUInt16LE(2);
    var m_cr_s_px = bufLSD.readUInt8(4);
    var m = (m_cr_s_px & 0x80) >> 7;
    var cr = (m_cr_s_px & 0x70) >> 4;
    let s = (m_cr_s_px & 0x8) >> 3;
    var px = (m_cr_s_px & 0x7);
    var bgc = bufLSD.readUInt8(5);
    var aspect = bufLSD.readUInt8(6);
    console.log(`Width: ${width}px, Height: ${height}px, m: ${m}, cr: ${cr}, s: ${s}, pixel: ${px}, background color: ${bgc}, aspect: ${aspect}`);

    // read GCT
    var tableSize = 3 * Math.pow(2, px + 1);
    var bufCr = await rd.readBytes(tableSize);
    console.log(`Color table of size ${tableSize}: ${bufCr.toString('hex')}`);

    // read blocks
    var id = (await rd.readBytes(1)).readUInt8(0);
    while (id == 0x21 || id == 0x2C) {
        if (id == 0x2C) {
            let imgPos = rd.pos;
            let s = await rd.readBytes(10);
            // read LCT
            // read image data
            // var ss = readBytes(1); // LZW
            var info = await readSubBlocks(0, 0, true);
            console.log(`${imgPos} Image Data, ${info[0]} Subblocks of total size ${info[1]}`);
            id = (await rd.readBytes(1)).readUInt8(0);
            continue;
        }

        var label = (await rd.readBytes(1)).readUInt8(0);
        if (label == 0xFF) {
            // read app ext
            var size = (await rd.readBytes(1)).readUInt8(0);

            await rd.readBytes(11);
            var info = await readSubBlocks();
            console.log(`Application Ext, ${info[0]} Subblocks of total size ${info[1]}`);
        }
        else if (label == 0xFE) {
            var info = await readSubBlocks();
            console.log(`Comment Ext, ${info[0]} Subblocks of total size ${info[1]}`);
        }
        else if (label == 0xF9) {
            var size = (await rd.readBytes(1)).readUInt8(0);
            await rd.readBytes(4);
            await rd.readBytes(1);
            console.log(`Graphic Control Ext`);
        }
        else if (label == 0x01) {
            var size = (await rd.readBytes(1)).readUInt8(0);
            await rd.readBytes(12);
            var info = readSubBlocks();
            console.log(`Plain Text Ext, ${info[0]} Subblocks of total size ${info[1]}`);
        }

        id = (await rd.readBytes(1)).readUInt8(0);
    }

    console.log('end');
}

async function readSubBlocks(count = 0, totalSize = 0, decode = false) {
    var size = (await rd.readBytes(1)).readUInt8(0);

    if (size !== 0) {
        var l = await rd.readBytes(size);
        if(decode){
            // var deBuf = Buffer.from(lzw.decode(l));  
            // console.log(deBuf.length);
        }
        var info = await readSubBlocks(++count, size);
        return [info[0], totalSize + info[1]];
    }

    return [count, totalSize];
}

readGif();