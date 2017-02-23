require('./Init');

import MP4Dumper from './MP4Dumper';
import fs = require('fs');

async function main() {
    return;
    let fd = fs.createReadStream(__dirname + '/../resources/53.mp4');
    fd.on('data', chuck=>{
        console.log(chuck.length);
    });

    return;
    let dumper = new MP4Dumper(__dirname + '/../resources/51.mp4');
    await dumper.readMP4();
}

main();
