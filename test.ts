require('./Init');

import MP4Dumper from './MP4Dumper';
import fs = require('fs');

async function main() {
    // let rs = fs.createReadStream(__dirname + '/../resources/1.mp4');
    // rs.on('readable', () => {
    //     let buf = rs.read(100000);
    //     console.log('on read');
    //     if (buf)
    //         console.log(buf.length);
    // });

    let dumper = new MP4Dumper(__dirname + '/../resources/2.mp4');
    await dumper.readMP4();
}

main();
