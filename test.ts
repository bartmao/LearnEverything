require('./Init');

import MP4Dumper from './MP4Dumper';
import fs = require('fs');

async function main() {
    let fd = fs.openSync(__dirname + '/../resources/4.mp4', 'r');

    //0x72d8bf5b 
    // fs.read(fd, Buffer.alloc(1), 0, 1, 0x72d8bf5b - 1, (err, br, buf) => {
    //     console.log(err);
    //     console.log(br);
    //     console.log(buf);
    // });

    // fs.read(fd, Buffer.alloc(3), 0, 3, null, (err, br, buf) => {
    //     console.log(err);
    //     console.log(br);
    //     console.log(buf);
    // });

    // return;
    // let rs = fs.createReadStream(__dirname + '/../resources/1.mp4');
    // rs.on('readable', () => {
    //     let buf = rs.read(100000);
    //     console.log('on read');
    //     if (buf)
    //         console.log(buf.length);
    // });

    let dumper = new MP4Dumper(__dirname + '/../resources/5.mp4');
    await dumper.readMP4();
}

main();
