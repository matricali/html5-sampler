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
    this.container = null;
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

function Sampler(container, config) {
    'use strict';

    var slots = [];

    if (!(container instanceof HTMLElement)) {
        console.error(':@');
        return;
    }

    var defaultOptions = {
        options: {
            samplesPerPage: 8,
            samplesPages: 4
        },
        samples: []
    };
    this.config = Object.assign({}, defaultOptions, config);
    this.container = container;
    this.context = null;
    this.gainNode = null;
    this.bufferLoader = null;
    this.bufferL = [];
    this.sourcers = [];
    this.bsdkd = [];
    this.analyser = null;
    this.analyserCanvas = null;
    this.analyserCanvasCtx = null;
    this.slots = slots;
    this._volume = 70;
}

Sampler.prototype.finishedLoading = function (bufferList) {
    for (index = 0; index < bufferList.length; ++index) {
        sampler.bufferL.push(bufferList[index]);
    }
    console.log('Sounds loaded.');
    sampler.initUI();
};

Sampler.prototype.createButton = function (parent, id) {
    var buttonLoad = document.createElement('button');
    buttonLoad.title = 'Load sample';
    buttonLoad.classList.add('btn-load');
    buttonLoad.dataset.samplerId = id;
    buttonLoad.addEventListener('click', function (e) {
        var fi = document.createElement('input');
        fi.type = 'file';
        fi.id = 'file-input';
        fi.dataset.samplerId = this.dataset.samplerId;
        fi.addEventListener('change', sampler.loadLocalSound, false);
        fi.click();
    });

    var buttonLoop = document.createElement('button');
    buttonLoop.title = 'Toggle loop mode';
    buttonLoop.classList.add('btn-loop');
    buttonLoop.dataset.samplerId = id;
    buttonLoop.addEventListener('click', function (e) {
        var slotDiv = this.parentNode;
        if (slotDiv && slotDiv.dataset.loop === '1') {
            slotDiv.dataset.loop = 0;
            this.classList.remove('enabled');
            sampler.slots[this.dataset.samplerId-1].setProperty('loop', false);
            return;
        }
        slotDiv.dataset.loop = 1;
        this.classList.add('enabled');
        sampler.slots[this.dataset.samplerId-1].setProperty('loop', true);
    });

    var cutBy = document.createElement('input');
    cutBy.title = 'Cut by';
    cutBy.classList.add('input-cut-by');
    cutBy.type = 'number';
    cutBy.value = 0;
    cutBy.min = 0;
    cutBy.max = 64;
    cutBy.dataset.samplerId = id;
    cutBy.addEventListener('input', function (e) {
        var value = e.target.value > 0 ? e.target.value - 1: false;
        sampler.slots[e.target.dataset.samplerId-1].setProperty('cut', value);
    });

    var buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('pad-container', 'col-md-4', 'col-xs-6');
    buttonsContainer.appendChild(buttonLoad);
    buttonsContainer.appendChild(buttonLoop);
    buttonsContainer.appendChild(cutBy);

    var pad = new SamplerPad(id, this.context, this.gainNode);
    buttonsContainer.appendChild(pad.node());
    parent.appendChild(buttonsContainer);
    return pad;
};

Sampler.prototype.onTabChange = function (e) {
    console.log('Switching tab...');
    var id = this.getAttribute('aria-controls');

    var tabPanes = document.querySelectorAll('.tab-pane');
    [].forEach.call(tabPanes, function (e) {
        e.classList.remove('active');
    });

    var tabs = document.querySelectorAll('a[data-toggle="tab"]');
    [].forEach.call(tabs, function (e) {
        e.parentNode.classList.remove('active');
        if (e.getAttribute('aria-controls') == id) {
            e.parentNode.classList.add('active');
        }
    });

    if (id) {
        var elm = document.getElementById(id);
        elm.classList.add('active');
    }
};

