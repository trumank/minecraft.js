(function(MC) {
  'use strict';

  MC.util = {
    mod: function(n1, n2) {
      return ((n1 % n2) + n2) % n2;
    },
    clone: function(object) {
      return JSON.parse(JSON.stringify(object));
    },
    positionKey: function(x, y, z) {
      return x + '_' + y + '_' + z;
    }
  };

  MC.Minecraft = function(container, server) {
    this.gui = new MC.GUI(this, container);
    this.player = null;
    this.resources = null;
    this.server = new MC.Server('ws://' + location.host);
    this.world = null;

    this.resources = this.loadResources(function(err) {
      if (err) return console.err(err);
      this.gui.signIn(function(err, session) {
        this.joinServer(server.host, server.port);
      }.bind(this));
    }.bind(this));
    this.server.on(['login', 'success'], function(packet) {
      this.sendSettings();
    }.bind(this));
    this.server.on(['play', 'chat'], function(packet) { // TODO: Complete chat messages
      var obj = JSON.parse(packet.message);
      var msg = '';
      if (obj.translate) {
        msg = this.resources.language[obj.translate](obj.with);
      }
      this.chat.innerText += msg + '\n';
    }.bind(this));

    var loop = function() {
      requestAnimationFrame(loop);
      this.tick();
    }.bind(this);
    loop();
  };
  MC.Minecraft.prototype.loadResources = function(cb) {
    var resources = new MC.ResourcePack(['/resourcepacks/resourcepack.zip']);
    var l = 0;
    var i = setInterval(function() {
      this.gui.bar.style.width = l;
    }.bind(this), 1000);
    resources.load(function(p) {
      l = p * 100 + '%';
    }, function(err) {
      if (!err) {
        this.gui.loading.style.display = 'none';
      }
      clearInterval(i);
      cb(err);
    }.bind(this));
    return resources;
  };
  MC.Minecraft.prototype.joinServer = function(host, port) {
    this.server.send('connect', {
      host: host,
      port: port,
      username: 'Bot'
    });

    var loader = new MC.ServerChunkLoader(this.server);
    this.world = loader.world = new MC.World(this, loader, this.gui.scene);
    this.player = new MC.Player(this, 'Player', this.gui.camera, this.gui.selector);
  };
  MC.Minecraft.prototype.tick = function() {
    this.gui.stats.begin();
    if (this.world)
      this.world.tick();
    if (this.player)
      this.player.tick();
    this.gui.tick();
    this.gui.render();
    this.gui.stats.end();
  };
  MC.Minecraft.prototype.sendSettings = function() {
    this.server.send(['play', 'settings'], {
      locale: 'en_US',
      viewDistance: 6,
      chatFlags: 0,
      chatColors: true,
      difficulty: 3,
      showCape: true 
    });
    this.server.send(['play'], 'custom_payload', {
      channel: 'MC|Brand',
      data: 'vanilla'.split('').map(function(s){return s.charCodeAt(0);})
    });
    this.server.send(['play'], 'held_item_slot', {
      slotId: 2
    });
  };


  MC.Player = function(mc, name, camera, selector) {
    this.mc = mc;
    this.name = name;
    this.camera = camera;
    this.selector = selector;
    this.selected = null;
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.position = camera.position;
    this.speed = 0.3;
    this.lat = this.lon = 0;
    this.facing = new THREE.Vector3(1, 0, 0);
    this.heldItem = 1;

    this.viewDistance = 1;

    this.spawned = false;
    this.flying = true;

    this.mc.gui.content.addEventListener('keypress', function(e) {
      switch (String.fromCharCode(e.keyCode)) {
      case 'f':
        this.flying = !this.flying;
        break;
      }
    }.bind(this));

    this.mc.gui.content.addEventListener('click', function(e) {
      if (!this.mc.isPointerLocked) {
        return;
      }
      if (e.button === 0) {
        this.breakBlock();
      } else if (e.button === 1) {
        this.pickBlock();
      } else if (e.button === 2) {
        this.placeBlock();
      }
    }.bind(this));

    this.mc.server.on(['play', 'position'], function(packet) {
      this.spawned = true;
      this.position.x = packet.x;
      this.position.y = packet.y;
      this.position.z = packet.z;
      this.lon = packet.yaw + 90;
      this.lat = -packet.pitch;
    }.bind(this));

    this.mc.gui.content.addEventListener('mousemove', function(e) {
      if (this.mc.gui.isPointerLocked) {
        var zoomed = this.mc.gui.keysDown[17];
        var lookSpeed = zoomed ? 0.05 : 0.2;
        var dx = typeof e.movementX === 'number' ? e.movementX : e.mozMovementX;
        var dy = typeof e.movementY === 'number' ? e.movementY : e.mozMovementY;
        this.lon += dx * lookSpeed;
        this.lat -= dy * lookSpeed;
        this.lat = THREE.Math.clamp(this.lat, -89.9, 89.9);
      }
    }.bind(this), false);
  };
  MC.Player.prototype.tick = function() {
    var speed = this.speed;
    if (this.lastFrame)
      speed *= (Date.now() - this.lastFrame) * 60/1000;
    this.lastFrame = Date.now();
    var oldFov = this.camera.fov;
    var zoomed = this.mc.gui.keysDown[17];
    this.camera.fov = zoomed ? 30 : 120; // zoom
    if (oldFov !== this.camera.fov) {
      this.camera.updateProjectionMatrix();
    }

    var phi = (90 - this.lat) * Math.PI / 180;
    var theta = this.lon * Math.PI / 180;
    this.facing = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
    this.camera.lookAt(this.position.clone().add(this.facing));

    if (this.spawned) {
      if (this.flying) {
        this.velocity.set(0, 0, 0);
        if (this.mc.gui.keysDown[32]) { // up
          this.velocity.y = speed;
        }
        if (this.mc.gui.keysDown[16]) { // down
          this.velocity.y = -speed;
        }
      } else {
        this.velocity.x = 0;
        this.velocity.y -= 0.01;
        this.velocity.z = 0;
        if (this.mc.gui.keysDown[32] && this.onGround) { // jump
          this.velocity.y = Math.sqrt(0.02);
        }
      }

      var horizontal = new THREE.Vector3();
      var c = Math.cos(theta);
      var s = Math.sin(theta);
      if (this.mc.gui.keysDown[65]) { // left
        horizontal.x += s;
        horizontal.z -= c;
      }
      if (this.mc.gui.keysDown[68]) { // right
        horizontal.x -= s;
        horizontal.z += c;
      }
      if (this.mc.gui.keysDown[87]) { // forward
        horizontal.x += c;
        horizontal.z += s;
      }
      if (this.mc.gui.keysDown[83]) { // backward
        horizontal.x -= c;
        horizontal.z -= s;
      }
      this.velocity.add(horizontal.normalize().multiplyScalar(speed));

      this.position.add(this.velocity);

      if (!this.flying && this.getChunk()) {
        this.correctCollision();
      }

      this.sendUpdate();
    }

    var chunks = this.mc.world.chunks;
    var cx = this.position.x / MC.CHUNK_SIZE - 0.5 | 0;
    var cy = this.position.y / MC.CHUNK_SIZE - 0.5 | 0;
    var cz = this.position.z / MC.CHUNK_SIZE - 0.5 | 0;

    var r = this.viewDistance;
    var self = this;
    Object.keys(chunks).forEach(function(c) {
      var chunk = chunks[c];
      if ((chunk.x < cx - r - 1) || (chunk.x > cx + r) || (chunk.y < cy - r - 1) || (chunk.y > cy + r)  || (chunk.z < cz - r - 1) || (chunk.z > cz + r)) {
        self.mc.world.unloadChunk(chunk.x, chunk.y, chunk.z);
      } else {
        chunk.update();
      }
    });
    for (var x = cx - r; x < cx + r; x++) {
      for (var y = cy - r; y < cy + r; y++) {
        for (var z = cz - r; z < cz + r; z++) {
          if (!this.mc.world.getChunk(x, y, z)) {
            this.mc.world.loadChunk(x, y, z);
          }
        }
      }
    }

    //this.updateSelection();
  };
  MC.Player.prototype.correctCollision = function() {
    this.onGround = false;
    var oldbb = this.getBoundingBox().translate(this.velocity.clone().negate());
    var newbb = this.getBoundingBox(),
      bb = oldbb.clone().union(newbb),
      blocks = [];
    for (var x = Math.floor(bb.min.x); x < bb.max.x; x++) {
      for (var y = Math.floor(bb.min.y); y < bb.max.y; y++) {
        for (var z = Math.floor(bb.min.z); z < bb.max.z; z++) {
          if (this.mc.world.isBlockSolid(x, y, z)) {
            blocks.push(new THREE.Box3(new THREE.Vector3(x, y, z), new THREE.Vector3(x + 1, y + 1, z + 1)));
          }
        }
      }
    }

    function intersects(a, b) {
      var epsilon = 0.0001;
      return !(a.max.x <= b.min.x + epsilon || a.min.x >= b.max.x - epsilon || a.max.y <= b.min.y + epsilon || a.min.y >= b.max.y - epsilon);
    }

    var dir;
    var playerFace;
    var axes = [['x', 'y', 'z', 0.3, -0.3], ['y', 'x', 'z', 1.62, -0.3], ['z', 'x', 'y', 0.3, -0.3]];
    while (true) {
      var min = {
        axis: -1,
        time: Infinity,
        pos: 0
      };
      for (var a = 0; a < axes.length; a++) {
        var axis = axes[a];
        if (this.velocity[axis[0]]) {
          dir = this.velocity[axis[0]] > 0 ? 'min' : 'max';
          playerFace = {
            pos: oldbb[this.velocity[axis[0]] < 0 ? 'min' : 'max'][axis[0]],
            box: new THREE.Box2(new THREE.Vector2(oldbb.min[axis[1]], oldbb.min[axis[2]]), new THREE.Vector2(oldbb.max[axis[1]], oldbb.max[axis[2]]))
          };
          var n = this.velocity[axis[0]] > 0 ? Infinity : -Infinity,
            minT = Infinity;
          for (var i = 0; i < blocks.length; i++) {
            var block = blocks[i],
              face = {
                pos: block[dir][axis[0]],
                box: new THREE.Box2(new THREE.Vector2(block.min[axis[1]], block.min[axis[2]]), new THREE.Vector2(block.max[axis[1]], block.max[axis[2]]))
              },
              t = (face.pos - playerFace.pos) / this.velocity[axis[0]];
            if (t >= 0 && intersects(face.box, playerFace.box.clone().translate(new THREE.Vector2(this.velocity[axis[1]] * t, this.velocity[axis[2]] * t)))) {
              n = Math[dir](face.pos, n);
              minT = Math.min(minT, t);
            }
          }
          if (axis[0] === 'y') {
            this.onGround = isFinite(n) && this.velocity.y < 0;
          }
          if (isFinite(n)) {
            if (min.time > minT) {
              min = {
                axis: a,
                time: minT,
                pos: n + (this.velocity[axis[0]] < 0 ? axis[3] + 0.0001: axis[4] - 0.0001)
              };
            }
          }
        }
      }
      if (min.axis === -1) {
        break;
      } else {
        var j = axes[min.axis][0];
        this.position[j] = min.pos;
        this.velocity[j] = 0;
        axes.splice(min.axis, 1);
        min.axis = -1;
      }
    }
  };
  MC.Player.prototype.getBoundingBox = function() {
    var p = this.position;
    return new THREE.Box3(new THREE.Vector3(p.x - 0.3, p.y - 1.62, p.z - 0.3), new THREE.Vector3(p.x + 0.3, p.y + 0.3, p.z + 0.3));
  };
  MC.Player.prototype.updateSelection = function() {
    var r = 5;
    var boxes = [];
    var pos = new THREE.Vector3(Math.floor(this.position.x), Math.floor(this.position.y), Math.floor(this.position.z));
    for (var x = -r; x <= r; x++) {
      for (var y = -r; y <= r; y++) {
        for (var z = -r; z <= r; z++) {
          boxes = boxes.concat(this.mc.world.getAABBs(pos.x + x, pos.y + y, pos.z + z));
        }
      }
    }
    var min = Infinity;
    var box = null;
    for (var i = 0; i < boxes.length; i++) {
      var time = this.testBox(boxes[i]);
      if (time !== false && time < min) {
        min = time;
        box = boxes[i];
      }
    }
    if (box) {
      this.selector.position.copy(box.center());
      this.selector.scale.copy(box.size());
      this.selector.visible = true;
      this.selected = box.position;
      this.selectedFace = this.findSelectedFace(box);
    } else {
      this.selector.visible = false;
      this.selected = null;
      this.selectedFace = null;
    }
  };
  MC.Player.prototype.testBox = function(box) {
    var dirfrac = new THREE.Vector3(1 / this.facing.x, 1 / this.facing.y, 1 / this.facing.z);
    var org = this.position;
    var t1 = (box.min.x - org.x) * dirfrac.x;
    var t2 = (box.max.x - org.x) * dirfrac.x;
    var t3 = (box.min.y - org.y) * dirfrac.y;
    var t4 = (box.max.y - org.y) * dirfrac.y;
    var t5 = (box.min.z - org.z) * dirfrac.z;
    var t6 = (box.max.z - org.z) * dirfrac.z;

    var tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
    var tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));

    if (tmax < 0) {
      //t = tmax;
      return false;
    } else if (tmin > tmax) {
      return false;
    }
    return tmin;
  };
  MC.Player.prototype.findSelectedFace = function(box) {
    var b = box.translate(this.position.clone().negate());
    var f = this.facing;
    var X_FACE = 0;
    var Y_FACE = 1;
    var Z_FACE = 2;
    var MAX_FACE = 4;

    function hit_face(uhit, vhit, umin, umax, vmin, vmax) {
      return (umin <= uhit && uhit <= umax && vmin <= vhit && vhit <= vmax);
    }

    var times = [];
    var hits = [];
    var faces = [];
    var t;
    if (f.x !== 0) {
      t = b.min.x / f.x;
      if (t > 0 && hit_face(t * f.y, t * f.z, b.min.y, b.max.y, b.min.z, b.max.z)) {
        faces.push({t: t, f: new THREE.Vector3(-1, 0, 0)});
      }
      t = b.max.x / f.x;
      if (t > 0 && hit_face(t * f.y, t * f.z, b.min.y, b.max.y, b.min.z, b.max.z)) {
        faces.push({t: t, f: new THREE.Vector3(1, 0, 0)});
      }
    }
    if (f.y !== 0) {
      t = b.min.y / f.y;
      if (t > 0 && hit_face(t * f.x, t * f.z, b.min.x, b.max.x, b.min.z, b.max.z)) {
        faces.push({t: t, f: new THREE.Vector3(0, -1, 0)});
      }
      t = b.max.y / f.y;
      if (t > 0 && hit_face(t * f.x, t * f.z, b.min.x, b.max.x, b.min.z, b.max.z)) {
        faces.push({t: t, f: new THREE.Vector3(0, 1, 0)});
      }
    }
    if (f.z !== 0) {
      t = b.min.z / f.z;
      if (t > 0 && hit_face(t * f.x, t * f.y, b.min.x, b.max.x, b.min.y, b.max.y)) {
        faces.push({t: t, f: new THREE.Vector3(0, 0, -1)});
      }
      t = b.max.z / f.z;
      if (t > 0 && hit_face(t * f.x, t * f.y, b.min.x, b.max.x, b.min.y, b.max.y)) {
        faces.push({t: t, f: new THREE.Vector3(0, 0, 1)});
      }
    }
    if (faces.length === 0) {
      return null;
    }
    t = Infinity;
    for (var i = 0; i < faces.length; i++) {
      if (faces[i].t < t) {
        t = faces[i].t;
        f = faces[i].f;
      }
    }
    return f;
  };
  MC.Player.prototype.getChunk = function() {
    return this.mc.world.getChunk(this.position.x / MC.CHUNK_SIZE | 0, this.position.y / MC.CHUNK_SIZE | 0, this.position.z / MC.CHUNK_SIZE | 0);
  };
  MC.Player.prototype.breakBlock = function() {
    var p = this.selected;
    if (p) {
      this.mc.world.setBloc(p.x, p.y, p.z, 0);
    }
  };
  MC.Player.prototype.pickBlock = function() {
    var p = this.selected;
    if (p) {
      this.heldItem = this.mc.world.getBlock(p.x, p.y, p.z);
    }
  };
  MC.Player.prototype.placeBlock = function() {
    if (this.selected) {
      var p = this.selected.clone().add(this.selectedFace);
      this.mc.world.setBloc(p.x, p.y, p.z, this.heldItem);
    }
  };
  MC.Player.prototype.sendUpdate = function() {
    this.mc.server.emit('play 06', {
      x: this.position.x,
      y: this.position.y,
      z: this.position.z,
      yaw: this.lon - 90,
      pitch: -this.lat,
      onGround: this.onGround,
      stance: this.position.y - 1.62
    });
  };

  MC.CHUNK_SIZE = 16;

  MC.World = function(inst, loader, scene) {
    this.mc = inst;
    this.chunks = {};
    this.chunkLoader = loader;
    this.scene = scene;
    this.queuedChunks = [];
    this.workers = [];
    var threads = navigator.hardwareConcurrency || 4;
    for (var i = 0; i < threads; i++) {
      var worker = new Worker('js/workers/chunk.js');
      this.mc.resources.configure(worker);
      worker.onmessage = this._onmessage.bind(this);
      this.workers.push(worker);
    }
  };
  MC.World.prototype._onmessage = function(e) {
    var pos = e.data.position;
    var chunk = this.getChunk(pos.x, pos.y, pos.z);
    if (chunk) {
      chunk.setGeometryBuffer(e.data.data);
      chunk.transBlocks = e.data.blocks;
      chunk.transBlockLight = e.data.blockLight;
      chunk.transSkyLight = e.data.skyLight;
    }
  };
  MC.World.prototype.tick = function() {
    this.buildQueuedChunks();
  };
  MC.World.prototype.loadChunk = function(x, y, z) {
    var data = this.chunkLoader.load(x, y, z);
    //console.log(MC.util.positionKey(x, y, z), data ? 'Loaded' : 'Not loaded', data);
    if (data) {
      this.setChunk(x, y, z, new MC.Chunk(this, x, y, z, data));
    }
  };
  MC.World.prototype.unloadChunk = function(x, y, z) {
    var mesh = this.getChunk(x, y, z).mesh;
    if (mesh)
      this.scene.remove(mesh);
    delete this.chunks[MC.util.positionKey(x, y, z)];
  };
  MC.World.prototype.queueChunk = function(chunk) {
    this.queuedChunks.push(chunk);
  };
  MC.World.prototype.buildQueuedChunks = function() {
    var worker = 0;
    for (var i = this.queuedChunks.length - 1; i >= 0; i--) {
      var chunk = this.queuedChunks[i];
      if (chunk.isBuilding())
        continue;
      this.workers[worker].postMessage({
        blocks: chunk.transBlocks,
        blockLight: chunk.transBlockLight,
        skyLight: chunk.transSkyLight,
        position: {x: chunk.x, y: chunk.y, z: chunk.z},
      }, [chunk.transBlocks.buffer, chunk.transBlockLight.buffer, chunk.transSkyLight.buffer]);

      chunk.transBlocks = null;
      chunk.transBlockLight = null;
      chunk.transSkyLight = null;
      worker = (worker + 1) % this.workers.length;
      this.queuedChunks.splice(i, 1);
    }
  };
  MC.World.prototype.rebuildDirty = function() {
    var chunks = this.chunks;
    Object.keys(chunks).forEach(function(v) {
      var chunk = chunks[v];
      if (chunk.dirty) {
        chunk.buildMesh();
      }
    });
  };
  MC.World.prototype.getChunk = function(x, y, z) {
    return this.chunks[MC.util.positionKey(x, y, z)];
  };
  MC.World.prototype.setChunk = function(x, y, z, chunk) {
    this.chunks[MC.util.positionKey(x, y, z)] = chunk;
  };
  MC.World.prototype.getChunkContainingBlock = function(x, y, z) {
    return this.getChunk(x >> 4, y >> 4, z >> 4);
  };
  MC.World.prototype.getSurroundingChunks = function(x, y, z) {
    var d = [{x:1,y:0,z:0},{x:-1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:-1,z:0},{x:0,y:0,z:1},{x:0,y:0,z:-1}];
    var chunks = [];
    for (var i = 0; i < d.length; i++) {
      var c = this.getChunk(x + d[i].x, y + d[i].y, z + d[i].z);
      if (c) {
        chunks.push(c);
      }
    }
    return chunks;
  };
  MC.World.prototype.filterChunks = function(filter) {
    var chunks = [];
    for (var c in this.chunks) {
      if (filter(this.chunks[c])) {
        chunks.push(this.chunks[c]);
      }
    }
    return chunks;
  };
  MC.World.prototype.setBloc = function(x, y, z, id, meta) {
    var mx = MC.util.mod(x, MC.CHUNK_SIZE);
    var my = MC.util.mod(y, MC.CHUNK_SIZE);
    var mz = MC.util.mod(z, MC.CHUNK_SIZE);
    var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
    if (chunk) {
      chunk.setBloc(mx, my, mz, id, meta);
    }
  };
  MC.World.prototype.setBlock = function(x, y, z, id, meta) {
    var mx = MC.util.mod(x, MC.CHUNK_SIZE);
    var my = MC.util.mod(y, MC.CHUNK_SIZE);
    var mz = MC.util.mod(z, MC.CHUNK_SIZE);
    var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
    if (chunk) {
      chunk.setBlock(mx, my, mz, id, meta);
    }
  };
  MC.World.prototype.setMeta = function(x, y, z, id) {
    var mx = MC.util.mod(x, MC.CHUNK_SIZE);
    var my = MC.util.mod(y, MC.CHUNK_SIZE);
    var mz = MC.util.mod(z, MC.CHUNK_SIZE);
    var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
    if (chunk) {
      chunk.setMeta(mx, my, mz, id);
    }
  };
  MC.World.prototype.getBlock = function(x, y, z) {
    var mx = MC.util.mod(x, MC.CHUNK_SIZE);
    var my = MC.util.mod(y, MC.CHUNK_SIZE);
    var mz = MC.util.mod(z, MC.CHUNK_SIZE);
    var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
    return chunk ? chunk.getBlock(mx, my, mz) : 0;
  };
  MC.World.prototype.getMeta = function(x, y, z) {
    var mx = MC.util.mod(x, MC.CHUNK_SIZE);
    var my = MC.util.mod(y, MC.CHUNK_SIZE);
    var mz = MC.util.mod(z, MC.CHUNK_SIZE);
    var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
    return chunk ? chunk.getMeta(mx, my, mz) : 0;
  };
  MC.World.prototype.getBlockState = function(x, y, z) {
    var id = this.getBlock(x, y, z);
    var states = this.mc.resources.blockStates[MC.Blocks.nameOf(id)];
    if (!states) {
      return null;
    }
    var variants = Object.keys(states.variants);
    var state = states.variants[variants[0]]; // TODO
    if (Array.isArray(state)) {
      state = state[0]; // TODO
    }
    return state;
  };
  MC.World.prototype.getAABBs = function(x, y, z) {
    var state = this.getBlockState(x, y, z);
    if (!state) {
      return [];
    }
    var model = this.mc.resources.models['minecraft:block/' + state.model];
    if (!model) {
      return [];
    }
    return model.elements.map(function(element) {
      var b = new THREE.Box3(new THREE.Vector3(x + element.from.x, y + element.from.y, z + element.from.z), new THREE.Vector3(x + element.to.x, y + element.to.y, z + element.to.z));
      b.position = new THREE.Vector3(x, y, z);
      return b;
    });
    /*if (!id) {
      return [];
    }
    var b = new THREE.Box3(new THREE.Vector3(x, y, z), new THREE.Vector3(x + 1, y + 1, z + 1));
    b.position = new THREE.Vector3(x, y, z);
    return [b];*/
  };
  MC.World.prototype.isBlockSolid = function(x, y, z) {
    var mx = MC.util.mod(x, MC.CHUNK_SIZE);
    var my = MC.util.mod(y, MC.CHUNK_SIZE);
    var mz = MC.util.mod(z, MC.CHUNK_SIZE);
    var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
    return chunk ? chunk.isBlockSolid(mx, my, mz) : 0;
  };
  MC.World.prototype.updateGeometry = function(chunk) {
    if (chunk.oldMesh)
      this.scene.remove(chunk.oldMesh);

    chunk.mesh.position.x = chunk.x * MC.CHUNK_SIZE;
    chunk.mesh.position.y = chunk.y * MC.CHUNK_SIZE;
    chunk.mesh.position.z = chunk.z * MC.CHUNK_SIZE;
    this.scene.add(chunk.mesh);
  };


  MC.ServerChunkLoader = function(server) {
    this.chunks = {};
    this.server = server;
    var self = this;
    this.server.on(['play', 'block_change'], function(packet) {
      //self.world.setBlock(packet.x, packet.y, packet.z, packet.type, packet.metapacket);
    });
    this.server.on(['play', 'map_chunk'], function(packet) {
      var stream = new Streams.ReadStream(packet.chunkData.buffer.buffer);
      var l = MC.CHUNK_SIZE*MC.CHUNK_SIZE*MC.CHUNK_SIZE;
      var chunks = {};
      var y;
      for (y = 0; y < self.COLUMN_HEIGHT; y++) {
        if (packet.bitMap & (1 << y)) {
          chunks[y] = {};
        }
      }
      for (y = 0; y < self.COLUMN_HEIGHT; y++) {
        if (packet.bitMap & (1 << y)) {
          chunks[y].blocks = new Uint16Array(stream.arrayBuffer(l * 2));
        }
      }
      for (y = 0; y < self.COLUMN_HEIGHT; y++) {
        if (packet.bitMap & (1 << y)) {
          chunks[y].blockLight = new Uint8Array(stream.arrayBuffer(l / 2));
        }
      }
      for (y = 0; y < self.COLUMN_HEIGHT; y++) {
        if (packet.bitMap & (1 << y)) {
          chunks[y].skyLight = new Uint8Array(stream.arrayBuffer(l / 2));
        }
      }
      for (y = 0; y < self.COLUMN_HEIGHT; y++) {
        if (packet.bitMap & (1 << y)) {
          self.chunks[packet.x + '_' + y + '_' + packet.z] = chunks[y];
        }
      }
    });
    this.server.on(['play', 'map_chunk_bulk'], function(packet) {
      var stream = new Streams.ReadStream(packet.data.buffer.buffer);
      var l = MC.CHUNK_SIZE*MC.CHUNK_SIZE*MC.CHUNK_SIZE;
      packet.meta.forEach(function(d) {
        var chunks = {};
        var y;
        for (y = 0; y < self.COLUMN_HEIGHT; y++) {
          if (d.bitMap & (1 << y)) {
            chunks[y] = {};
          }
        }
        for (y = 0; y < self.COLUMN_HEIGHT; y++) {
          if (d.bitMap & (1 << y)) {
            chunks[y].blocks = new Uint16Array(stream.arrayBuffer(l * 2));
          }
        }
        for (y = 0; y < self.COLUMN_HEIGHT; y++) {
          if (d.bitMap & (1 << y)) {
            chunks[y].blockLight = new Uint8Array(stream.arrayBuffer(l / 2));
          }
        }
        for (y = 0; y < self.COLUMN_HEIGHT; y++) {
          if (d.bitMap & (1 << y)) {
            chunks[y].skyLight = new Uint8Array(stream.arrayBuffer(l / 2));
          }
        }
        for (y = 0; y < self.COLUMN_HEIGHT; y++) {
          if (d.bitMap & (1 << y)) {
            self.chunks[d.x + '_' + y + '_' + d.z] = chunks[y];
          }
        }
        stream.arrayBuffer(MC.CHUNK_SIZE * MC.CHUNK_SIZE);
      });
    });
  };

  MC.ServerChunkLoader.prototype.COLUMN_HEIGHT = 16;
  MC.ServerChunkLoader.prototype.load = function(x, y, z) {
    return this.chunks[x + '_' + y + '_' + z];
  };


  MC.AnvilChunkLoader = function(data) { // TODO: Needs to be updated (metadata?)
    this.data = data;
    this.stream = new Streams.ReadStream(data);
    this.chunks = {};
  };
  MC.AnvilChunkLoader.prototype.load = function(x, y, z) {
    if (this.chunks[x + '_' + y + '_' + z]) {
      var chunk = this.chunks[x + '_' + y + '_' + z];
      delete this.chunks[x + '_' + y + '_' + z];
      return chunk;
    }
    this.stream.index = 4 * (x + z * 32);
    var offset = this.stream.uint24();
    if (!offset || x < 0 || y < 0 || z < 0 || x >= 32 || y >= 32 || z >= 32) {
      return {
        blocks: new Uint8Array(MC.CHUNK_SIZE*MC.CHUNK_SIZE*MC.CHUNK_SIZE),
        metadata: new Uint8Array(MC.CHUNK_SIZE*MC.CHUNK_SIZE*MC.CHUNK_SIZE/2),
        blockLight: new Uint8Array(MC.CHUNK_SIZE*MC.CHUNK_SIZE*MC.CHUNK_SIZE/2),
        skyLight: new Uint8Array(MC.CHUNK_SIZE*MC.CHUNK_SIZE*MC.CHUNK_SIZE/2)
      };
    }
    this.stream.index = offset * 0x1000;
    var size = this.stream.uint32();
    var method = this.stream.uint8();
    var level = MC.nbt.read(new Zlib.Inflate(new Uint8Array(this.stream.arrayBuffer(size))).decompress()).Level;
    var sections = level.Sections;
    for (var i = 0; i < sections.length; ++i) {
      this.chunks[x + '_' + sections[i].Y + '_' + z] = {
        blocks: sections[i].Blocks,
        metadata: sections[i].Data,
        blockLight: sections[i].BlockLight,
        skyLight: sections[i].SkyLight,
        entities: [],
        tileEntities: []
      };
    }
    for (var j = 0; j < level.TileEntities.length; j++) {
      var te = level.TileEntities[j];
      this.chunks[x + '_' + Math.floor(te.y / MC.CHUNK_SIZE) + '_' + z].tileEntities.push(te);
    }
    return this.chunks[x + '_' + y + '_' + z] || (this.chunks[x + '_' + y + '_' + z] = {
      blocks: new Uint8Array(MC.CHUNK_SIZE*MC.CHUNK_SIZE*MC.CHUNK_SIZE),
      metadata: new Uint8Array(MC.CHUNK_SIZE*MC.CHUNK_SIZE*MC.CHUNK_SIZE/2),
      blockLight: new Uint8Array(MC.CHUNK_SIZE*MC.CHUNK_SIZE*MC.CHUNK_SIZE/2),
      skyLight: new Uint8Array(MC.CHUNK_SIZE*MC.CHUNK_SIZE*MC.CHUNK_SIZE/2),
    });
  };

  MC.Chunk = function(world, x, y, z, data) {
    this.world = world;
    this.x = x;
    this.y = y;
    this.z = z;
    this.blocks = data.blocks;
    this.blockLight = data.blockLight;
    this.skyLight = data.skyLight;
    this.transBlocks = new Uint16Array(this.blocks.length);
    this.transBlocks.set(this.blocks);
    this.transBlockLight = new Uint8Array(this.blockLight.length);
    this.transBlockLight.set(this.blockLight);
    this.transSkyLight = new Uint8Array(this.skyLight.length);
    this.transSkyLight.set(this.skyLight);
    this.queue = {};
    this.buildMesh();
    // var s = this.world.getSurroundingChunks(this.x, this.y, this.z);
    // for (var i = 0; i < s.length; i++) {
    //   s[i].buildMesh();
    // }

    this.functions = null;
  };
  MC.Chunk.prototype.update = function(x, y, z) {
    function toDelete(queue) {
      return Object.keys(queue).map(function(pos) {
        return queue[pos].r;
      }).sort(function(a, b) {
        return a[0] - b[0];
      });
    }
    function fixIndex(index, indexes, map, max) {
      var offset = 0;
      var i = 0;
      for (var n = 0; n < indexes.length; n++) {
        offset += 1;
        var end = (n === indexes.length - 1 ? max : indexes[n + 1]);
        while (i < map.length && map[i][1] < end) {
          if (i >= end) {
            index[map[i][0]] -= offset;
          }
          i++;
        }
      }
    }
    function remove(indexes, array) {
      var offset = 0;
      var i = 0;
      for (var n = 0; n < indexes.length; n++) {
        offset += array.itemSize;
        var start = (indexes[n] + 1) * array.itemSize;
        var end = (n === indexes.length - 1 ? array.numItems : indexes[n + 1] * array.itemSize);
        for (var j = start; j < end; j++) {
          array.array[j - offset] = array.array[j];
        }
      }
      array.numItems -= offset;
      array.needsUpdate = true;
    }

    var queue = this.queue;
    this.queue = {};
    var del = toDelete(queue);

    if (del.length) {
      //console.profile('update');
      var blockIndexes = this.blockIndexes;
      var sortedKeys = Object.keys(this.blockIndexes).sort(function(a, b) {
        return blockIndexes[a][0] - blockIndexes[b][0];
      });
      var index = this.attributes.index;
      var map = [];
      var indexes = {};
      for (var m = 0; m < index.numItems; m++) {
        map.push([m, index.array[m]]);
      }
      map.sort(function(a, b) {
        return a[1] - b[1];
      });
      var offset = 0;
      var offsets = [];
      for (var n = 0; n < del.length; n++) {
        var block = del[n];
        for (var i = block[0]; i < block[0] + block[1]; i++) {
          var item = index.array[i];
          indexes[item] = item;
        }
        var end = n === del.length - 1 ? index.numItems : del[n + 1][0];
        var start = block[0] + block[1];
        offset += block[1];
        offsets.push([start, offset]);
        for (var j = start; j < end; j++) {
          index.array[j - offset] = index.array[j];
        }
      }
      var l = sortedKeys.length - 1;
      for (var k = offsets.length - 1; k >= 0; k--) {
        for (; blockIndexes[sortedKeys[l]][0] >= offsets[k][0]; l--) {
          blockIndexes[sortedKeys[l]][0] -= offsets[k][1];
        }
      }
      index.numItems -= offset;
      this.mesh.geometry.offsets = [{
        start: 0,
        count: index.numItems,
        index: 0
      }];
      index.needsUpdate = true;

      var max = 0;
      del = Object.keys(indexes).map(function(i) {
        if (indexes[i] > max) {
          max = indexes[i];
        }
        return indexes[i];
      }).sort(function(a, b) {
        return a - b;
      });
      console.log(indexes);
      //fixIndex(index, indexes, map, max);

      //remove(del, this.attributes.position);
      //remove(del, this.attributes.color);
      //remove(del, this.attributes.uv);
      //console.profileEnd('update');
    }
    /*var c;
    if (x === 0 && (c = this.world.getChunk(this.x - 1, this.y, this.z)))
      c.buildMesh();
    if (x === mc.CHUNK_SIZE - 1 && (c = this.world.getChunk(this.x + 1, this.y, this.z)))
      c.buildMesh();
    if (y === 0 && (c = this.world.getChunk(this.x, this.y - 1, this.z)))
      c.buildMesh();
    if (y === mc.CHUNK_SIZE - 1 && (c = this.world.getChunk(this.x, this.y + 1, this.z)))
      c.buildMesh();
    if (z === 0 && (c = this.world.getChunk(this.x, this.y, this.z - 1)))
      c.buildMesh();
    if (z === mc.CHUNK_SIZE - 1 && (c = this.world.getChunk(this.x, this.y, this.z + 1)))
      c.buildMesh();*/
  };
  MC.Chunk.prototype.setBlock = function(x, y, z, id) {
    var index = x + z * MC.CHUNK_SIZE + y * MC.CHUNK_SIZE * MC.CHUNK_SIZE;
    this.blocks[index] = id;

    /*if (this.isBuilding()) {
      if (!this.diff) {
        this.diff = Object.create(null);
      }
      this.diff[index] = id; // TODO
    } else {
      this.transBlocks[index] = id;
      if (arguments.length > 4) this.transMetadata[index] = meta;
    }
    this.buildMesh();*/
  };
  MC.Chunk.prototype.setBloc = function(x, y, z, id) {
    var index = x + z * MC.CHUNK_SIZE + y * MC.CHUNK_SIZE * MC.CHUNK_SIZE;
    this.blocks[index] = id;

    var key = MC.util.positionKey(x, y, z);
    if (this.blockIndexes[key]) {
      this.queue[key] = {
        m: 'a',
        r: this.blockIndexes[key]
      };
    }
  };
  MC.Chunk.prototype.getBlock = function(x, y, z) {
    if (x < 0 || x >= MC.CHUNK_SIZE || y < 0 || y > MC.CHUNK_SIZE || z < 0 || z >= MC.CHUNK_SIZE) {
      return -1;
    }
    return this.blocks[x + z * MC.CHUNK_SIZE + y * MC.CHUNK_SIZE * MC.CHUNK_SIZE];
  };
  
  MC.Chunk.prototype.isBlockSolid = function(x, y, z) {
    var id = this.getBlock(x, y, z);
    var b = MC.Blocks.get(id);
    if (b) {
      return b.solid;
    } else if (id === -1) {
      return true;
    }
    return false;
  };

  MC.Chunk.prototype.buildMesh = function() {
    if (this.queued) {
      return;
    }
    this.queued = true;
    this.world.queueChunk(this);
  };
  MC.Chunk.prototype.isBuilding = function() {
    return !(this.transBlocks && this.transBlocks.buffer);
  };
  MC.Chunk.prototype.setGeometryBuffer = function(res) {
    this.blockIndexes = res.blocks;
    var geometry = new THREE.BufferGeometry();
    geometry.dynamic = true;
    this.attributes = geometry.attributes = res.attributes;
    var r = geometry.attributes.index.array.length;
    geometry.r = r;
    geometry.offsets = [{
      start: 0,
      count: r,
      index: 0
    }];
    /*while (r > 0) {
      geometry.offsets = [{
        start: 0,
        count: Math.min(0x10000, r),
        index: 0
      }];
      r -= 0x10000;
    }*/
    //geometry.computeVertexNormals(); // TODO: Do we even need normals? They're slow to compute
    var mesh = new THREE.Mesh(geometry, this.world.mc.resources.materials.terrain);

    this.oldMesh = this.mesh;
    this.dirty = false;
    this.mesh = mesh;
    this.world.updateGeometry(this);
    this.queued = false;
    this.applyDiff();
    this.functions = this.createFunctions();
  };
  MC.Chunk.prototype.applyDiff = function() {
    if (this.diff && !this.isBuilding()) {
      for (var i in this.diff) {
        this.transBlocks[i] = this.diff[i];
      }
      this.buildMesh();
    }
  };
  MC.Chunk.prototype.createFunctions = function() {
    var self = this;
    var world = this.world;
    var inst = this.world.mc;

    var size = inst.resources.terrainSize;
    var tileWidth = inst.resources.tileWidth;
    var tileHeight = inst.resources.tileHeight;
    var incX = [0, 0, 1 / size, 1 / size];
    var incY = [0, 1 / size, 1 / size, 0];
    var indexes = inst.resources.index;

    function wrap(array) {
      return {
        push: function(value) {
          array.needsUpdate = true;
          array.array[array.numItems] = value;
          return array.numItems++;
        }
      };
    }

    var indices = wrap(this.attributes.index);
    var positions = wrap(this.attributes.position);
    var colors = wrap(this.attributes.color);
    var uvs = wrap(this.attributes.uv);

    var f = {
      index: function(n) {
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
      squad: function(n, x1, y1, z1, s1, x2, y2, z2, s2, x3, y3, z3, s3, x4, y4, z4, s4) {
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
        if (x < 0 || x >= MC.CHUNK_SIZE || y < 0 || y >= MC.CHUNK_SIZE || z < 0 || z >= MC.CHUNK_SIZE) {
          var cx = (x + MC.CHUNK_SIZE * pos.x) >> 4;
          var cy = (y + MC.CHUNK_SIZE * pos.y) >> 4;
          var cz = (z + MC.CHUNK_SIZE * pos.z) >> 4;
          var c = world.getChunk(cx, cy, cz);
          if (!c) {
            return -1;
          }
          return c.blocks[mod(x, MC.CHUNK_SIZE) + mod(z, MC.CHUNK_SIZE) * MC.CHUNK_SIZE + mod(y, MC.CHUNK_SIZE) * MC.CHUNK_SIZE * MC.CHUNK_SIZE];
        }
        // special case for this chunk for optimization
        return self.blocks[x + z * MC.CHUNK_SIZE + y * MC.CHUNK_SIZE * MC.CHUNK_SIZE];
      },
      getProp: function(x, y, z, prop) {
        var arr;
        if (x < 0 || x >= MC.CHUNK_SIZE || y < 0 || y >= MC.CHUNK_SIZE || z < 0 || z >= MC.CHUNK_SIZE) {
          var cx = (x + MC.CHUNK_SIZE * pos.x) >> 4;
          var cy = (y + MC.CHUNK_SIZE * pos.y) >> 4;
          var cz = (z + MC.CHUNK_SIZE * pos.z) >> 4;
          var c = world.getChunk(cx, cy, cz);
          if (!c) {
            return -1;
          }
          arr = c[prop];
        } else {
          // special case for this chunk for optimization
          arr = self[prop];
        }
        var b = arr[(mod(x, MC.CHUNK_SIZE) + mod(z, MC.CHUNK_SIZE) * MC.CHUNK_SIZE + mod(y, MC.CHUNK_SIZE) * MC.CHUNK_SIZE * MC.CHUNK_SIZE) >> 1];
        return (x % 2 ? b >> 4 : b) & 0xf;
      },
      getBlockLight: function(x, y, z) {
        return f.getProp(x, y, z, 'blockLight');
      },
      getSkyLight: function(x, y, z) {
        return f.getProp(x, y, z, 'skyLight');
      },
      isBlockOpaque: function(x, y, z) {
        return false;
        var id = f.getBlock(x, y, z);
        if (MC.blocks[id]) {
          return MC.blocks[id].solid && !MC.blocks[id].transparent;
        } else if (id === -1) {
          return true;
        }
        return false;
      }
    };
    return f;
  };


  MC.GUI = function(mc, container) {
    this.mc = mc;
    this.content;
    this.canvas;
    this.chat;
    this.overlay;
    this.loading;
    this.bar;
    this.auth;
    this.username;
    this.password;
    this.button;
    this.renderer;

    this.keysDown = [];
    for (var i = 0; i < 255; i++) {
      this.keysDown[i] = false;
    }

    this.buildDom();
    this.configurePointerLock();
    this.buildRenderer();
    container.appendChild(this.content);

    this.update();
  };
  MC.GUI.prototype.configurePointerLock = function() {
    this.isPointerLocked = false;
    var pointerLockChange = function() {
      this.isPointerLocked = this.content === (document.pointerLockElement || document.mozPointerLockElement);
    }.bind(this);
    document.addEventListener('pointerlockchange', pointerLockChange);
    document.addEventListener('mozpointerlockchange', pointerLockChange);

    var pointerLockError = function() {
      this.isPointerLocked = false;
    }.bind(this);
    document.addEventListener('pointerlockerror', pointerLockError);
    document.addEventListener('mozpointerlockerror', pointerLockError);

    this.content.requestPointerLock = this.content.requestPointerLock || this.content.mozRequestPointerLock;
    this.canvas.addEventListener('click', function(e) { // TODO: tweak when pointer lock activates
      this.content.requestPointerLock();
    }.bind(this));
  };
  MC.GUI.prototype.buildRenderer = function() {
    this.renderer = new THREE.WebGLRenderer({canvas: this.canvas});
    this.renderer.setClearColor(0x101010); // sky: :0xbfd1e5
    this.scene = new THREE.Scene();

    this.scene.add(new THREE.AmbientLight(0xffd880));

    this.camera = new THREE.PerspectiveCamera(120, 1, 0.001, 20000);
    this.selector = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({
      color: 0x00ee00,
      wireframe: true,
      wireframeLinewidth: 2,
      transparent: true
    }));
    this.scene.add(this.selector);
  };
  MC.GUI.prototype.tick = function() {
    
  };
  MC.GUI.prototype.render = function() {
    if (this.scene)
      this.renderer.render(this.scene, this.camera);
  };
  MC.GUI.prototype.update = function() {
    this.canvas.width = this.content.clientWidth;
    this.canvas.height = this.content.clientHeight;
    this.renderer.setSize(this.content.clientWidth, this.content.clientHeight);
    this.camera.aspect = this.content.clientWidth / this.content.clientHeight;
    this.camera.updateProjectionMatrix();
  };
  MC.GUI.prototype.buildDom = function() {
    this.content = document.createElement('div');
    this.content.setAttribute('class', 'content');
    this.content.setAttribute('tabindex', 0);

      this.canvas = document.createElement('canvas');

    this.content.appendChild(this.canvas);

      this.cursor = document.createElement('div');
      this.cursor.setAttribute('class', 'cursor');

    this.content.appendChild(this.cursor);

      this.chat = document.createElement('div');
      this.chat.setAttribute('class', 'chat');

    this.content.appendChild(this.chat);

      this.overlay = document.createElement('div');
      this.overlay.setAttribute('class', 'overlay');

        this.loading = document.createElement('div');
        this.loading.setAttribute('class', 'loading');

          this.bar = document.createElement('div');
          this.bar.setAttribute('class', 'bar');

        this.loading.appendChild(this.bar);

      this.overlay.appendChild(this.loading);

        this.auth = document.createElement('div');
        this.auth.setAttribute('class', 'auth');

        this.username = document.createElement('input');
        this.username.setAttribute('class', 'username');
        this.username.setAttribute('type', 'text');
        this.username.setAttribute('placeholder', 'username');

        this.auth.appendChild(this.username);

        this.password = document.createElement('input');
        this.password.setAttribute('class', 'password');
        this.password.setAttribute('type', 'password');
        this.password.setAttribute('placeholder', 'password');

        this.auth.appendChild(this.password);

        this.button = document.createElement('button');
        this.button.setAttribute('class', 'button');
        this.button.innerText = 'sign in';

        this.auth.appendChild(this.button);

      this.overlay.appendChild(this.auth);

    this.content.appendChild(this.overlay);

    this.button.addEventListener('click', function() {
      //this.mc.joinServer(this.username.value, this.password.value);
    }.bind(this));

    this.content.addEventListener('keydown', function(e) {
      this.keysDown[e.keyCode] = true;
    }.bind(this), false);

    this.content.addEventListener('keyup', function(e) {
      this.keysDown[e.keyCode] = false;
    }.bind(this), false);

    window.addEventListener('resize', this.update.bind(this));

    this.stats = new Stats();
    this.stats.domElement.style.position = 'absolute';
    this.stats.domElement.style.top = '0px';
    this.content.appendChild(this.stats.domElement);
  };
  MC.GUI.prototype.signIn = function(cb) {
    this.mc.server.once('session', function(data) {
      if (data.err) {
        return console.log(data.err);
      }
      var session = data.session;
      this.button.removeEventListener('click', click);
      this.overlay.style.display = 'none';
      localStorage.session = JSON.stringify(session);
      cb(null, session);
    }.bind(this));
    var session;
    if (localStorage.session && (session = JSON.parse(localStorage.session))) {
      this.mc.server.send('refresh', session);
    } else {
      this.auth.style.display = 'block';
      this.username.focus();
      var click = function() {
        var cred = {
          username: this.username.value,
          password: this.password.value
        };
        localStorage.credentials = JSON.stringify(cred);
        this.mc.server.send('authenticate', cred);
      }.bind(this);
      this.button.addEventListener('click', click);
    }
  };

  MC.nbt = {
    read: function(data) {
      var stream = new Streams.ReadStream(new Uint8Array(data).buffer);
      
      var id = stream.uint8();
      MC.nbt.tags.read[8](stream);
      return MC.nbt.tags.read[id](stream);
    },
    
    tags: {
      read: {
        1: function(stream) {
          return stream.int8();
        },
        2: function(stream) {
          return stream.int16();
        },
        3: function(stream) {
          return stream.int32();
        },
        4: function(stream) {
          return stream.int64();
        },
        5: function(stream) {
          return stream.float32();
        },
        6: function(stream) {
          return stream.float64();
        },
        7: function(stream) {
          var size = stream.int32();
          var array = new Uint8Array(size);
          for (var i = 0; i < size; ++i) {
            array[i] = stream.int8();
          }
          return array;
        },
        8: function(stream) {
          return stream.utf8(stream.uint16());
        },
        9: function(stream) {
          var id = stream.uint8();
          var size = stream.uint32();
          var array = [];
          while (size--) {
            array.push(MC.nbt.tags.read[id](stream));
          }
          return array;
        },
        10: function(stream) {
          var obj = {};
          while (true) {
            var id = stream.uint8();
            if (!id) {
              break;
            }
            var n = MC.nbt.tags.read[8](stream);
            var v = MC.nbt.tags.read[id](stream);
            obj[n] = v;
          }
          return obj;
        },
        11: function(stream) {
          var size = stream.int32();
          var array = new Uint32Array(size);
          for (var i = 0; i < size; ++i) {
            array[i] = stream.int32();
          }
          return array;
        }
      }    
    }
  };

  MC.Text = function(translation) {
    this.translation = translation;
  };
  MC.Text.prototype.format = function(obj) {
    var text = obj.text;
    if (obj.translate) {
      text += translation[obj.translate](this.format(obj.with));
    }
  };

  MC.ResourcePack = function(paths) {
    this.paths = paths;
    this.assets = {};
    this.terrain = null;
    this.textures = {};
    this.materials = {};

    this.builderConfig = {
      config: true
    };
  };
  MC.ResourcePack.prototype.createResouces = function() {
    var terrain = new THREE.Texture(this.terrain);
    terrain.needsUpdate = true;
    terrain.wrapS = THREE.RepeatWrapping;
    terrain.wrapT = THREE.RepeatWrapping;
    terrain.magFilter = THREE.NearestFilter;
    terrain.minFilter = THREE.NearestMipMapNearestFilter;
    this.textures.terrain = terrain;
    MC.shaders.terrain.map = this.textures.terrain;
    this.materials.terrain = MC.shaders.terrain;
  };
  MC.ResourcePack.prototype.load = function(progress, cb) {
    var self = this;
    this.loadAssets(progress, function(err) {
      if (err) return cb(err);
      self.loaded();
      cb();
    });
  };
  MC.ResourcePack.prototype.loadAssets = function(progress, cb) {
    var self = this;
    async.eachSeries(this.paths, function(path, cb) {
      zip.createReader(new zip.HttpReader(path), function(reader) {
        reader.getEntries(function(entries) {
          var assets = entries.filter(function(entry) {
            return /\.(png|json|lang)$/.test(entry.filename);
          });
          var i = 0;
          async.eachLimit(assets, 10, function(entry, cb) {
            var name = entry.filename;
            if (/\.png$/.test(entry.filename)) {
              entry.getData(new zip.BlobWriter('image/png'), function(blob) {
                var img = new Image();
                self.assets[name] = img;
                img.onload = function() {
                  progress(++i / assets.length);
                  cb();
                };
                img.src = URL.createObjectURL(blob);
              });
            } else if (/\.json$/.test(entry.filename)) {
              entry.getData(new zip.TextWriter(), function(json) {
                self.assets[name] = JSON.parse(json);
                progress(++i / assets.length);
                cb();
              });
            } else if (/\.lang$/.test(entry.filename)) {
              entry.getData(new zip.TextWriter(), function(text) {
                var translations = self.assets[name] = {};
                (text.match(/[^\n\r]+/g) || []).forEach(function(l) {
                  var m = l.match(/^([^=]+)=(.*)$/);
                  if (!m) return;
                  var i = 0;
                  translations[m[1]] = new Function('a', 'return "' + JSON.stringify(m[2]).slice(1, -1).replace(/(.?)%(.)/g, function(m, b, t) {
                    if (b === '%' || b === '') return m;
                    return b + '" + a[' + i++ + '] + "';
                  }) + '"');
                });
                progress(++i / assets.length);
                cb();
              });
            } else {
              cb();
            }
          }, cb);
        }, cb);
      }, cb);
    }, cb);
  };
  MC.ResourcePack.prototype.loaded = function() {
    this.buildTerrain();
    this.buildModels();
    this.buildBlockStates();
    this.createResouces();
    this.language = this.assets['assets/minecraft/lang/en_US.lang']; // TODO: Configure
  };
  MC.ResourcePack.prototype.buildModels = function() {
    var self = this;
    var models = {};
    var regex = /^assets\/([^\/]*)\/models\/(block\/.*)\.json$/;
    Object.keys(this.assets).filter(function(n) {
      return regex.test(n);
    }).forEach(function(n) {
      var m = n.match(regex);
      if (!models[m[1]]) {
        models[m[1]] = {};
      }
      models[m[1] + ':' + m[2]] = self.assets[n];
    });

    Object.keys(models).forEach(function(name) {
      var model = models[name];
      if (!model.parent) return;
      var parent = model.parent;
      if (!~parent.indexOf(':')) parent = 'minecraft:' + parent;
      model.parent = models[parent];
    });

    function collect(model) {
      var parent = model.parent ? collect(model.parent) : {
        elements: [],
        textures: {},
        ambientocclusion: true,
      };
      if (model.elements) {
        parent.elements = parent.elements.concat(JSON.parse(JSON.stringify(model.elements)));
      }
      if (model.textures) {
        Object.keys(model.textures).forEach(function(key) {
          parent.textures[key] = JSON.parse(JSON.stringify(model.textures[key]));
        });
      }
      parent.ambientocclusion = typeof model.ambientocclusion === 'undefined' ? true : model.ambientocclusion;
      return parent;
    }

    function resolve(vars, name) {
      if (name && name[0] === '#') {
        return vars[name.slice(1)] = resolve(vars, vars[name.slice(1)]) || '!' + name;
      }
      return name;
    }

    Object.keys(models).forEach(function(name) {
      var model = models[name];
      var vars = collect(model);
      var textures = vars.textures;
      var elements = vars.elements;
      elements.forEach(function(element) {
        var fr = element.from;
        element.from = {x: fr[0] / 16, y: fr[1] / 16, z: fr[2] / 16};
        var to = element.to;
        element.to = {x: to[0] / 16, y: to[1] / 16, z: to[2] / 16};
        if (!element.type || element.type === 'cube') {
          var faces = element.faces || element.faceData;
          Object.keys(faces).forEach(function(dir) {
            var face = faces[dir];
            var texture = self.builderConfig.terrainRects['minecraft:' + resolve(textures, face.texture)];
            delete face.texture;
            if (!texture) {
              texture = {x1: 0, y1: 0, x2: 1, y2: 1};
            }
            if (!face.uv) {
              face.uv = [0, 0, 16, 16];
            }
            var w = texture.x2 - texture.x1;
            var h = texture.y2 - texture.y1;
            face.uv = {
              x1: texture.x1 + w * face.uv[0] / 16,
              y1: texture.y1 + h * face.uv[1] / 16,
              x2: texture.x1 + w * face.uv[2] / 16,
              y2: texture.y1 + h * face.uv[3] / 16,
            };
          });
        } else {
          // TODO
        }
      });
      delete vars.textures;
      models[name] = vars;
    });

    this.builderConfig.models = this.models = models;
  };
  MC.ResourcePack.prototype.buildBlockStates = function() {
    var self = this;
    var blockStates = {};
    var regex = /^assets\/([^\/]*)\/blockstates\/(.*)\.json$/;
    Object.keys(this.assets).filter(function(n) {
      return regex.test(n);
    }).forEach(function(n) {
      var m = n.match(regex);
      if (!blockStates[m[1]]) {
        blockStates[m[1]] = {};
      }
      blockStates[m[1] + ':' + m[2]] = self.assets[n];
    });
    this.builderConfig.blockStates = this.blockStates = blockStates;
  };
  MC.ResourcePack.prototype.buildTerrain = function() {
    var self = this;
    var regex = /^assets\/([^\/]*)\/textures\/(blocks\/.*)\.png$/;
    var blocks = Object.keys(this.assets).filter(function(n) {
      return regex.test(n);
    }).map(function(n) {
      var m = n.match(regex);
      var name = m[1] + ':' + m[2];
      return {
        name: name,
        asset: self.assets[n]
      };
    });
    blocks.sort(function(a, b) {
      return b.asset.height - a.asset.height;
    });

    var maxWidth = 0;
    var maxHeight = 0;
    blocks.forEach(function(b) {
      maxWidth = Math.max(b.asset.width, maxWidth);
      maxHeight = Math.max(b.asset.height, maxHeight);
    });

    var max = Math.max(maxWidth, maxHeight);

    var root = {
      rect: {x: 0, y: 0, w: max / 4 /* TODO: Don't hardcode width */, h: max}
    };

    function drawRoot() {
      var canvas = document.createElement('canvas');
      canvas.width = root.rect.w;
      canvas.height = root.rect.h;
      var ctx = canvas.getContext('2d');

      drawNode(ctx, root, 0);

      return canvas;
    }

    function drawNode(ctx, node) {
      if (node.block) ctx.drawImage(node.block.asset, node.rect.x, node.rect.y);
      if (node.a) drawNode(ctx, node.a);
      if (node.b) drawNode(ctx, node.b);
    }

    function insert(node, block) {
      if (node.a || node.b) {
        var newNode = insert(node.a, block);
        if (newNode) {
          return newNode;
        }
        return insert(node.b, block);
      } else {
        if (node.block || node.rect.w < block.asset.width || node.rect.h < block.asset.height) {
          return null;
        }
        if (node.rect.w === block.asset.width && node.rect.h === block.asset.height) {
          return node;
        }

        node.a = {};
        node.b = {};

        var dw = node.rect.w - block.asset.width;
        var dh = node.rect.h - block.asset.height;

        if (dw > dh) {
          node.a.rect = {x: node.rect.x, y: node.rect.y, w: block.asset.width, h: node.rect.h};
          node.b.rect = {x: node.rect.x + block.asset.width, y: node.rect.y, w: node.rect.w - block.asset.width, h: node.rect.h};
        } else {
          node.a.rect = {x: node.rect.x, y: node.rect.y, w: node.rect.w, h: block.asset.height};
          node.b.rect = {x: node.rect.x, y: node.rect.y + block.asset.height, w: node.rect.w, h: node.rect.h - block.asset.height};
        }
        return insert(node.a, block);
      }
    }
    blocks.forEach(function(block) {
      var node = insert(root, block);
      if (!node) {
        throw new Error('Could not fit texture.');
      }
      node.block = block;
    });

    var positions = {};
    function find(node) {
      if (node) {
        if (node.block) {
          positions[node.block.name] = {
            x1: node.rect.x / root.rect.w,
            y1: 1 - ((node.rect.y + node.rect.h) / root.rect.h),
            x2: (node.rect.x + node.rect.w) / root.rect.w,
            y2: 1 - (node.rect.y / root.rect.h),
          };
        }
        find(node.a);
        find(node.b);
      }
    }
    find(root);

    this.terrain = drawRoot();
    this.builderConfig.terrainRects = positions;
  };
  MC.ResourcePack.prototype.configure = function(worker) {
    worker.postMessage(this.builderConfig);
  };

  MC.Server = function(host) {
    this.worker = new Worker('./js/workers/server.js');
    this.worker.onmessage = this._onmessage.bind(this);
    this.worker.postMessage({
      type: 'connect',
      host: host
    });
  };
  heir.inherit(MC.Server, EventEmitter);
  MC.Server.prototype._onmessage = function(e) {
    //console.log(e.data.type);
    switch (e.data.type) {
      case 'connect':
        connect(e.data.host);
        break;
      case 'error':
        this.emit('error');
        break;
      case 'open':
        this.emit('open');
        break;
      case 'close':
        this.emit('close');
        break;
      case 'packet':
        // console.groupCollapsed('In: ' + e.data.packet.type);
        // console.log(e.data.packet.packet);
        // console.groupEnd();
        this.emit(e.data.packet.type, e.data.packet.packet);
        break;
      default:
        console.error('Unregistered type', e.data.type);
    }
  }
  MC.Server.prototype.send = function(type, packet) {
    // console.groupCollapsed('Out: ' + type);
    // console.log(packet);
    // console.groupEnd();
    this.worker.postMessage({
      type: 'packet',
      packet: {
        type: type,
        packet: packet
      }
    });
  };
  MC.Server.prototype.close = function() {
    this.worker.postMessage({type: 'close'});
  };
}) (MC);
