require('./Init');

import MP4Dumper from './MP4Dumper';

async function main() {
    let dumper = new MP4Dumper(__dirname + '/../resources/2.mp4');
    await dumper.readMP4();
}

main();