Sampler.prototype.initUI = function () {
    console.log('Initializing sampler UI...');
    // Creating tabs and sampler buttons
    var samplerTabs = document.createElement('ul');
    samplerTabs.classList.add('nav', 'nav-tabs');
    samplerTabs.role = 'tablist';

    var samplerArea = document.createElement('div');
    samplerArea.id = 'sampler';
    samplerArea.style.display = 'none';
    samplerArea.classList.add('container-fluid');

    var tabContent = document.createElement('div');
    tabContent.classList.add('tab-content');

    var visualizer = document.createElement('canvas');
    visualizer.id = 'visualizer';
    visualizer.style.width = '100%';
    visualizer.style.height = '100px';
    visualizer.style.display = 'block';

    sampler.analyserCanvas = visualizer;
    sampler.analyserCanvasCtx = visualizer.getContext('2d');

    var onVolumeChange = function (e) {
        sampler.setMasterVolume(e.target.value);
    };

    var masterVolumeInput = document.createElement('input');
    masterVolumeInput.id = 'masterVolume';
    masterVolumeInput.type = 'range';
    masterVolumeInput.min = 0;
    masterVolumeInput.max = 100;
    masterVolumeInput.style.display = 'inline-block';
    masterVolumeInput.value = this._volume;
    masterVolumeInput.onchange = onVolumeChange;
    masterVolumeInput.oninput = onVolumeChange;

    var volumeLabel = document.createElement('a');
    volumeLabel.innerHTML = '🔈';
    volumeLabel.addEventListener('click', function (e) {
        sampler.setMasterVolume(0);
    });

    var n = 0;
    for (var i = 0; i < sampler.config.options.samplesPages; i++) {
        console.log('Pagina #'+(i+1));

        var min = (i * sampler.config.options.samplesPerPage) + 1;
        var max = min + sampler.config.options.samplesPerPage - 1;
        var name = min + '-' + max;

        var tab = document.createElement('li');
        tab.role = 'presentation';
        tab.classList.add('active');

        var tabLink = document.createElement('a');
        tabLink.href = '#' + name;
        tabLink.setAttribute('aria-controls', name);
        tabLink.role = 'tab';
        tabLink.dataset.toggle = 'tab';
        tabLink.innerHTML = name;
        tabLink.addEventListener('click', sampler.onTabChange);

        tab.appendChild(tabLink);
        samplerTabs.appendChild(tab);

        var tabPane = document.createElement('div');
        tabPane.role = 'tabpanel';
        tabPane.classList.add('tab-pane');
        tabPane.id = name;

        for (var x = min; x <= max; x++) {
            this.slots[n] = sampler.createButton(tabPane, x);
            n = n + 1;
        }
        tabContent.appendChild(tabPane);
    }

    sampler.container.appendChild(visualizer);
    sampler.container.appendChild(samplerTabs);
    sampler.container.appendChild(volumeLabel);
    sampler.container.appendChild(masterVolumeInput);
    sampler.container.appendChild(tabContent);



    if (samplerTabs.firstChild) {
        samplerTabs.firstChild.firstChild.click();
    }

    sampler.container.style.display = 'block';

    sampler.visualize();
};

Sampler.prototype.init = function () {
    var sampler = this;

    while (sampler.container.firstChild){
        sampler.container.removeChild(sampler.container.firstChild);
    }

    console.log('Loading sampler...');
    // Fix up prefixing
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    sampler.context = new AudioContext();
    sampler.analyser = sampler.context.createAnalyser();

    if (!sampler.context) {
        console.log('ERROR: The sampler cannot be started.');
        return -1;
    }

    sampler.context.resume().then(function () {
        console.log('Audio context playback resumed successfully');
    });

    sampler.gainNode = sampler.context.createGain ? sampler.context.createGain() : sampler.context.createGainNode();
    sampler.gainNode.connect(sampler.context.destination);
    sampler.gainNode.connect(sampler.analyser);
    sampler.setMasterVolume(sampler._volume);

    console.log('AudioContext created successfully.\nLoading sounds...');
    sampler.bufferLoader = new BufferLoader(
        sampler.context,
        sampler.config.samples,
        sampler.finishedLoading
    );

    sampler.bufferLoader.load();
    return 0;
};

