console.log('Loading MIDI...');

var inputs, outputs;

// @TODO: Make it configurable
var keys = {
    37: 0,
    39: 1,
    41: 2,
    43: 3,
    36: 4,
    38: 5,
    40: 6,
    42: 7,
    53: 8,
    55: 9,
    57: 10,
    59: 11,
    52: 12,
    54: 13,
    56: 14,
    58: 15
};

if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess()
    .then(function (access) {
        console.log('MIDI Access:', access);
        inputs = access.inputs.values();
        outputs = access.inputs.values();
        access.onstatechange = function(e) {
            // Print information about the (dis)connected MIDI controller
            console.log(e.port.name, e.port.manufacturer, e.port.state);
        };
        var receivemessage = function (e) {
            console.log('Received MIDI message', e);
            if (e.data[0] == 144) {
                console.log('Pressed note', e.data[1]);
                if (keys.hasOwnProperty(e.data[1])) {
                    playSlot(keys[e.data[1]], false);
                }
            }
            if (e.data[0] == 128) {
                console.log('Released note', e.data[1]);
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
