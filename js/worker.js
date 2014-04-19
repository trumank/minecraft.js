importScripts('blocks.js', 'dynamicArray.js');

var chunkSize = 16;
var size;
var tileWidth;
var tileHeight;
var incX;
var incY;
var indexes;

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
                metadata: chunk.metadata,
                blockLight: chunk.blockLight,
                skyLight: chunk.skyLight
            }, [chunk.blocks.buffer, chunk.metadata.buffer, chunk.blockLight.buffer, chunk.skyLight.buffer]);
            delete chunks[positionHashObj(chunk.position)];
        }
    }
}

self.onmessage = function(e) {
    if (e.data.config) {
        size = e.data.size;
        tileWidth = e.data.width;
        tileHeight = e.data.height;
        incX = [0, 0, 1 / size, 1 / size];
        incY = [0, 1 / size, 1 / size, 0];
        indexes = e.data.index;
    }
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
    var blockLight = chunk.blockLight;
    var skyLight = chunk.skyLight;
    var r = 100;
    var indices = new DynamicArray(Int16Array, r * 3);
    var positions = new DynamicArray(Float32Array, r * 3 * 3);
    var pi = 0;
    var colors = new DynamicArray(Float32Array, r * 3 * 3);
    var uvs = new DynamicArray(Float32Array, r * 3 * 2);
    var j = 0;
    var f = {
        index: function (n) {
            return indexes[n];
        },
        uvx: function(index, vertex) {
            return index % size / size - incX[vertex] + 1 / size;
        },
        uvy: function(index, vertex) {
            return 1 - (Math.floor((index - index % size) / size) / size - incY[vertex] + 1 / size);
        },
        vertex: function(x, y, z, r, g, b, uvx, uvy) {
            positions.push(x);
            positions.push(y);
            positions.push(z);
            colors.push(r, g, b);
            colors.push(r, g, b);
            colors.push(r, g, b);
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
        squad: function (n, x1, y1, z1, s1, x2, y2, z2, s2, x3, y3, z3, s3, x4, y4, z4, s4) {
            var i = f.index(n);
            var ac = s1 / 12 + 0.2;
            var a = f.vertex(x1, y1, z1, ac, ac, ac, f.uvx(i, 0), f.uvy(i, 0));
            var bc = s2 / 12 + 0.2;
            var b = f.vertex(x2, y2, z2, bc, bc, bc, f.uvx(i, 1), f.uvy(i, 1));
            var cc = s3 / 12 + 0.2;
            var c = f.vertex(x3, y3, z3, cc, cc, cc, f.uvx(i, 2), f.uvy(i, 2));
            var dc = s4 / 12 + 0.2;
            var d = f.vertex(x4, y4, z4, dc, dc, dc, f.uvx(i, 3), f.uvy(i, 3));
            if (s1 + s3 > s2 + s4) {
                indices.push(a);
                indices.push(b);
                indices.push(c);
                indices.push(a);
                indices.push(c);
                indices.push(d);
            } else {
                indices.push(b);
                indices.push(c);
                indices.push(d);
                indices.push(b);
                indices.push(d);
                indices.push(a);
            }
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
        getProp: function(x, y, z, prop) {
            var arr;
            if (x < 0 || x >= chunkSize || y < 0 || y >= chunkSize || z < 0 || z >= chunkSize) {
                var cx = (x + chunkSize * pos.x) >> 4;
                var cy = (y + chunkSize * pos.y) >> 4;
                var cz = (z + chunkSize * pos.z) >> 4;
                var c = chunks[positionHash(cx, cy, cz)];
                if (!c) {
                    return -1;
                }
                arr = c[prop];
            } else {
                // special case for this chunk for optimization
                arr = chunk[prop]
            }
            var b = arr[(mod(x, chunkSize) + mod(z, chunkSize) * chunkSize + mod(y, chunkSize) * chunkSize * chunkSize) >> 1];
            return (x % 2 ? b >> 4 : b) & 0xf;
        },
        getMetadata: function (x, y, z) {
            return f.getProp(x, y, z, 'metadata');
        },
        getBlockLight: function (x, y, z) {
            return f.getProp(x, y, z, 'blockLight');
        },
        getSkyLight: function (x, y, z) {
            return f.getProp(x, y, z, 'skyLight');
        },
        isBlockOpaque: function(x, y, z) {
            var id = f.getBlock(x, y, z);
            if (self.blocks[id]) {
                return self.blocks[id].solid && !self.blocks[id].transparent;
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
    colors = colors.concat();
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
        color: {
            itemSize: 3,
            array: colors,
            numItems: colors.length
        },
        uv: {
            itemSize: 2,
            array: uvs,
            numItems: uvs.length
        }
    };
}
