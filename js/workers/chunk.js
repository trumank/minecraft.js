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

self.onmessage = msg => {
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
      data.data = new Uint32Array(data.data);
      chunks.set(positionHash(p.x, p.y, p.z), data);
      if (data.build) {
        var mesh = build(data);
        postMessage(['mesh', {
          position: data.position,
          mesh: mesh
        }, mesh.map(a => a.buffer)]);
      }
      break;
    default:
      throw new Error('Unkown message type', type);
  }
};

function build(chunk) {
  var pos = chunk.position;
  var data = chunk.data;
  var culled = new Uint8Array(config.CHUNK_SIZE * config.CHUNK_SIZE * config.CHUNK_SIZE);
  var indices = new MC.DynamicArray(Uint32Array);
  var positions = new MC.DynamicArray(Float32Array);
  var pi = 0;
  var colors = new MC.DynamicArray(Float32Array);
  var uvs = new MC.DynamicArray(Float32Array);
  var j = 0;
  var f = {
    vertex: (x, y, z, r, g, b, uvx, uvy) => {
      positions.push(x);
      positions.push(y);
      positions.push(z);
      // ok wt actual f was I doing here? Trying to linearly scale to match minecraft or something?
      // r = (r * 95 + 19) / 115;
      // g = (g * 78 + 15) / 94;
      // b = (b * 40 + 16) / 57;
      r = r * r * 1.5;
      g = g * g * 1.5;
      b = b * b * 1.5;
      colors.push(r);
      colors.push(g);
      colors.push(b);
      uvs.push(uvx);
      uvs.push(uvy);
      return pi++;
    },
    squade: (ux1, uy1, ux2, uy2, r, g, b, x1, y1, z1, s1, x2, y2, z2, s2, x3, y3, z3, s3, x4, y4, z4, s4) => {
      var ac = s1 / 16 * 12/16 + 4/16;
      var va = f.vertex(x1, y1, z1, r * ac, g * ac, b * ac, ux1, uy1);
      var bc = s2 / 16 * 12/16 + 4/16;
      var vb = f.vertex(x2, y2, z2, r * bc, g * bc, b * bc, ux1, uy2);
      var cc = s3 / 16 * 12/16 + 4/16;
      var vc = f.vertex(x3, y3, z3, r * cc, g * cc, b * cc, ux2, uy2);
      var dc = s4 / 16 * 12/16 + 4/16;
      var vd = f.vertex(x4, y4, z4, r * dc, g * dc, b * dc, ux2, uy1);
      if (s1 + s3 > s2 + s4) {
        indices.push(va);
        indices.push(vb);
        indices.push(vc);
        indices.push(va);
        indices.push(vc);
        indices.push(vd);
      } else {
        indices.push(vb);
        indices.push(vc);
        indices.push(vd);
        indices.push(vb);
        indices.push(vd);
        indices.push(va);
      }
    },
    getBlock: (x, y, z, d) => {
      if (x < 0 || x >= config.CHUNK_SIZE || y < 0 || y >= config.CHUNK_SIZE || z < 0 || z >= config.CHUNK_SIZE) {
        var cx = (x + config.CHUNK_SIZE * pos.x) >> 4;
        var cy = (y + config.CHUNK_SIZE * pos.y) >> 4;
        var cz = (z + config.CHUNK_SIZE * pos.z) >> 4;
        var c = chunks.get(positionHash(cx, cy, cz));
        if (!c) {
          return d || 0;
        }
        return c.data[mod(x, config.CHUNK_SIZE) + mod(z, config.CHUNK_SIZE) * config.CHUNK_SIZE + mod(y, config.CHUNK_SIZE) * config.CHUNK_SIZE * config.CHUNK_SIZE];
      }
      // special case for this chunk for optimization
      return data[x + z * config.CHUNK_SIZE + y * config.CHUNK_SIZE * config.CHUNK_SIZE];
    },
    getBlockId: (x, y, z) => {
      const n = 0xffff & f.getBlock(x, y, z);
      return n < 0 ? 0 : n;
    },
    getBlockLight: (x, y, z) => {
      //return 10;
      return Math.max(0xf & f.getBlock(x, y, z) >> 16, 0xf & f.getBlock(x, y, z) >> 20);
    },
    getSkyLight: (x, y, z) => {
      return 0xf & f.getBlock(x, y, z) >> 20;
    },
    isBlockOpaque: (x, y, z) => {
      const d = f.getBlock(x, y, z);
      var block = MC.Blocks.getById(0xffff & d);
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
        if (0xffff & data[j]) {
          var s = indices.size();
          var mesh = config.meshingFunctions[0xffff & data[j]];

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
