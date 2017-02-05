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
        while (await this.readBox());
    }

    async readBox() {
        let pos = this.rd.pos;
        let buf = await this.rd.readBytes(4);
        if (!buf) return false;

        let len = buf.readUInt32BE(0);
        let type = await this.rd.readString(4);
        let data;
        let largeSize: boolean;
        if (len == 1) {
            len = (await this.rd.readBytes(8)).readUIntBE(0, 8);
            largeSize = true;
        }

        console.log(`${pos} Box ${type} of Size ${len}`);

        if (len > 8) {
            if (this.canReadIn(type))
                await this.readBox();
            else{
                data = await this.rd.readBytes(len - 8 - (largeSize ? 4 : 0));
                this.parseBox(type, data);
            }
                
        }

        return true;
    }

    canReadIn(type: string) {
        return ['moov', 'trak'].indexOf(type) != -1;
    }

    parseBox(type:string, buf:Buffer){
        let func = eval(`this['parse${type}']?this['parse${type}']:(b=>{})`) as Function;
        func.apply(func, [buf]);
    }

    parsemvhd(buf: Buffer) {
        let version = buf.readUInt8(0);
        let flag = buf.readUIntBE(1, 3);
        let creationtime:number;
        let modtime:number;
        let timescale:number;
        let duration:number;
        if(version){
            creationtime = buf.readUIntBE(4, 8);
            modtime = buf.readUIntBE(12, 8);
            timescale = buf.readUInt32BE(20);
            duration = buf.readUIntBE(24, 8);
        }
        else{
            creationtime = buf.readUIntBE(4, 4);
            modtime = buf.readUIntBE(8, 4);
            timescale = buf.readUInt32BE(12);
            duration = buf.readUIntBE(16, 4);
        }
    }
}