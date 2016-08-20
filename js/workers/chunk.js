importScripts('../lib.js');

var config;
var chunks = new Map();

var uvx = ['x1', 'x1', 'x2', 'x2'];
var uvy = ['y1', 'y2', 'y2', 'y1'];

function positionHash(x, y, z) {
  return x + '_' + y + '_' + z;
}

function mod(n1, n2) {
  return ((n1 % n2) + n2) % n2;
}

self.onmessage = function(msg) {
  var [type, data] = msg.data;
  switch(type) {
    case 'configure':
      config = data;
      for (var id = 0; id < config.meshingFunctions.length; id++) {
        if (config.meshingFunctions[id]) {
          config.meshingFunctions[id] = new Function(['fn', 'x', 'y', 'z', 'culled'], config.meshingFunctions[id]);
        }
      }
      break;
    case 'chunk':
      var p = data.position;
      chunks.set(positionHash(p.x, p.y, p.z), data);
      if (data.build) {
        var mesh = build(data);
        postMessage(['mesh', {
          position: data.position,
          mesh: mesh
        }, mesh.map(a => a.buffer)]);
        var coords = [{x:1,y:0,z:0},{x:-1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:-1,z:0},{x:0,y:0,z:1},{x:0,y:0,z:-1}];
        for (var c of coords) {
          var str = positionHash(p.x + c.x, p.y + c.y, p.z + c.z);
          var chunk = chunks.get(str);
          if (chunk) {
            chunks.delete(str);
            postMessage(['chunk', chunk], chunk.data.map(a => a.buffer));
          }
        }
        chunks.delete(positionHash(p.x, p.y, p.z));
        postMessage(['chunk', data], data.data.map(a => a.buffer));
      }
      break;
    default:
      throw new Error('Unkown message type', type);
  }
};

