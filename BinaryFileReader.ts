import fs = require('fs')
import stream = require('stream');

export default class BinaryFileReader {
    curUnprocessedByte: number;
    curPosInByte: number;
    pos: number;
    isEnd: boolean;
    rs:stream.Readable;

    constructor(rs: stream.Readable) {
        this.rs = rs;
        this.pos = 0;
        this.curPosInByte = 0;
        this.rs.on('end', () => this.isEnd = true);
    }

    static fromFilePath(path: string) {
        let fd = fs.openSync(path, 'r');
        let rs = fs.createReadStream(path, { fd: fd });
        return new BinaryFileReader(rs);
    }

    async readable(): Promise<{}> {
        return new Promise(r => this.rs.on('readable', r));
    }

    async readBytes(num: number = 0): Promise<Buffer> {
        if (this.isEnd) return new Promise<Buffer>(r => r(null));
        if (num > (1 << 17)) {
            await this.seek(Math.floor(num / (1 << 17)) * (1 << 17));
            num = num % (1 << 17);
        }

        let buf = this.rs.read(num);
        if (buf) {
            this.pos += num;
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

    async seek(size: number) {
        if (this.rs.fd) {
            let curRs = this;
            return new Promise((resolve, reject) => {
                fs.read(curRs.rs.fd, Buffer.alloc(4), 0, 4, curRs.pos + size - 4, (err, bytesRead, buf) => {
                    if (!err) {
                        curRs.pos += size;
                        // Refresh rs, since this inner point can't move automatically.
                        curRs.rs = fs.createReadStream(null, { fd: curRs.rs.fd });
                        this.curPosInByte = 0;
                        curRs.rs.on('end', () => this.isEnd = true);
                        resolve(bytesRead);
                    }
                    else reject(err);
                });
            });
        }
        else {
            // Recursive may cause stack overflow, using iteration is a safe way.
            while (size > (1 << 17)) {
                await this.readBytes(1 << 17);
                size -= (1 << 17);
            }
            return this.readBytes(size);
        }
    }
}