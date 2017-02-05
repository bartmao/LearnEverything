import fs = require('fs')
import stream = require('stream');

export default class BinaryFileReader {
    rs: stream.Readable;
    curUnprocessedByte: number;
    curPosInByte: number;
    pos: number;
    isEnd:boolean;

    constructor(rs: stream.Readable) {
        this.rs = rs;
        this.pos = 0;
        this.curPosInByte = 0;
        this.rs.on('end', ()=>this.isEnd = true);
    }

    async readable(): Promise<{}> {
        return new Promise(r => this.rs.on('readable', r));
    }

    async readBytes(num: number = 0): Promise<Buffer> {
        if(this.isEnd) return new Promise<Buffer>(r=>r(null));

        let buf = this.rs.read(num);
        this.pos += num;
        if (buf) {
            return new Promise<Buffer>(r => r(buf));
        }
        else {
            return new Promise<Buffer>(r => {
                this.readable().then(() => {
                    this.readBytes(num).then(b => r(b));
                });
            });
        }
    }

    async readIntLE(byteLen: number) {
        let curBuf = await this.readBytes(byteLen);
        return curBuf.readUIntLE(0, byteLen);
    }

    async readString(byteLen: number) {
        let buf = await this.readBytes(byteLen);
        return buf.toString();
    }

    async readBits(bitLen: number) {
        let bitarr = [];
        if (this.curPosInByte == 0)
            this.curUnprocessedByte = (await this.readBytes(1)).readUInt8(0);
        while (bitLen--) {
            bitarr.push((this.curUnprocessedByte >> (7 - this.curPosInByte)) & 1);
            if (this.curPosInByte == 7) {
                this.curPosInByte = 0;
                this.curUnprocessedByte = (await this.readBytes(1)).readUInt8(0);
            }
            else this.curPosInByte++;
        }

        let v = 0;
        bitarr.forEach((bit, i) => {
            if (bit)
                v += Math.pow(2, bitarr.length - i - 1);
        });

        return v;
    }
}