importScripts('../../lib/bson.js');
var BSON = bson().BSON;

var socket;

self.onmessage = function(e) {
  switch (e.data.type) {
    case 'connect':
      connect(e.data.host);
      break;
    case 'close':
      socket.close();
      break;
    case 'packet':
      socket.send(BSON.serialize(e.data.packet));
      break;
    default:
      console.error('Unregistered type', e.data.type);
  }
};

function connect(host) {
  socket = new WebSocket(host);
  socket.binaryType = 'arraybuffer';
  socket.onmessage = _onmessage;
  socket.onerror = _onerror;
  socket.onopen = _onopen;
  socket.onclose = _onclose;
}

function _onmessage(e) {
  var options = {};
  var packet = BSON.deserialize(new Uint8Array(e.data), options);
  self.postMessage({
    type: 'packet',
    packet: packet
  }, options.arrayBuffers);
}

function _onerror() {
  self.postMessage({type: 'error'});
}

function _onopen() {
  self.postMessage({type: 'open'});
}

function _onclose() {
  self.postMessage({type: 'close'});
}