Sampler.prototype.playSlot = function (slot_id, velocity) {
    this.slots[slot_id].play(this.bufferL[slot_id], velocity);
};

Sampler.prototype.keyPress = function (e, off, r) {
    var sampler = this;
    var offset = off | 0;
    var release = r | false;
    console.log(release ? 'Released key' : 'Pressed key', e.which);
    var callClick = function (id, offset) {
        var mue = new MouseEvent(release ? 'mouseup' : 'mousedown', {'bubbles': true, 'cancellable': true, 'buttons': 1});
        sampler.slots[id - 1 + offset]._button.dispatchEvent(mue);
    };
    switch (e.which) {
        case 49:
            callClick(1, offset);
            break;
        case 50:
            callClick(2, offset);
            break;
        case 51:
            callClick(3, offset);
            break;
        case 52:
            callClick(4, offset);
            break;
        case 53:
            callClick(5, offset);
            break;
        case 54:
            callClick(6, offset);
            break;
        case 55:
            callClick(7, offset);
            break;
        case 56:
            callClick(8, offset);
            break;
        case 57:
            callClick(9, offset);
            break;
        case 114: // R - resume playback
            sampler.context.resume().then(function () {
                console.log('Audio context playback resumed successfully');
            });
            break;
    }
};

Sampler.prototype.loadLocalSound = function (e) {
    var slotId = this.dataset.samplerId;
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
                sampler.bufferL[slotId-1] = buffer;
                console.log('Loaded file :D');
            },
            function(error) {
                console.error('decodeAudioData error', error);
            }
        );
    };
    reader.readAsArrayBuffer(file);
};


Sampler.prototype.visualize = function () {
    var analyser = sampler.analyser;
    var canvas = sampler.analyserCanvas;
    var canvasCtx = sampler.analyserCanvasCtx;

    WIDTH = canvas.width;
    HEIGHT = canvas.height;
    analyser.fftSize = 2048;
    var bufferLength = analyser.fftSize;
    console.log(bufferLength);
    var dataArray = new Uint8Array(bufferLength);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    var draw = function() {
        var grad = canvasCtx.createLinearGradient(50, 50, 150, 150);
        grad.addColorStop(0, 'red');
        grad.addColorStop(0.5, 'yellow');
        grad.addColorStop(1, 'green');

        drawVisual = requestAnimationFrame(draw);
        analyser.getByteTimeDomainData(dataArray);
        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = grad; //'rgb(200, 0, 0)';
        canvasCtx.beginPath();

        var sliceWidth = WIDTH * 1.0 / bufferLength;
        var x = 0;

        for(var i = 0; i < bufferLength; i++) {
            var v = dataArray[i] / 128.0;
            var y = v * HEIGHT/2;

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        canvasCtx.lineTo(canvas.width, canvas.height/2);
        canvasCtx.stroke();
    };

    draw();
};

Sampler.prototype.loadLocalSound = function (e) {
    var slotId = this.dataset.samplerId;
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
                sampler.bufferL[slotId-1] = buffer;
                console.log('Loaded file :D');
            },
            function(error) {
                console.error('decodeAudioData error', error);
            }
        );
    };
    reader.readAsArrayBuffer(file);
};


Sampler.prototype.stopAll = function () {
    [].forEach.call(this.slots, function (e) {
        if (e._source !== null) {
            e._source.stop();
        }
    });
};

Sampler.prototype.setMasterVolume = function (value) {
    var input = document.getElementById('masterVolume');
    this._volume = value;
    this.gainNode.gain.value = value / 100;
    if (input) {
        input.value = value;
    }
};