function build(chunk) {
  var pos = chunk.position;
  var [blocks, blockLight, skyLight] = chunk.data;
  var culled = new Uint8Array(config.CHUNK_SIZE * config.CHUNK_SIZE * config.CHUNK_SIZE);
  var indices = new MC.DynamicArray(Uint32Array);
  var positions = new MC.DynamicArray(Float32Array);
  var pi = 0;
  var colors = new MC.DynamicArray(Float32Array);
  var uvs = new MC.DynamicArray(Float32Array);
  var j = 0;
  var f = {
    vertex: function(x, y, z, r, g, b, uvx, uvy) {
      positions.push(x);
      positions.push(y);
      positions.push(z);
      // ok wt actual f was I doing here? Trying to linearly scale to match minecraft or something?
      // r = (r * 95 + 19) / 115;
      // g = (g * 78 + 15) / 94;
      // b = (b * 40 + 16) / 57;
      r = r * r * 1.5 + 0.1;
      g = g * g * 1.5 + 0.1;
      b = b * b * 1.5 + 0.1;
      colors.push(r, g, b);
      colors.push(r, g, b);
      colors.push(r, g, b);
      uvs.push(uvx);
      uvs.push(uvy);
      return pi++;
    },
    squade: function (ux1, uy1, ux2, uy2, x1, y1, z1, s1, x2, y2, z2, s2, x3, y3, z3, s3, x4, y4, z4, s4) {
      var ac = s1 / 16;
      var a = f.vertex(x1, y1, z1, ac, ac, ac, ux1, uy1);
      var bc = s2 / 16;
      var b = f.vertex(x2, y2, z2, bc, bc, bc, ux1, uy2);
      var cc = s3 / 16;
      var c = f.vertex(x3, y3, z3, cc, cc, cc, ux2, uy2);
      var dc = s4 / 16;
      var d = f.vertex(x4, y4, z4, dc, dc, dc, ux2, uy1);
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
      if (x < 0 || x >= config.CHUNK_SIZE || y < 0 || y >= config.CHUNK_SIZE || z < 0 || z >= config.CHUNK_SIZE) {
        var cx = (x + config.CHUNK_SIZE * pos.x) >> 4;
        var cy = (y + config.CHUNK_SIZE * pos.y) >> 4;
        var cz = (z + config.CHUNK_SIZE * pos.z) >> 4;
        var c = chunks.get(positionHash(cx, cy, cz));
        if (!c) {
          return 0;
        }
        return c.data[0][mod(x, config.CHUNK_SIZE) + mod(z, config.CHUNK_SIZE) * config.CHUNK_SIZE + mod(y, config.CHUNK_SIZE) * config.CHUNK_SIZE * config.CHUNK_SIZE];
      }
      // special case for this chunk for optimization
      return blocks[x + z * config.CHUNK_SIZE + y * config.CHUNK_SIZE * config.CHUNK_SIZE];
    },
    getProp: function(x, y, z, prop) {
      var arr;
      if (x < 0 || x >= config.CHUNK_SIZE || y < 0 || y >= config.CHUNK_SIZE || z < 0 || z >= config.CHUNK_SIZE) {
        var cx = (x + config.CHUNK_SIZE * pos.x) >> 4;
        var cy = (y + config.CHUNK_SIZE * pos.y) >> 4;
        var cz = (z + config.CHUNK_SIZE * pos.z) >> 4;
        var c = chunks.get(positionHash(cx, cy, cz));
        if (!c) {
          return -1;
        }
        arr = c.data[prop];
      } else {
        // special case for this chunk for optimization
        arr = chunk.data[prop];
      }
      var b = arr[(mod(x, config.CHUNK_SIZE) + mod(z, config.CHUNK_SIZE) * config.CHUNK_SIZE + mod(y, config.CHUNK_SIZE) * config.CHUNK_SIZE * config.CHUNK_SIZE) >> 1];
      return (x % 2 ? b >> 4 : b) & 0xf;
    },
    getBlockLight: function (x, y, z) {
      //return 10;
      //return f.getProp(x, y, z, 'blockLight');
      return f.getProp(x, y, z, 1);// | f.getProp(x, y, z, 'skyLight');
    },
    getSkyLight: function (x, y, z) {
      return f.getProp(x, y, z, 2);
    },
    isBlockOpaque: function(x, y, z) {
      var block = MC.Blocks.getById(f.getBlock(x, y, z));
      return block && block.opaque; // TODO
    }
  };

  for (var y = 0; y < config.CHUNK_SIZE; y++) {
    for (var z = 0; z < config.CHUNK_SIZE; z++) {
      for (var x = 0; x < config.CHUNK_SIZE; x++) {
        var c = f.isBlockOpaque(x, y, z);
        culled[(x - 1) + z * config.CHUNK_SIZE + y * config.CHUNK_SIZE * config.CHUNK_SIZE] |= (c & x > 0) << 0;
        culled[(x + 1) + z * config.CHUNK_SIZE + y * config.CHUNK_SIZE * config.CHUNK_SIZE] |= (c & x < config.CHUNK_SIZE - 1) << 1;
        culled[x + z * config.CHUNK_SIZE + (y - 1) * config.CHUNK_SIZE * config.CHUNK_SIZE] |= (c & y > 0) << 2;
        culled[x + z * config.CHUNK_SIZE + (y + 1) * config.CHUNK_SIZE * config.CHUNK_SIZE] |= (c & y < config.CHUNK_SIZE - 1) << 3;
        culled[x + (z - 1) * config.CHUNK_SIZE + y * config.CHUNK_SIZE * config.CHUNK_SIZE] |= (c & z > 0) << 4;
        culled[x + (z + 1) * config.CHUNK_SIZE + y * config.CHUNK_SIZE * config.CHUNK_SIZE] |= (c & z < config.CHUNK_SIZE - 1) << 5;
      }
    }
  }
  for (var x = 0; x < config.CHUNK_SIZE; x++) {
    for (var y = 0; y < config.CHUNK_SIZE; y++) {
      culled[x + 0 * config.CHUNK_SIZE + y * config.CHUNK_SIZE * config.CHUNK_SIZE] |= f.isBlockOpaque(x, y, -1) << 5;
      culled[x + 15 * config.CHUNK_SIZE + y * config.CHUNK_SIZE * config.CHUNK_SIZE] |= f.isBlockOpaque(x, y, 16) << 4;
    }
  }
  for (var x = 0; x < config.CHUNK_SIZE; x++) {
    for (var z = 0; z < config.CHUNK_SIZE; z++) {
      culled[x + z * config.CHUNK_SIZE + 0 * config.CHUNK_SIZE * config.CHUNK_SIZE] |= f.isBlockOpaque(x, -1, z) << 3;
      culled[x + z * config.CHUNK_SIZE + 15 * config.CHUNK_SIZE * config.CHUNK_SIZE] |= f.isBlockOpaque(x, 16, z) << 2;
    }
  }
  for (var y = 0; y < config.CHUNK_SIZE; y++) {
    for (var z = 0; z < config.CHUNK_SIZE; z++) {
      culled[0 + z * config.CHUNK_SIZE + y * config.CHUNK_SIZE * config.CHUNK_SIZE] |= f.isBlockOpaque(-1, y, z) << 1;
      culled[15 + z * config.CHUNK_SIZE + y * config.CHUNK_SIZE * config.CHUNK_SIZE] |= f.isBlockOpaque(16, y, z) << 0;
    }
  }
  var block, k = 0;
  for (var y = 0; y < config.CHUNK_SIZE; y++) {
    for (var z = 0; z < config.CHUNK_SIZE; z++) {
      for (var x = 0; x < config.CHUNK_SIZE; x++) {
        if (blocks[j]) {
          var s = indices.size();
          var mesh = config.meshingFunctions[blocks[j]];
          if (mesh) {
            mesh(f, x, y, z, culled[j]);
          }
        }
        j++;
      }
    }
  }
  return [indices, positions, colors, uvs].map(b => b.concat());
}
