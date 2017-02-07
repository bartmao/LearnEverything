import fs = require('fs')
import stream = require('stream');
import BinaryFileReader from './BinaryFileReader'

export default class MP4Dumper {
    private rd: BinaryFileReader;
    private context: Context;

    constructor(fn: string) {
        // let fd = fs.createReadStream(fn);
        // this.rd = new BinaryFileReader(fd);
        this.rd = BinaryFileReader.fromFilePath(fn);
        this.context = new Context;
        this.context.CurBoxSize = [Number.MAX_SAFE_INTEGER];
    }

    async readMP4() {
        while (await this.readBox());
        console.log('');
        this.dumpDTS();
    }

    async readBox() {
        let pos = this.rd.pos.toString();
        let buf;
        try {
            buf = await this.rd.readBytes(4);
        }
        catch (err) {
            console.log(err);
            return false;
        }

        if (!buf)
            return false;

        let len = buf.readUInt32BE(0);
        let type = await this.rd.readString(4);
        let data;
        let largeSize: boolean;
        if (len == 1) {
            len = (await this.rd.readBytes(8)).readUIntBE(0, 8);
            largeSize = true;
        }

        console.log(`${this.getPadding()} Box ${type} of Size ${len}`);

        let stack = this.context.CurBoxSize;
        stack[stack.length - 1] -= len;

        if (len > 8) {
            if (this.canReadIn(type)) {
                this.context.CurBoxSize.push(len);
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
        console.log(`${this.getPadding()} duration: ${this.getTimeframe(duration, timescale)}(${duration})`);

        this.context.Timescale = timescale;
    }

    async parsemdhd(dsize: number) {
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

        let padLang = buf.readUInt16BE(20); // pading + language
        let pre_defined = buf.readUInt16BE(22);
        console.log(`${this.getPadding()} creation time: ${new Date(creationtime)}`);
        console.log(`${this.getPadding()} modification time: ${new Date(modtime)}`);
        console.log(`${this.getPadding()} timescale: ${timescale}`);
        console.log(`${this.getPadding()} duration: ${this.getTimeframe(duration, timescale)}(${duration})`);

        this.context.SampleDTMappings[0] = timescale;
    }

    async parsestsz(dsize: number) {
        let buf = await this.rd.readBytes(dsize);
        let version = buf.readUInt8(0);
        let flag = buf.readUIntBE(1, 3);
        let sample_size = buf.readUInt32BE(4);
        let sample_count = buf.readUInt32BE(8);
        console.log(`${this.getPadding()} sample_size: ${sample_size}`);
        console.log(`${this.getPadding()} sample_count: ${sample_count}`);
        this.context.SampleSize.push(sample_size);
        if (sample_size == 0) {
            let baseSize = 12;
            for (let i = 1; i <= sample_count; ++i) {
                let entry_size = buf.readUInt32BE(baseSize);
                baseSize += 4;
                this.context.SampleSize.push(entry_size);
                console.log(`${this.getPadding()} seq: ${i} entry_size: ${entry_size}`);
            }
        }
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

        this.context.CurHandlerType = handler_type;
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
            if (this.context.CurHandlerType == 'vide') {
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
            else if (this.context.CurHandlerType == 'soun') {
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
            this.context.ChunkSampleMappings.push([first_chuck, samples_per_chuck]);
        }
    }

    async parsestco(dsize: number) {
        let buf = await this.rd.readBytes(dsize);
        let version = buf.readUInt8(0);
        let flag = buf.readUIntBE(1, 3);
        let entry_count = buf.readInt32BE(4);
        let baseOffset = 8;
        console.log(`${this.getPadding()} chunk_entry_count: ${entry_count}`);
        for (let i = 1; i <= entry_count; ++i) {
            let chunk_offset = buf.readInt32BE(baseOffset);
            //console.log(`${this.getPadding()} chunk_offset: ${chunk_offset}`);
            baseOffset += 4;
            this.context.ChunkOffset.push(chunk_offset);
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
            this.context.SampleDTMappings[1].push([sample_count, sample_delta]);
            baseOffset += 8;
        }
    }

    async parsectts(dsize: number) {
        let buf = await this.rd.readBytes(dsize);
        let version = buf.readUInt8(0);
        let flag = buf.readUIntBE(1, 3);
        let entry_count = buf.readInt32BE(4);
        let baseOffset = 8;
        for (let i = 1; i <= entry_count; ++i) {
            let sample_count = buf.readInt32BE(baseOffset);
            let sample_offset = buf.readInt32BE(baseOffset + 4);
            console.log(`${this.getPadding()} sample_count: ${sample_count}`);
            console.log(`${this.getPadding()} sample_offset: ${sample_offset}`);
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
        return (new Array(this.context.CurBoxSize.length - 1)).join(' ');
    }

    dumpDTS() {
        let track_timescale = this.context.SampleDTMappings[0];

        let sampleIndex = 0;
        let sstsIndex = 0;
        let curSampleBoxRemains = this.context.SampleDTMappings[1][sstsIndex][0];
        let dts = 0;
        let sampleOffset = 0;
        for (let i = 0; i < this.context.ChunkOffset.length; ++i) {
            // find samples in the chunk;
            let chunkId = i + 1;
            let chunk = this.context.ChunkOffset[i];
            let nexti = this.context.ChunkSampleMappings.findIndex(v => v[0] > chunkId);
            nexti = nexti == -1 ? this.context.ChunkSampleMappings.length : nexti;
            let sampleCount = this.context.ChunkSampleMappings[nexti - 1][1];
            sampleOffset = chunk;
            for (let j = sampleIndex; j < sampleCount; ++j) {
                let sampleId = j + 1;
                let sampleSize = this.context.SampleSize[0] != 0 ? this.context.SampleSize[1] : this.context.SampleSize[j + 1];
                console.log(`Chuck ${chunkId} Sample ${sampleId} Offset ${sampleOffset} Size ${sampleSize} DTS ${dts / track_timescale}`);

                curSampleBoxRemains -= 1;
                dts += this.context.SampleDTMappings[1][sstsIndex][1];
                if (curSampleBoxRemains == 0) sstsIndex++; // move to next entry in ssts
                sampleOffset += sampleSize;
            }
        }
    }
}

class Context {
    CurBoxSize: Array<number> = [];
    Timescale: number;
    CurHandlerType: string;
    ChunkOffset: Array<number> = [];
    SampleSize: Array<number> = [];
    ChunkSampleMappings: Array<[number, number]> = [];
    SampleDTMappings: [number, Array<[number, number]>] = [0, []];
}