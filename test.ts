require('./Init');

import MP4Dumper from './MP4Dumper';
import fs = require('fs');

async function main() {
    let dumper = new MP4Dumper(__dirname + '/../resources/3.mp4');
    await dumper.readMP4();
}

main();
