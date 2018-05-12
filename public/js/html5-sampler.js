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

var context;
var gainNode;
var bufferLoader;
var bufferL = new Array();
var sources = new Array();

var bsdkd = new Array();

window.onload = init;
window.onerror = onError;

function onError(e) {
    console.log(e);
}

function init() {
    console.log('Loading sampler...');
    // Fix up prefixing
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    context = new AudioContext();
    if (context) {
        gainNode = context.createGain ? context.createGain() : context.createGainNode();
        gainNode.connect(context.destination);
        gainNode.gain.value = 0.7;

        console.log('AudioContext created successfully.\nLoading sounds...');
        bufferLoader = new BufferLoader(
                context,
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
                finishedLoading
                );

        bufferLoader.load();
        return 0;
    }
    console.log('ERROR: The sampler cannot be started.');
}

function finishedLoading(bufferList) {
    // Create two sources and play them both together.
    //bufferList.forEach(function(entry) {
    //console.log(entry);

    //});
    for (index = 0; index < bufferList.length; ++index) {
        bufferL.push(bufferList[index]);
        //sources[index] = context.createBufferSource();
        //sources[index].buffer = bufferList[index];
        //sources[index].connect(context.destination);
    }
    console.log('Sounds loaded.');
    $('#sampler').show();
}

function playSound(buffer, time) {
    var source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);
    source.start(time);
    return source;
}

function playSlot(slot_id, no_cortar) {
    if (no_cortar !== undefined && no_cortar) {
        playSound(bufferL[slot_id], 0);
        return;
    }

    if (bsdkd.hasOwnProperty(slot_id)) {
        bsdkd[slot_id].stop();
    }

    if (bufferL.hasOwnProperty(slot_id)) {
        bsdkd[slot_id] = playSound(bufferL[slot_id], 0);
    }
}

$('#sampler button').click(function() {
    var id = $(this).attr('data-sampler-id');
    if (id) {
        playSlot(id-1);
    }
});

$(document).keypress(function(e) {
    var offset = 0;

    if ($('#9-16').hasClass('active')) {
        offset = 8;
    }
    if ($('#17-24').hasClass('active')) {
        offset = 16;
    }
    console.log('Pressed key', e.which);
    switch (e.which) {
        case 49:
            playSlot(0 + offset, e.ctrlKey);
            break;
        case 50:
            playSlot(1 + offset, e.ctrlKey);
            break;
        case 51:
            playSlot(2 + offset, e.ctrlKey);
            break;
        case 52:
            playSlot(3 + offset, e.ctrlKey);
            break;
        case 53:
            playSlot(4 + offset, e.ctrlKey);
            break;
        case 54:
            playSlot(5 + offset, e.ctrlKey);
            break;
        case 55:
            playSlot(6 + offset, e.ctrlKey);
            break;
        case 56:
            playSlot(7 + offset, e.ctrlKey);
            break;
        case 57:
            playSlot(8 + offset, e.ctrlKey);
            break;
        case 115:
            osc.play(0);
            break;
    }
});
