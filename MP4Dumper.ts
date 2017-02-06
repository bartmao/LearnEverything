import fs = require('fs')
import stream = require('stream');
import BinaryFileReader from './BinaryFileReader'

export default class MP4Dumper {
    private rd: BinaryFileReader;
    private context: {};

    constructor(fn: string) {
        // let fd = fs.createReadStream(fn);
        // this.rd = new BinaryFileReader(fd);
        this.rd = BinaryFileReader.fromFilePath(fn);
        this.context = {};
        this.context['curboxsize'] = [Number.MAX_SAFE_INTEGER];
    }

    async readMP4() {
        while (await this.readBox());
    }

    async readBox() {
        let pos = this.rd.pos.toString();
        //pos = '';
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

        console.log(`${this.getPadding()} Box ${type} of Size ${len}`);

        let stack = this.context['curboxsize'] as Array<number>;
        stack[stack.length - 1] -= len;

        if (len > 8) {
            if (this.canReadIn(type)) {
                this.context['curboxsize'].push(len);
                await this.readBox();
            }
            else {
                let dataSize = len - 8 - (largeSize ? 4 : 0);
                if (!await this.parseBox(type, dataSize))
                    data = await this.rd.readBytes(dataSize);
            }

        }

        while (stack[stack.length - 1] == 8) {
            stack.pop();
        }

        return true;
    }

    canReadIn(type: string) {
        return ['moov', 'trak', 'mdia', 'minf', 'stbl'].indexOf(type) != -1;
    }

    async parseBox(type: string, dsize: number) {
        let func = eval(`this['parse${type}']?this['parse${type}']:null`) as Function;
        if (func) {
            await func.apply(this, [dsize]);
            return true;
        }
        return false;
    }

    async parsemvhd(dsize: number) {
        let buf = await this.rd.readBytes(dsize);
        let version = buf.readUInt8(0);
        let flag = buf.readUIntBE(1, 3);
        let creationtime: number;
        let modtime: number;
        let timescale: number;
        let duration: number;
        if (version) {
            creationtime = buf.readUIntBE(4, 8);
            modtime = buf.readUIntBE(12, 8);
            timescale = buf.readUInt32BE(20);
            duration = buf.readUIntBE(24, 8);
        }
        else {
            creationtime = buf.readUIntBE(4, 4);
            modtime = buf.readUIntBE(8, 4);
            timescale = buf.readUInt32BE(12);
            duration = buf.readUIntBE(16, 4);
        }

        console.log(`${this.getPadding()} creation time: ${new Date(creationtime)}`);
        console.log(`${this.getPadding()} modification time: ${new Date(modtime)}`);
        console.log(`${this.getPadding()} timescale: ${timescale}`);
        console.log(`${this.getPadding()} duration: ${this.getTimeframe(duration, timescale)}`);

        this.context['timescale'] = timescale;
    }

    async parsehdlr(dsize: number) {
        let buf = await this.rd.readBytes(dsize);
        let version = buf.readUInt8(0);
        let flag = buf.readUIntBE(1, 3);
        let pre_defined = buf.readUInt32BE(4);
        let handler_type = buf.toString('ascii', 8, 8 + 4);
        let reversed = 0;
        let name = buf.toString('utf8', 24, buf.length - 1);
        console.log(`${this.getPadding()} handler_type: ${handler_type}`);
        console.log(`${this.getPadding()} name: ${name}`);

        this.context['handler_type'] = handler_type;
    }

