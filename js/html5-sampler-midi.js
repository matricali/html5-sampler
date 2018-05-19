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

console.log('Loading MIDI...');

var inputs, outputs;

// @TODO: Make it configurable
var keys = {
    // 1-1
    37: 0,
    39: 1,
    41: 2,
    43: 3,
    36: 4,
    38: 5,
    40: 6,
    42: 7,
    53: 8,
    // 1–2
    45: 9,
    47: 10,
    49: 11,
    51: 12,
    44: 13,
    46: 14,
    48: 15,
    50: 16,
    // 2-1
    53: 17,
    55: 18,
    57: 19,
    59: 20,
    52: 21,
    54: 22,
    56: 23,
    58: 24,
    // 2-2
    61: 25,
    63: 26,
    65: 27,
    67: 28,
    60: 29,
    62: 30,
    64: 31,
    66: 32
};

if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess()
    .then(function (access) {
        console.log('MIDI Access:', access);
        inputs = access.inputs.values();
        outputs = access.inputs.values();

        var receivemessage = function (e) {
            console.log('Received MIDI message', e);
            if (!e.data) {
                return;
            }
            if (e.data[0] == 144) {
                console.log('Pressed note', e.data[1]);
                if (keys.hasOwnProperty(e.data[1])) {
                    if (sampler) {
                        sampler.playSlot(keys[e.data[1]], false);
                    }
                }
            }
            if (e.data[0] == 128) {
                console.log('Released note', e.data[1]);
            }
        };

        access.onstatechange = function(e) {
            // Print information about the (dis)connected MIDI controller
            console.log(e.port.name, e.port.manufacturer, e.port.state, e);
            if (e.port.state === 'connected') {
                console.log('Conectado, vamo a agregarle la funcion');
                e.port.onstatechange = receivemessage;
            }
        };

        for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
            // each time there is a midi message call the onMIDIMessage function
            input.value.onmidimessage = receivemessage;
        }
    })
    .catch(function (err) {
        console.log('error:',err);
    });
} else {
    console.log('The browser doesnt support MIDI');
}
