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
        var built = build(chunk.data);
        postMessage({
            position: chunk.position,
            attributes: built.attributes,
            structure: built.structure,
            data: chunk.data
        }, [chunk.data.buffer]);
        setTimeout(next, 0);
    }
}

self.onmessage = function(e) {
    queue = e.data.concat(queue);
    next();
};

function build(data) {
    var structure = {};
    var r = 100;
    var indices = new DynamicArray(Int16Array, r * 3);
    var positions = new DynamicArray(Float32Array, r * 3 * 3);
    var pi = 0;
    var uvs = new DynamicArray(Float32Array, r * 3 * 2);
    var j = 0;
    var struct;
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
            struct.indices.push(indices.push(a));
            struct.indices.push(indices.push(b));
            struct.indices.push(indices.push(c));
            struct.indices.push(indices.push(a));
            struct.indices.push(indices.push(c));
            struct.indices.push(indices.push(d));
        },
        getBlock: function(x, y, z) {
            if (x < 0 || x >= chunkSize || y < 0 || y >= chunkSize || z < 0 || z >= chunkSize) {
                return -1;
            }
            return data[x + z * chunkSize + y * chunkSize * chunkSize];
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
    var block;
    for (var y = 0; y < chunkSize; y++) {
        for (var z = 0; z < chunkSize; z++) {
            for (var x = 0; x < chunkSize; x++) {
                block = self.blocks[data[j]];
                if (block) {
                    struct = {
                        indices: []
                    };
                    block.model(block, x, y, z, f)
                    if (struct.indices.length) {
                        structure[j] = struct;
                    }
                }
                ++j;
            }
        }
    }
    indices = indices.concat();
    positions = positions.concat();
    uvs = uvs.concat();
    return {
        structure: structure,
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
