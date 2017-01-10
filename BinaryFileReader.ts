import fs = require('fs')

export default class BinaryFileReader {
    rs: fs.ReadStream;
    curUnprocessedByte: Buffer;
    curPosInByte:number;
    pos:number;

    constructor(rs: fs.ReadStream) {
        this.rs = rs;
        this.pos = 0;
    }

    async readable(): Promise<{}> {
        return new Promise(r => this.rs.on('readable', r));
    }

    async readBytes(num: number = 0): Promise<Buffer> {
        let buf = this.rs.read(num);
        this.pos+=num;
        if (buf) {
            return new Promise<Buffer>(r => r(buf));
        }
        else {
            return this.readable().then<Buffer>(() => {
                let buf1: Buffer = this.rs.read(num);
                return new Promise<Buffer>(r => r(buf1));
            })
        }
    }

    async readIntLE(byteLen:number) {
        let curBuf = await this.readBytes(byteLen);
        return curBuf.readUIntLE(0, byteLen);
    }

    async readString(byteLen:number){
        let buf = await this.readBytes(byteLen);
        return buf.toString();
    }
}