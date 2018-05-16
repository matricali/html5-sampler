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
}

Sampler.prototype.finishedLoading = function (bufferList) {
    for (index = 0; index < bufferList.length; ++index) {
        sampler.bufferL.push(bufferList[index]);
    }
    console.log('Sounds loaded.');
    sampler.initUI();
};

Sampler.prototype.createButton = function (parent, id) {
    var button = document.createElement('button');
    button.classList.add('btn', 'btn-sampler');
    button.dataset.samplerId = id;
    button.innerHTML = 'Sampler ' + id;
    button.addEventListener('click', function (e) {
        var id = this.dataset.samplerId;
        if (id) {
            sampler.playSlot(id-1);
        }
    });

    var buttonLoad = document.createElement('a');
    buttonLoad.title = 'Load sound';
    buttonLoad.innerHTML = '📁 Load sound';
    buttonLoad.style.display = 'block';
    buttonLoad.dataset.samplerId = id;
    buttonLoad.style.cursor = 'pointer';
    buttonLoad.addEventListener('click', function (e) {
        var fi = document.createElement('input');
        fi.type = 'file';
        fi.id = 'file-input';
        fi.dataset.samplerId = this.dataset.samplerId;
        fi.addEventListener('change', sampler.loadLocalSound, false);
        fi.click();
    });

    var container = document.createElement('div');
    container.classList.add('imageContainer', 'col-md-4', 'col-xs-6');
    container.appendChild(buttonLoad);
    container.appendChild(button);
    console.log('Appending button #' + id);
    parent.appendChild(container);
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
            sampler.createButton(tabPane, x);
        }
        tabContent.appendChild(tabPane);
    }

    sampler.container.appendChild(visualizer);
    sampler.container.appendChild(samplerTabs);
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
    sampler.gainNode.gain.value = 0.7;

    console.log('AudioContext created successfully.\nLoading sounds...');
    sampler.bufferLoader = new BufferLoader(
        sampler.context,
        sampler.config.samples,
        sampler.finishedLoading
    );

    sampler.bufferLoader.load();
    return 0;
};

Sampler.prototype.playSound = function (buffer, time) {
    var sampler = this;
    var source = sampler.context.createBufferSource();
    source.buffer = buffer;
    source.connect(sampler.analyser);
    source.connect(sampler.gainNode);
    source.start(time);
    // window.setInterval(function(){
    //     console.log(source);
    // }, 500);
    // onPlaying: (playingProgress, maximumValue, currentValue) => {
    //         console.log('playing: ', playingProgress, maximumValue, currentValue);
    //         playerUI.setPlayingProgress(playingProgress);
    //     },
    return source;
};

Sampler.prototype.playSlot = function (slot_id, no_cortar) {
    var sampler = this;
    if (no_cortar !== undefined && no_cortar) {
        sampler.playSound(sampler.bufferL[slot_id], 0);
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
    var callClick = function (id, offset) {
        document.querySelector('button[data-sampler-id="' + (id + offset) + '"]').click();
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
