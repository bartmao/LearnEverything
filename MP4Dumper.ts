import fs = require('fs')
import stream = require('stream');
import BinaryFileReader from './BinaryFileReader'

export default class MP4Dumper {
    private rd: BinaryFileReader;
    private context: {};

    constructor(fn: string) {
        let fd = fs.createReadStream(fn);
        this.rd = new BinaryFileReader(fd);
        this.context = {};
    }

    async readMP4() {
        let rd1 = this.rd;
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

        console.log(`${pos} Box ${type} of Size ${len}`);

        if (len > 8) {
            if (this.canReadIn(type))
                await this.readBox();
            else {
                let dataSize = len - 8 - (largeSize ? 4 : 0);
                if (!await this.parseBox(type, dataSize))
                    data = await this.rd.readBytes(dataSize);
            }

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

        console.log(`creation time: ${new Date(creationtime)}`);
        console.log(`modification time: ${new Date(modtime)}`);
        console.log(`timescale: ${timescale}`);
        console.log(`duration: ${this.getTimeframe(duration, timescale)}`);

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
        console.log(`handler_type: ${handler_type}`);
        console.log(`name: ${name}`);

        this.context['handler_type'] = handler_type;
    }

    async parsestsd(dsize: number) {
        let rd = this.rd;
        let pos = rd.pos;
        let version = (await rd.readBytes(1)).readUInt8(0);
        let flag = (await rd.readBytes(3)).readUIntBE(0, 3);
        let entry_count = (await rd.readBytes(4)).readUInt32BE(0);

        console.log(`entry_count: ${entry_count}`);

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
                let compressorname = (await rd.readBytes(32)).toString();
                let depth = await rd.readBytes(2);
                let pre_defined2 = await rd.readBytes(2);

                console.log(`seq: ${i} width: ${width}`);
                console.log(`seq: ${i} height: ${height}`);
                console.log(`seq: ${i} compressorname: ${compressorname}`);
            }
            else if (this.context['handler_type'] == 'soun') {
                let reversed = await rd.readBytes(8);
                let channelcount = (await rd.readBytes(2)).readUInt16BE(0);
                let samplesize = (await rd.readBytes(2)).readUInt16BE(0);
                let pre_defined = (await rd.readBytes(2)).readUInt16BE(0);
                let reserved1 = (await rd.readBytes(2)).readUInt16BE(0);
                let samplerate = (await rd.readBytes(4)).readUInt32BE(0); // = timescale << 16

                console.log(`seq: ${i} channelcount: ${channelcount}`);
                console.log(`seq: ${i} samplesize: ${samplesize}`);
                console.log(`seq: ${i} samplerate: ${samplerate}`);
            }
        }

        let blank = pos + dsize - rd.pos;
        if (blank > 0) await rd.readBytes(blank);
    }

    getTimeframe(time: number, timescale: number) {
        let h = Math.floor(time / timescale / 3600);
        let m = Math.floor((time - h * 3600 * timescale) / timescale / 60);
        let s = Math.floor((time - h * 3600 * timescale - m * 60 * timescale) / timescale / 60);
        return `${h}'${m}"${s}`;
    }


}