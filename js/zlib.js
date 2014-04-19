importScripts('../lib/zlib.min.js');

self.onmessage = function (e) {
	postMessage({
		data: new Zlib.Inflate(e.data.data).decompress(),
		id: e.data.id
	});
};