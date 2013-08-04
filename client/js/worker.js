importScripts('blocks.js', 'dynamicArray.js');

var chunkSize = 16;
var textureWidth = 16;
var textureHeight = 16;
var incX = [0, 0, 1 / textureWidth, 1 / textureWidth];
var incY = [0, 1 / textureHeight, 1 / textureHeight, 0];

var queue = [];
var chunks = {};
function positionHashObj(pos) {
    return pos.x + '_' + pos.y + '_' + pos.z;
}
function positionHash(x, y, z) {
    return x + '_' + y + '_' + z;
}

function mod(n1, n2) {
    return ((n1 % n2) + n2) % n2;
}

function next() {
    if (queue.length > 0) {
        var chunk = queue.pop();
        postMessage({
            position: chunk.position,
            attributes: build(chunk)
        });
        setTimeout(next, 0);
    } else {
        var chunkHashes = Object.keys(chunks);
        for (var i = 0; i < chunkHashes.length; i++) {
            var chunk = chunks[chunkHashes[i]];
            postMessage({
                position: chunk.position,
                blocks: chunk.blocks,
                metadata: chunk.metadata
            }, [chunk.blocks.buffer, chunk.metadata.buffer]);
            delete chunks[positionHashObj(chunk.position)];
        }
    }
}

self.onmessage = function(e) {
    var n = e.data;
    for (var i = 0; i < n.length; i++) {
        n[i].built = false;
        chunks[positionHashObj(n[i].position)] = n[i];
        if (n[i].build) {
            queue.unshift(n[i]);
        }
    }
    next();
};

function build(chunk) {
    var pos = chunk.position;
    var blocks = chunk.blocks;
    var metadata = chunk.metadata;
    var r = 100;
    var indices = new DynamicArray(Int16Array, r * 3);
    var positions = new DynamicArray(Float32Array, r * 3 * 3);
    var pi = 0;
    var uvs = new DynamicArray(Float32Array, r * 3 * 2);
    var j = 0;
    var f = {
        uvx: function(index, vertex) {
            return index % textureWidth / textureWidth - incX[vertex] + 1 / textureWidth;
        },
        uvy: function(index, vertex) {
            return 1 - (Math.floor((index - index % textureWidth) / textureWidth) / textureHeight - incY[vertex] + 1 / textureHeight);
        },
        vertex: function(x, y, z, uvx, uvy) {
            positions.push(x);
            positions.push(y);
            positions.push(z);
            uvs.push(uvx);
            uvs.push(uvy);
            return pi++;
        },
        quad: function(a, b, c, d) {
            indices.push(a);
            indices.push(b);
            indices.push(c);
            indices.push(a);
            indices.push(c);
            indices.push(d);
        },
        getBlock: function(x, y, z) {
            if (x < 0 || x >= chunkSize || y < 0 || y >= chunkSize || z < 0 || z >= chunkSize) {
                var cx = (x + chunkSize * pos.x) >> 4;
                var cy = (y + chunkSize * pos.y) >> 4;
                var cz = (z + chunkSize * pos.z) >> 4;
                var c = chunks[positionHash(cx, cy, cz)];
                if (!c) {
                    return -1;
                }
                return c.blocks[mod(x, chunkSize) + mod(z, chunkSize) * chunkSize + mod(y, chunkSize) * chunkSize * chunkSize];
            }
            // special case for this chunk for optimization
            return blocks[x + z * chunkSize + y * chunkSize * chunkSize];
        },
        getMetadata: function(x, y, z) {
            var arr;
            if (x < 0 || x >= chunkSize || y < 0 || y >= chunkSize || z < 0 || z >= chunkSize) {
                var cx = (x + chunkSize * pos.x) >> 4;
                var cy = (y + chunkSize * pos.y) >> 4;
                var cz = (z + chunkSize * pos.z) >> 4;
                var c = chunks[positionHash(cx, cy, cz)];
                if (!c) {
                    return -1;
                }
                arr = c.metadata;
            } else {
                // special case for this chunk for optimization
                arr = chunk.metadata
            }
            var b = blocks[(mod(x, chunkSize) + mod(z, chunkSize) * chunkSize + mod(y, chunkSize) * chunkSize * chunkSize) >> 1];
            if (x % 2) {
                return b >> 4;
            }
            return b & 0xf;
        },
        isBlockSolid: function(x, y, z) {
            var id = f.getBlock(x, y, z);
            if (self.blocks[id]) {
                return self.blocks[id].solid;
            } else if (id === -1) {
                return true;
            }
            return false;
        }
    };
    var block, meta, k = 0;
    for (var y = 0; y < chunkSize; y++) {
        for (var z = 0; z < chunkSize; z++) {
            for (var x = 0; x < chunkSize; x++) {
                block = self.blocks[blocks[j]];
                meta = (x % 2 ? metadata[k++] >> 4 : metadata[k]) & 0xf;
                if (block) {
                    block.model(block, meta, x, y, z, f);
                }
                ++j;
            }
        }
    }
    indices = indices.concat();
    positions = positions.concat();
    uvs = uvs.concat();
    chunk.built = true;
    return {
        index: {
            itemSize: 1,
            array: indices,
            numItems: indices.length
        },
        position: {
            itemSize: 3,
            array: positions,
            numItems: positions.length
        },
        uv: {
            itemSize: 2,
            array: uvs,
            numItems: uvs.length
        }
    };
}