    async parsestsd(dsize: number) {
        let rd = this.rd;
        let pos = rd.pos;
        let version = (await rd.readBytes(1)).readUInt8(0);
        let flag = (await rd.readBytes(3)).readUIntBE(0, 3);
        let entry_count = (await rd.readBytes(4)).readUInt32BE(0);

        for (let i = 1; i <= entry_count; ++i) {
            // Box
            let len = (await rd.readBytes(4)).readUInt32BE(0);
            let type = (await rd.readBytes(4)).toString();
            // Sample Entry
            let reversed = await rd.readBytes(6);
            let data_reference_index = (await rd.readBytes(2)).readUInt16BE(0);
            // Concrect Sample
            if (this.context['handler_type'] == 'vide') {
                let pre_defined = await rd.readBytes(2);
                let reversed1 = await rd.readBytes(2);
                let pre_defined1 = await rd.readBytes(12);
                let width = (await rd.readBytes(2)).readUInt16BE(0);
                let height = (await rd.readBytes(2)).readUInt16BE(0);
                let hresolution = (await rd.readBytes(4)).readUInt32BE(0);// 0x00480000; // 72dpi
                let vresolution = (await rd.readBytes(4)).readUInt32BE(0);// 72dpi
                let reserved2 = await rd.readBytes(4); //4
                let frame_count = await rd.readBytes(2);
                let compressorLen = (await rd.readBytes(1)).readInt8(0);
                let compressorname = '';
                if (compressorLen > 0)
                    compressorname = (await rd.readBytes(compressorLen)).toString();
                let compressorPadding = 32 - compressorLen > 0 ? await rd.readBytes(32 - compressorLen) : null;
                let depth = await rd.readBytes(2);
                let pre_defined2 = await rd.readBytes(2);

                console.log(`${this.getPadding()} seq: ${i} type: ${type}`);
                console.log(`${this.getPadding()} seq: ${i} width: ${width}`);
                console.log(`${this.getPadding()} seq: ${i} height: ${height}`);
                console.log(`${this.getPadding()} seq: ${i} compressorname: ${compressorname}`);
            }
            else if (this.context['handler_type'] == 'soun') {
                let reversed = await rd.readBytes(8);
                let channelcount = (await rd.readBytes(2)).readUInt16BE(0);
                let samplesize = (await rd.readBytes(2)).readUInt16BE(0);
                let pre_defined = (await rd.readBytes(2)).readUInt16BE(0);
                let reserved1 = (await rd.readBytes(2)).readUInt16BE(0);
                let samplerate = (await rd.readBytes(4)).readUInt32BE(0); // = timescale << 16

                console.log(`${this.getPadding()} seq: ${i} channelcount: ${channelcount}`);
                console.log(`${this.getPadding()} seq: ${i} samplesize: ${samplesize}`);
                console.log(`${this.getPadding()} seq: ${i} samplerate: ${samplerate}`);
            }
        }

        let blank = pos + dsize - rd.pos;
        if (blank > 0) await rd.readBytes(blank);
    }

    async parsestsc(dsize: number) {
        let buf = await this.rd.readBytes(dsize);
        let version = buf.readUInt8(0);
        let flag = buf.readUIntBE(1, 3);
        let entry_count = buf.readInt32BE(4);
        let baseOffset = 8;
        for (let i = 1; i <= entry_count; ++i) {
            let first_chuck = buf.readInt32BE(baseOffset);
            let samples_per_chuck = buf.readInt32BE(baseOffset + 4);
            let sample_description_index = buf.readInt32BE(baseOffset + 8);
            console.log(`${this.getPadding()} first_chuck: ${first_chuck}`);
            console.log(`${this.getPadding()} samples_per_chuck: ${samples_per_chuck}`);
            console.log(`${this.getPadding()} sample_description_index: ${sample_description_index}`);
            baseOffset += 12;
        }
    }

    async parsestco(dsize: number) {
        let buf = await this.rd.readBytes(dsize);
        let version = buf.readUInt8(0);
        let flag = buf.readUIntBE(1, 3);
        let entry_count = buf.readInt32BE(4);
        let baseOffset = 8;
        for (let i = 1; i <= entry_count; ++i) {
            let chunk_offset = buf.readInt32BE(baseOffset);
            console.log(`${this.getPadding()} chunk_offset: ${chunk_offset}`);
            baseOffset += 4;
        }
    }

    async parsestts(dsize: number) {
        let buf = await this.rd.readBytes(dsize);
        let version = buf.readUInt8(0);
        let flag = buf.readUIntBE(1, 3);
        let entry_count = buf.readInt32BE(4);
        let baseOffset = 8;
        for (let i = 1; i <= entry_count; ++i) {
            let sample_count = buf.readInt32BE(baseOffset);
            let sample_delta = buf.readInt32BE(baseOffset + 4);
            console.log(`${this.getPadding()} sample_count: ${sample_count}`);
            console.log(`${this.getPadding()} sample_delta: ${sample_delta}`);
            baseOffset += 8;
        }
    }

    getTimeframe(time: number, timescale: number) {
        let h = Math.floor(time / timescale / 3600);
        let m = Math.floor((time - h * 3600 * timescale) / timescale / 60);
        let s = Math.floor((time - h * 3600 * timescale - m * 60 * timescale) / timescale);
        return `${h}'${m}"${s}`;
    }

    getPadding() {
        return (new Array(this.context['curboxsize'].length - 1)).join(' ');
    }
}