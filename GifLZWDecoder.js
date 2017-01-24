function GifLZWDecoder(codeStream, colorDepth, writeable) {
    var _colorDepth;
    var _codeStream;
    var _writeable;

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
    _writeable = writeable;
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
    var pixels = 0;

    function decode() {
        decompress();
        console.log('pixels: ' + pixels);
    }

    function decompress() {
        var code = readCodeFromStream();
        if(code == null) return;
        
        outputStr(isCodeInHashTab(code));
        var oldCode = code;

        while ((code = readCodeFromStream()) != null) {
            var str = isCodeInHashTab(code);
            if (str) {
                outputStr(str);
                var prefix = isCodeInHashTab(oldCode);
                var k = prefix.toString().split(',')[0];
                hTab.push([prefix + ',' + k, curCodePos++]);
                oldCode = code;
            }
            else {
                var prefix = isCodeInHashTab(oldCode);
                var k = prefix.toString().split(',')[0];
                outputStr(prefix + ',' + k);
                hTab.push([prefix + ',' + k, curCodePos++]);
                oldCode = code;
            }

            if (curCodePos >= maxCode) {
                if (curBits < 12) {
                    curBits++;
                    maxCode = 1 << curBits;
                }
                else {
                    initTab();
                    decompress();
                    return;
                }
            }
        }
    }

    function isCodeInHashTab(c) {
        for (var i = 0; i < hTab.length; ++i) {
            if (hTab[i][1] == c) return hTab[i][0].toString();
        }
        return null;
    }

    function outputStr(s) {

        out += s;
        if (_writeable) {
            s.split(',').forEach(i => {
                var buf = Buffer.from([i]);
                _writeable.write(buf);
                pixels++;
            });
        }
        //console.log(s);
    }

    var curpos = 0;
    var curByteCounter = 0;
    function readCodeFromStream() {
        while (curpos < _codeStream.length && curByteBitCount < curBits) {
            var byte = _codeStream[curpos];
            curByteCounter++;
            //console.warn('byte: '+ curByteCounter);
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

            //console.log('Code: ' + c);
            if(c == CLEAR){
                initTab();
                decompress();
                return;
            }
            return c;
        }
    }
}

module.exports = GifLZWDecoder;