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
    function vertex(x, y, z, uvx, uvy) {
        positions.push(x);
        positions.push(y);
        positions.push(z);
        uvs.push(uvx);
        uvs.push(uvy);
        return pi++;
    }
    function uvx(index, vertex) {
        return index % textureWidth / textureWidth - incX[vertex] + 1 / textureWidth;
    }
    function uvy(index, vertex) {
        return 1 - (Math.floor((index - index % textureWidth) / textureWidth) / textureHeight - incY[vertex] + 1 / textureHeight);
    }
    function quad(a, b, c, d) {
        struct.indices.push(indices.push(a));
        struct.indices.push(indices.push(b));
        struct.indices.push(indices.push(c));
        struct.indices.push(indices.push(a));
        struct.indices.push(indices.push(c));
        struct.indices.push(indices.push(d));
    }
    function getBlock(x, y, z) {
        if (x < 0 || x >= chunkSize || y < 0 || y >= chunkSize || z < 0 || z >= chunkSize) {
            return -1;
        }
        return data[x + z * chunkSize + y * chunkSize * chunkSize];
    }
    function isBlockSolid(x, y, z) {
        var id = getBlock(x, y, z);
        if (self.blocks[id]) {
            return self.blocks[id].solid;
        } else if (id === -1) {
            return true;
        }
        return false;
    }
    var id, faces, i;
    for (var y = 0; y < chunkSize; y++) {
        for (var z = 0; z < chunkSize; z++) {
            for (var x = 0; x < chunkSize; x++) {
                id = data[j];
                if (self.blocks[id]) {
                    struct = {
                        indices: []
                    };
                    faces = self.blocks[id].faces;
                    if (!isBlockSolid(x + 1, y, z)) {
                        i = faces[0];
                        quad(vertex(x + 1, y, z, uvx(i, 0), uvy(i, 0)),
                            vertex(x + 1, y + 1, z, uvx(i, 1), uvy(i, 1)),
                            vertex(x + 1, y + 1, z + 1, uvx(i, 2), uvy(i, 2)),
                            vertex(x + 1, y, z + 1, uvx(i, 3), uvy(i, 3)));
                    }
                    if (!isBlockSolid(x - 1, y, z)) {
                        i = faces[1];
                        quad(vertex(x, y, z + 1, uvx(i, 0), uvy(i, 0)),
                            vertex(x, y + 1, z + 1, uvx(i, 1), uvy(i, 1)),
                            vertex(x, y + 1, z, uvx(i, 2), uvy(i, 2)),
                            vertex(x, y, z, uvx(i, 3), uvy(i, 3)));
                    }
                    if (!isBlockSolid(x, y + 1, z)) {
                        i = faces[2];
                        quad(vertex(x, y + 1, z, uvx(i, 0), uvy(i, 0)),
                            vertex(x, y + 1, z + 1, uvx(i, 1), uvy(i, 1)),
                            vertex(x + 1, y + 1, z + 1, uvx(i, 2), uvy(i, 2)),
                            vertex(x + 1, y + 1, z, uvx(i, 3), uvy(i, 3)));
                    }
                    if (!isBlockSolid(x, y - 1, z)) {
                        i = faces[3];
                        quad(vertex(x + 1, y, z, uvx(i, 0), uvy(i, 0)),
                            vertex(x + 1, y, z + 1, uvx(i, 1), uvy(i, 1)),
                            vertex(x, y, z + 1, uvx(i, 2), uvy(i, 2)),
                            vertex(x, y, z, uvx(i, 3), uvy(i, 3)));
                    }
                    if (!isBlockSolid(x, y, z + 1)) {
                        i = faces[4];
                        quad(vertex(x + 1, y, z + 1, uvx(i, 0), uvy(i, 0)),
                            vertex(x + 1, y + 1, z + 1, uvx(i, 1), uvy(i, 1)),
                            vertex(x, y + 1, z + 1, uvx(i, 2), uvy(i, 2)),
                            vertex(x, y, z + 1, uvx(i, 3), uvy(i, 3)));
                    }
                    if (!isBlockSolid(x, y, z - 1)) {
                        i = faces[5];
                        quad(vertex(x, y, z, uvx(i, 0), uvy(i, 0)),
                            vertex(x, y + 1, z, uvx(i, 1), uvy(i, 1)),
                            vertex(x + 1, y + 1, z, uvx(i, 2), uvy(i, 2)),
                            vertex(x + 1, y, z, uvx(i, 3), uvy(i, 3)));
                    }
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
