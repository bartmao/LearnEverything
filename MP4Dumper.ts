import fs = require('fs')
import stream = require('stream');
import BinaryFileReader from './BinaryFileReader'

export default class MP4Dumper {
    private rd: BinaryFileReader;

    constructor(fn: string) {
        let fd = fs.createReadStream(fn);
        this.rd = new BinaryFileReader(fd);
    }

    async readMP4() {
        let rd1 = this.rd;
        await this.readBox();
        await this.readBox();
        await this.readBox();
        await this.readBox();
        await this.readBox();
        await this.readBox();
        await this.readBox();
    }

    async readBox() {
        let buf = await this.rd.readBytes(4);
        let len = buf.readUInt32BE(0);
        let type = await this.rd.readString(4);
        let data;
        if (len != 1)
            data = await this.rd.readBytes(len - 8);
        else {
            len = (await this.rd.readBytes(8)).readUIntBE(0, 8);
            data = await this.rd.readBytes(len - 12);
        }
        console.log(`Box ${type} of Size ${len}`);
    }
}