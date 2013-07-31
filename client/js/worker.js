importScripts('blocks.js', 'dynamicArray.js');

var chunkSize = 16;
var textureWidth = 16;
var textureHeight = 16;
var incX = [0, 0, 1 / textureWidth, 1 / textureWidth];
var incY = [0, 1 / textureHeight, 1 / textureHeight, 0];

var queue = [];

function next() {
    if (queue.length > 0) {
        var chunk = queue.pop();
        var built = build(chunk.blocks, chunk.metadata);
        postMessage({
            position: chunk.position,
            attributes: built.attributes,
            blocks: chunk.blocks,
            metadata: chunk.metadata
        }, [chunk.blocks.buffer, chunk.metadata.buffer]);
        setTimeout(next, 0);
    }
}

self.onmessage = function(e) {
    queue = e.data.concat(queue);
    next();
};

function build(blocks, metadata) {
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
                return -1;
            }
            return blocks[x + z * chunkSize + y * chunkSize * chunkSize];
        },
        getMetadata: function(x, y, z) {
            if (x < 0 || x >= chunkSize || y < 0 || y >= chunkSize || z < 0 || z >= chunkSize) {
                return -1;
            }
            var b = blocks[(x + z * chunkSize + y * chunkSize * chunkSize) >> 1];
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
                if (block) {
                    struct = {
                        indices: []
                    };
                    meta = (x % 2 ? metadata[k] >> 4 : metadata[k]) & 0xf;
                    block.model(block, meta, x, y, z, f);
                }
                if (x % 2) {
                    ++k;
                }
                ++j;
            }
        }
    }
    indices = indices.concat();
    positions = positions.concat();
    uvs = uvs.concat();
    return {
        attributes: {
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
        }
    };
}
