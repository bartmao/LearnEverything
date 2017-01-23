function GifLZWDecoder(codeStream, colorDepth) {
    var _colorDepth;
    var _codeStream;
    var curBits;
    var curByte;
    var curByteBitCount;
    var maxCode;
    var curCode;
    var hTab;
    var CLEAR, EOF;
    var curCodePos;

    _codeStream = codeStream;
    _colorDepth = colorDepth;
    curBit = 0;
    curByte = 0;
    curByteBitCount = 0;
    this.decode = decode;

    initTab();

    function initTab() {
        curBits = _colorDepth + 1;
        maxCode = 1 << curBits;
        hTab = [];
        CLEAR = (1 << _colorDepth);
        EOF = CLEAR + 1;
        for (var i = 0; i < CLEAR; ++i)
            hTab.push([i, i]);
        hTab.push([CLEAR, CLEAR]);
        hTab.push([EOF, EOF]);
        curCodePos = EOF + 1;
    }

    var out = "";

    function decode() {
        decompress();
        console.log(out.length);
    }

    function decompress() {
        var code = readCodeFromStream();
        outputStr(isCodeInHashTab(code));
        var oldCode = code;

        while ((code = readCodeFromStream()) != null) {
            if(code == CLEAR) {
                initTab();
                continue;
            }
            var str = isCodeInHashTab(code);
            if (str) {
                outputStr(str);
                var prefix = isCodeInHashTab(oldCode);
                var k = prefix.toString()[0];
                hTab.push([prefix + k, curCodePos++]);
                oldCode = code;
            }
            else {
                var prefix = isCodeInHashTab(oldCode);
                var k = prefix.toString()[0];
                outputStr(prefix + k);
                hTab.push([prefix + k, curCodePos++]);
                oldCode = code;
            }

            if (curCodePos >= maxCode) {
                curBits++;
                maxCode = 1 << curBits;
            }
        }
    }

    function isCodeInHashTab(c) {
        for (var i = 0; i < hTab.length; ++i) {
            if (hTab[i][1] == c) return hTab[i][0];
        }
        return null;
    }


    function outputStr(s) {
        out += s;
        console.log(s);
    }

    var curpos = 0;
    var curByteCounter = 0;
    function readCodeFromStream() {
        if (curpos < _codeStream.length && curByteBitCount < 8) {
            var byte = _codeStream[curpos];
            curByteCounter++;
            curpos++;
            curByte = (byte << curByteBitCount) | (curByte ? curByte : 0);
            curByteBitCount += 8;
        }
        return _readCode();

        function _readCode() {
            if (curpos == _codeStream.length && curByteBitCount < curBits) return null;

            var c = curByte & ((1 << curBits) - 1);
            curByte >>= curBits;
            curByteBitCount -= curBits;

            console.log('Code: ' + c);
            return c;
        }
    }
}

module.exports = GifLZWDecoder;