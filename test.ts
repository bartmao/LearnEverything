import BinaryFileReader from './BinaryFileReader'
import fs = require('fs')

let fd = fs.createReadStream(__dirname + '/../resources/51.gif');
let rd = new BinaryFileReader(fd);

async function main() {
    console.log(await rd.readBits(8));
    console.log(await rd.readBits(8));
    console.log(await rd.readBits(8));

}

main();