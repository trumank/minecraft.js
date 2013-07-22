importScripts('blocks.js', 'dynamicArray.js');

var textureWidth = 16;
var textureHeight = 16;
var incX = [0, 0, 1 / textureWidth, 1 / textureWidth];
var incY = [0, 1 / textureHeight, 1 / textureHeight, 0];

function build(data, height) {
    var r = 100;
    var indecies = new DynamicArray(Int16Array, r * 3);
    var positions = new DynamicArray(Float32Array, r * 3 * 3);
    var pi = 0;
    var uvs = new DynamicArray(Float32Array, r * 3 * 2);
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
        indecies.push(a);
        indecies.push(b);
        indecies.push(c);
        indecies.push(a);
        indecies.push(c);
        indecies.push(d);
    }
    function getBlock(x, y, z) {
        if (x < 0 || x >= 16 || y < 0 || y >= 256 || z < 0 || z >= 16) {
            return -1;
        }
        return data[z + x * 16 + y * 16 * 16];
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
    for (var x = 0; x < 16; x++) {
        for (var y = height; y < height + 16; y++) {
            for (var z = 0; z < 16; z++) {
                id = getBlock(x, y, z);
                if (self.blocks[id]) {
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
                }
            }
        }
    }
    indecies = indecies.concat();
    positions = positions.concat();
    uvs = uvs.concat();
    return {
        index: {
            itemSize: 1,
            array: indecies,
            numItems: indecies.length
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

self.onmessage = function(e) {
    var attributes = [];
    for (var i = 0; i < 16; i++) {
        attributes[i] = build(e.data, i * 16);
    }
    postMessage({
        attributes: attributes,
        data: e.data
    }, [e.data.buffer]);
};
