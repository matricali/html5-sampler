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

function SamplerPad(id, context, destination) {
	'use strict';

	var defaultVolume = 100;
	var canvas = document.createElement('button');

	var button = document.createElement('button');
    button.classList.add('btn', 'btn-sampler');
    button.dataset.samplerId = id;
    button.innerHTML = 'Sampler ' + id;

	var gainNode = context.createGain ? context.createGain() : context.createGainNode();
    gainNode.connect(destination);
    gainNode.gain.value = defaultVolume / 100;

    var div = document.createElement('div');
    div.id = 'sampler-pad' + id;
    div.dataset.samplerPadId = id;
    div.appendChild(button);

	var pad = {
		'_id': id,
		'_canvas': canvas,
		'_div': div,
		'_button': button,
		'_listeners': [],
		'_mousebutton': false,
		'_context': context,
		'_gainNode': gainNode,
		'_playing': false,
		'_source': null,

		/*
		 * Properties of this pad.
		 */
		'_properties': {
			'loop': false,
			'volume': defaultVolume,
			'cut': id,
		},

		/*
		 * Adds an event listener.
		 */
		'addListener': function(listener) {
			var listeners = this._listeners;
			listeners.push(listener);
		},

		/*
		 * Returns the value of a property of this pad.
		 */
		'getProperty': function(key) {
			return this._properties[key];
		},

		/*
		 * Return the DOM node representing this pad.
		 */
		'node': function() {
			var div = this._div;
			return div;
		},

		/*
		 * Redraw the pad on the canvas.
		 */
		'redraw': function() {
			// this.resize();
			// var properties = this._properties;
			//
			// var canvas = this._canvas;
			// var ctx = canvas.getContext('2d');
			// var width = 0;
			// var height = 0;
			//
			// /*
			//  * Clear the canvas.
			//  */
			// ctx.clearRect(0, 0, width, height);
		},

		/*
		 * This is called as the canvas or the surrounding DIV is resized.
		 */
		'resize': function() {
			var canvas = this._canvas;
			canvas.style.height = '100%';
			canvas.style.width = '100%';
			canvas.height = this._height;
			canvas.width = this._width;
		},

		/*
		 * Sets the value of a property of this pad.
		 */
		'setProperty': function(key, value) {
			this._properties[key] = value;
			if (key == 'loop') {
				if (this._source !== null) {
					this._source.loop = value;
				}
			}
			this.redraw();
		},

		'click': function (velocity) {
			var id = this._id;
	        if (id) {
	            sampler.playSlot(id-1, velocity);
	        }
		},

		'play': function(buffer, velocity) {
			console.log('Playing slot', this._id, velocity);
			var slot = this;
			var button = this._button;

		    var properties = this._properties;

			if (typeof velocity === 'undefined') {
				velocity = 100;
			}

			if (this._source !== null) {
				if (this._playing && properties.loop) {
					// Toggle loop
					this._source.stop();
					this._source = null;
					return;
				}
			}

			if (this._properties.cut !== false) {
				var current = this._properties.cut;
				var currentId = this._id;
				[].forEach.call(sampler.slots, function (e) {
					if (e._properties.cut === current) {
						if (e._source !== null) {
							if (e._id === currentId) {
								e._source.onended = null;
							}
							e._source.stop();
						}
					}
				});
			}

			var velocityGainNode = context.createGain ? context.createGain() : context.createGainNode();
		    velocityGainNode.connect(this._gainNode);
		    velocityGainNode.gain.value = velocity / 100;

			var source = this._context.createBufferSource();
		    source.buffer = buffer;
		    source.connect(velocityGainNode);
		    source.loop = properties.loop;
			source.onended = function (e) {
				slot._playing = false;
				button.classList.remove('playing');
			}
			this._playing = true;
			button.classList.add('playing');
			source.start(0);
			this._source = source;
		}
	};

	/*
	 * Try to disable context menu on right-click.
	 * This won't work on most browsers.
	 */
	var contextMenuListener = function(e) {
		return false;
	};

	/*
	 * This is called when the mouse button is depressed.
	 */
	var mouseDownListener = function(e) {
		console.log('ASD', e);
		var btn = e.buttons;

		/*
		 * It is a left-click.
		 */
		if (btn === 1) {
			e.preventDefault();
			pad._button.classList.add('pressed');
			pad.click();
			pad._mousebutton = true;
		}
	};

	/*
	 * This is called when the mouse button is released.
	 */
	var mouseUpListener = function(e) {
		// @TODO: Implementar trigger manteniendo apretado
		pad._button.classList.remove('pressed');
	};

	/*
	 * This is called when the size of the canvas changes.
	 */
	var resizeListener = function(e) {
		pad.redraw();
	};

	button.addEventListener('contextmenu', contextMenuListener);
	button.addEventListener('mousedown', mouseDownListener);
	button.addEventListener('mouseup', mouseUpListener);
	button.addEventListener('resize', resizeListener);
	button.addEventListener('touchstart', mouseDownListener);
	button.addEventListener('touchend', mouseUpListener);
	return pad;
}
