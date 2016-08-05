importScripts('../blocks.js', '../lib.js');

var chunkSize = 16;
var config;

var uvx = ['x1', 'x1', 'x2', 'x2'];
var uvy = ['y1', 'y2', 'y2', 'y1'];

function positionHash(x, y, z) {
  return x + '_' + y + '_' + z;
}

function mod(n1, n2) {
  return ((n1 % n2) + n2) % n2;
}

self.onmessage = function(e) {
  if (e.data.config) {
    config = e.data;
  } else {
    var chunk = e.data;
    postMessage({
      position: chunk.position,
      data: build(chunk),
      blocks: chunk.blocks,
      blockLight: chunk.blockLight,
      skyLight: chunk.skyLight
    }, [chunk.blocks.buffer, chunk.blockLight.buffer, chunk.skyLight.buffer]);
  }
};

function build(chunk) {
  var pos = chunk.position;
  var blocks = chunk.blocks;
  var blockLight = chunk.blockLight;
  var skyLight = chunk.skyLight;
  var culled = new Uint8Array(chunkSize * chunkSize * chunkSize);
  var indices = new MC.DynamicArray(Int16Array);
  var positions = new MC.DynamicArray(Float32Array);
  var pi = 0;
  var colors = new MC.DynamicArray(Float32Array);
  var uvs = new MC.DynamicArray(Float32Array);
  var j = 0;
  var f = {
    uvx: function(id, vertex) {
      return config.terrainRects[id][uvx[vertex]];
    },
    uvy: function(id, vertex) {
      return config.terrainRects[id][uvy[vertex]];
    },
    vertex: function(x, y, z, r, g, b, uvx, uvy) {
      positions.push(x);
      positions.push(y);
      positions.push(z);
      r = (r * 95 + 19) / 115;
      g = (g * 78 + 15) / 94;
      b = (b * 40 + 16) / 57;
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
      //var i = f.index(n);
      var ac = s1 / 16;
      var a = f.vertex(x1, y1, z1, ac, ac, ac, f.uvx(n, 0), f.uvy(n, 0));
      var bc = s2 / 16;
      var b = f.vertex(x2, y2, z2, bc, bc, bc, f.uvx(n, 1), f.uvy(n, 1));
      var cc = s3 / 16;
      var c = f.vertex(x3, y3, z3, cc, cc, cc, f.uvx(n, 2), f.uvy(n, 2));
      var dc = s4 / 16;
      var d = f.vertex(x4, y4, z4, dc, dc, dc, f.uvx(n, 3), f.uvy(n, 3));
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
    squade: function (n, x1, y1, z1, s1, x2, y2, z2, s2, x3, y3, z3, s3, x4, y4, z4, s4) {
      //var i = f.index(n);
      var ac = s1 / 16;
      var a = f.vertex(x1, y1, z1, ac, ac, ac, n.x1, n.y1);
      var bc = s2 / 16;
      var b = f.vertex(x2, y2, z2, bc, bc, bc, n.x1, n.y2);
      var cc = s3 / 16;
      var c = f.vertex(x3, y3, z3, cc, cc, cc, n.x2, n.y2);
      var dc = s4 / 16;
      var d = f.vertex(x4, y4, z4, dc, dc, dc, n.x2, n.y1);
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
        //throw new Error('wtf');
        /*var cx = (x + chunkSize * pos.x) >> 4;
        var cy = (y + chunkSize * pos.y) >> 4;
        var cz = (z + chunkSize * pos.z) >> 4;
        var c = chunks[positionHash(cx, cy, cz)];
        if (!c) {
          return -1;
        }
        return c.blocks[mod(x, chunkSize) + mod(z, chunkSize) * chunkSize + mod(y, chunkSize) * chunkSize * chunkSize] >> 4;*/
        return 0;
      }
      // special case for this chunk for optimization
      return blocks[x + z * chunkSize + y * chunkSize * chunkSize];
    },
    getProp: function(x, y, z, prop) {
      var arr;
      if (x < 0 || x >= chunkSize || y < 0 || y >= chunkSize || z < 0 || z >= chunkSize) {
        /*throw new Error('wtf');
        var cx = (x + chunkSize * pos.x) >> 4;
        var cy = (y + chunkSize * pos.y) >> 4;
        var cz = (z + chunkSize * pos.z) >> 4;
        var c = chunks[positionHash(cx, cy, cz)];
        if (!c) {
          return -1;
        }
        arr = c[prop];*/
        return 0;
      } else {
        // special case for this chunk for optimization
        arr = chunk[prop];
      }
      var b = arr[(mod(x, chunkSize) + mod(z, chunkSize) * chunkSize + mod(y, chunkSize) * chunkSize * chunkSize) >> 1];
      return (x % 2 ? b >> 4 : b) & 0xf;
    },
    getBlockLight: function (x, y, z) {
      //return 10;
      //return f.getProp(x, y, z, 'blockLight');
      return f.getProp(x, y, z, 'blockLight') | f.getProp(x, y, z, 'skyLight');
    },
    getSkyLight: function (x, y, z) {
      return f.getProp(x, y, z, 'skyLight');
    },
    isBlockOpaque: function(x, y, z) {
      var id = f.getBlock(x, y, z);
      var block = MC.Blocks.get(id);
      if (block) {
        return block.solid; // TODO
      } else if (id === -1) {
        return true;
      }
      return false;
    }
  };

  for (var y = 0; y < chunkSize; y++) {
    for (var z = 0; z < chunkSize; z++) {
      for (var x = 0; x < chunkSize; x++) {
        var block = MC.Blocks.get(blocks[x + z * chunkSize + y * chunkSize * chunkSize]);
        var c = (block && block.solid);
        culled[(x - 1) + z * chunkSize + y * chunkSize * chunkSize] |= (c & x > 0) << 0;
        culled[(x + 1) + z * chunkSize + y * chunkSize * chunkSize] |= (c & x < chunkSize - 1) << 1;
        culled[x + z * chunkSize + (y - 1) * chunkSize * chunkSize] |= (c & y > 0) << 2;
        culled[x + z * chunkSize + (y + 1) * chunkSize * chunkSize] |= (c & y < chunkSize - 1) << 3;
        culled[x + (z - 1) * chunkSize + y * chunkSize * chunkSize] |= (c & z > 0) << 4;
        culled[x + (z + 1) * chunkSize + y * chunkSize * chunkSize] |= (c & z < chunkSize - 1) << 5;
      }
    }
  }
  /*for (var x = 0; x < chunkSize; x++) {
    for (var y = 0; y < chunkSize; y++) {
      culled[x + 0 * chunkSize + y * chunkSize * chunkSize] |= 1 << 5;
      culled[x + 15 * chunkSize + y * chunkSize * chunkSize] |= 1 << 4;
    }
  }
  for (var x = 0; x < chunkSize; x++) {
    for (var z = 0; z < chunkSize; z++) {
      culled[x + z * chunkSize + 0 * chunkSize * chunkSize] |= 1 << 3;
      culled[x + z * chunkSize + 15 * chunkSize * chunkSize] |= 1 << 2;
    }
  }
  for (var y = 0; y < chunkSize; y++) {
    for (var z = 0; z < chunkSize; z++) {
      culled[0 + z * chunkSize + y * chunkSize * chunkSize] |= 1 << 1;
      culled[15 + z * chunkSize + y * chunkSize * chunkSize] |= 1 << 0;
    }
  }*/
  var ranges = {};
  var block, k = 0;
  for (var y = 0; y < chunkSize; y++) {
    for (var z = 0; z < chunkSize; z++) {
      for (var x = 0; x < chunkSize; x++) {
        if (blocks[j]) {
          var s = indices.size();
          MC.draw(blocks[j], x, y, z, culled[j], f);
          if (s !== indices.size()) {
            ranges[positionHash(x, y, z)] = [s, indices.size() - s];
          }
        }
        j++;
      }
    }
  }
  indices = indices.concat();
  positions = positions.concat();
  colors = colors.concat();
  uvs = uvs.concat();
  return {
    blocks: ranges,
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
    }
  };
}
