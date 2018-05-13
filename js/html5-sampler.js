/*
Copyright (c) 2014-2018 Jorge Matricali <jorgematricali@gmail.com>
All rights reserved.

This code is licensed under the MIT License.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

function BufferLoader(context, urlList, callback) {
    this.context = context;
    this.urlList = urlList;
    this.onload = callback;
    this.bufferList = [];
    this.loadCount = 0;
}

BufferLoader.prototype.loadBuffer = function(url, index) {
    // Load buffer asynchronously
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    var loader = this;

    request.onload = function() {
        // Asynchronously decode the audio file data in request.response
        loader.context.decodeAudioData(
            request.response,
            function(buffer) {
                if (!buffer) {
                    alert('error decoding file data: ' + url);
                    return;
                }
                loader.bufferList[index] = buffer;
                if (++loader.loadCount == loader.urlList.length)
                loader.onload(loader.bufferList);
            },
            function(error) {
                console.error('decodeAudioData error', error);
            }
        );
    };

    request.onerror = function() {
        alert('BufferLoader: XHR error');
    };

    request.send();
};

BufferLoader.prototype.load = function() {
    for (var i = 0; i < this.urlList.length; ++i) {
        this.loadBuffer(this.urlList[i], i);
    }
};

function arrayHasOwnIndex(array, prop) {
    return array.hasOwnProperty(prop) && /^0$|^[1-9]\d*$/.test(prop) && prop <= 4294967294; // 2^32 - 2
}

function Sampler() {
    this.context = null;
    this.gainNode = null;
    this.bufferLoader = null;
    this.bufferL = [];
    this.sourcers = [];
    this.bsdkd = [];
}

Sampler.prototype.finishedLoading = function (bufferList) {
    for (index = 0; index < bufferList.length; ++index) {
        sampler.bufferL.push(bufferList[index]);
    }
    console.log('Sounds loaded.');
    $('#sampler').show();
};

Sampler.prototype.init = function () {
    var sampler = this;
    console.log('Loading sampler...');
    // Fix up prefixing
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    sampler.context = new AudioContext();
    if (sampler.context) {
        sampler.gainNode = sampler.context.createGain ? sampler.context.createGain() : sampler.context.createGainNode();
        sampler.gainNode.connect(sampler.context.destination);
        sampler.gainNode.gain.value = 0.7;

        console.log('AudioContext created successfully.\nLoading sounds...');
        sampler.bufferLoader = new BufferLoader(
            sampler.context,
            [
                'audio/hardkick.wav',
                'audio/kick3.wav',
                'audio/Shatter.wav',
                'audio/snare3.wav',
                'audio/AirHorn-Reggae.mp3',
                'audio/Triple-Horn.mp3',
                'audio/Wooy.mp3',
                'audio/Boat-Land-Man.mp3',
                'audio/Ya-Man.mp3',
                'audio/Yes-JAH.mp3',
                'audio/The-Rockers-to-Rockers.mp3',
                'audio/Laseers002.wav',
                // ...
                'audio/Laseers003.wav',
                'audio/Mortal-Pulop.mp3',
                'audio/No-No-No-Intro-long.mp3',
                'audio/No-No-No-Intro-short.mp3',
            ],
            sampler.finishedLoading
        );

        sampler.bufferLoader.load();
        return 0;
    }
    console.log('ERROR: The sampler cannot be started.');
};

Sampler.prototype.playSound = function (buffer, time) {
    var sampler = this;
    var source = sampler.context.createBufferSource();
    source.buffer = buffer;
    source.connect(sampler.gainNode);
    source.start(time);
    return source;
};

Sampler.prototype.playSlot = function (slot_id, no_cortar) {
    var sampler = this;
    if (no_cortar !== undefined && no_cortar) {
        playSound(sampler.bufferL[slot_id], 0);
        return;
    }

    if (sampler.bsdkd.hasOwnProperty(slot_id)) {
        sampler.bsdkd[slot_id].stop();
    }

    if (sampler.bufferL.hasOwnProperty(slot_id)) {
        sampler.bsdkd[slot_id] = sampler.playSound(sampler.bufferL[slot_id], 0);
    }
};

Sampler.prototype.keyPress = function (e, off) {
    var offset = off | 0;
    console.log('Pressed key', e.which);
    switch (e.which) {
        case 49:
            sampler.playSlot(0 + offset, e.ctrlKey);
            break;
        case 50:
            sampler.playSlot(1 + offset, e.ctrlKey);
            break;
        case 51:
            sampler.playSlot(2 + offset, e.ctrlKey);
            break;
        case 52:
            sampler.playSlot(3 + offset, e.ctrlKey);
            break;
        case 53:
            sampler.playSlot(4 + offset, e.ctrlKey);
            break;
        case 54:
            sampler.playSlot(5 + offset, e.ctrlKey);
            break;
        case 55:
            sampler.playSlot(6 + offset, e.ctrlKey);
            break;
        case 56:
            sampler.playSlot(7 + offset, e.ctrlKey);
            break;
        case 57:
            sampler.playSlot(8 + offset, e.ctrlKey);
            break;
    }
};

Sampler.prototype.loadLocalSound = function (e) {
    var file = e.target.files[0];
    if (!file) {
        return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
        var contents = e.target.result;
        sampler.context.decodeAudioData(
            contents,
            function(buffer) {
                if (!buffer) {
                    alert('error decoding file data: ' + url);
                    return;
                }
                sampler.bufferL[0] = buffer;
                console.log('Archivo cargado :D mandale play');
            },
            function(error) {
                console.error('decodeAudioData error', error);
            }
        );
    };
    reader.readAsArrayBuffer(file);
};
