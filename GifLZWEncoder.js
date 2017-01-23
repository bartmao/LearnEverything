function GifLZWEncoder(pixels, colorDepth) {
    var hTab; // hTab:[[string,code],...]
    var CLEAR, EOF;
    var MAXBIT = 12;
    var prefix, curAvail, curBits, initBits, maxCode, c;
    var curPos;
    var _pixels, _colorDepth;
    var curByte, curBit = 0;

    initBits = colorDepth + 1;
    curBits = initBits;
    maxCode = 1 << curBits;
    initTab(1 << colorDepth);
    _pixels = pixels;
    _colorDepth = colorDepth;
    curPos = 0;
    this.encode = encode;

    function initTab(initCodeSize) {
        // initCodeSize entries reserved from 0~initCodeSize-1
        CLEAR = initCodeSize;
        EOF = CLEAR + 1;
        curAvail = EOF + 1;

        hTab = [];
        for (var i = 0; i < CLEAR; ++i) {
            hTab.push([i, i]);
        }
        hTab.push([CLEAR, CLEAR]);
        hTab.push([EOF, EOF]);
    }

    function encode() {
        console.log(_colorDepth);
        outputCode(CLEAR);
        compress();
        outputCode(EOF);
    }

    function compress() {
        prefix = readPixel();
        while ((c = readPixel()) != null) {
            var str = prefix + ',' + c;
            if (isStrInHashTable(str)) {
                prefix = str;
                continue;
            }
            else {
                hTab.push([str, curAvail++]);
                console.log('Code '+ (curAvail-1));
                outputCode(prefix);
                prefix = c;
            }

            if (curAvail > maxCode) {
                curBits++;
                maxCode = 1 << curBits;
            }
        }

        outputCode(prefix);
    }

    function readPixel() {
        if (curPos < _pixels.length)
            return _pixels[curPos++];
        return null;
    }

    function isStrInHashTable(s) {
        var has = false;
        hTab.forEach(e => {
            if (e[0] == s) has = true;
        });
        return has;
    }

    function outputCode(s) {
        var code = -1;
        hTab.forEach(e => {
            if (e[0] == s) code = e[1];
        });
        //console.log(code);

        curByte |= (code << curBit);
        curBit += curBits;
        if (curBit >= 8) {
            var outputByte = (curByte & 0xff);
            console.log(outputByte.toString(16));
            curByte >>= 8;
            curBit -= 8;
        }
    }
}

module.exports = GifLZWEncoder;