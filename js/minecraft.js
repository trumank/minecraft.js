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

  MC.Minecraft = class Minecraft {
    constructor(container, server) {
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
        this.gui.offline(function(err) {
          this.joinServer(server.host, server.port);
        }.bind(this));
        this.gui.testWorld(function(err) {
          this.joinTestWorld();
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
    }
    loadResources(cb) {
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
    }
    joinServer(host, port) {
      var loader = new MC.ServerChunkLoader(this.server);
      this.world = loader.world = new MC.World(this, loader, this.gui.scene);
      this.player = new MC.Player(this, 'Player', this.gui.camera, this.gui.selector);

      this.server.send('connect', {
        host: host,
        port: port,
        username: 'Bot'
      });
    }
    joinTestWorld() {
      this.server = new MC.TestServer();
      var loader = new MC.TestChunkLoader();
      this.world = loader.world = new MC.World(this, loader, this.gui.scene);
      this.player = new MC.Player(this, 'Player', this.gui.camera, this.gui.selector);
    }
    tick() {
      this.gui.stats.begin();
      if (this.world)
        this.world.tick();
      if (this.player)
        this.player.tick();
      this.gui.tick();
      this.gui.render();
      this.gui.stats.end();
    }
    sendSettins() {
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
    }
  };

  MC.Player = class Player {
    constructor(mc, name, camera, selector) {
      this.mc = mc;
      this.name = name;
      this.camera = camera;
      this.selector = selector;
      this.selected = null;
      this.velocity = new THREE.Vector3(0, 0, 0);
      this.position = camera.position;
      this.walkingSpeed = 0.1;
      this.flyingSpeed = 0.3;
      this.lat = this.lon = 0;
      this.facing = new THREE.Vector3(1, 0, 0);
      this.heldItem = 1;

      this.viewDistance = 2;

      this.spawned = false;
      this.flying = true;

      this.mc.gui.content.addEventListener('keypress', function(e) {
        switch (String.fromCharCode(e.keyCode)) {
        case 'f':
          this.flying = !this.flying;
          break;
        }
      }.bind(this), false);

      this.mc.gui.content.addEventListener('click', function(e) {
        if (!this.mc.gui.isPointerLocked) {
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
    }
    tick() {
      var speed = this.flying ? this.flyingSpeed : this.walkingSpeed;
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

      this.updateSelection();
    }
    correctCollision() {
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
        var epsilon = 0.001;
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
    getBoundingBox() {
      var p = this.position;
      return new THREE.Box3(new THREE.Vector3(p.x - 0.3, p.y - 1.62, p.z - 0.3), new THREE.Vector3(p.x + 0.3, p.y + 0.3, p.z + 0.3));
    };
    updateSelection() {
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
    testBox(box) {
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
    findSelectedFace(box) {
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
    getChunk() {
      return this.mc.world.getChunk(this.position.x / MC.CHUNK_SIZE | 0, this.position.y / MC.CHUNK_SIZE | 0, this.position.z / MC.CHUNK_SIZE | 0);
    };
    breakBlock() {
      var p = this.selected;
      if (p) {
        this.mc.world.setBlock(p.x, p.y, p.z, 0);
      }
    };
    pickBlock() {
      var p = this.selected;
      if (p) {
        this.heldItem = this.mc.world.getBlock(p.x, p.y, p.z);
      }
    };
    placeBlock() {
      if (this.selected) {
        var p = this.selected.clone().add(this.selectedFace);
        this.mc.world.setBlock(p.x, p.y, p.z, this.heldItem);
      }
    };
    sendUpdate() {
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
  };

  MC.CHUNK_SIZE = 16;

  MC.World = class World {
    constructor(inst, loader, scene) {
      this.mc = inst;
      this.chunks = {};
      this.chunkLoader = loader;
      this.scene = scene;
      this.queuedChunks = [];
      this.workers = [];
      var self = this;
      for (var i = 0; i < navigator.hardwareConcurrency; i++) {
        var worker = [new Worker('js/workers/chunk.js'), 0];
        this.mc.resources.configure(worker[0]);
        worker[0].onmessage = function (msg) {
          self._onmessage(msg, worker);
        };
        this.workers.push(worker)
      }
    }
    _onmessage(msg, worker) {
      var [type, data] = msg.data;
      switch (type) {
        case 'chunk':
          var p = data.position;
          var chunk = this.getChunk(p.x, p.y, p.z);
          if (chunk) {
            chunk.setFromWorker(data.data);
          }
          break;
        case 'mesh':
          var p = data.position;
          var chunk = this.getChunk(p.x, p.y, p.z);
          if (chunk) {
            chunk.setGeometryBuffer(data.mesh);
          }
          worker[1]--;
          break;
        default:
          throw new Error('Unkown message type', type);
      }
    }
    tick() {
      this.buildQueuedChunks();
    }
    loadChunk(x, y, z) {
      var data = this.chunkLoader.load(x, y, z);
      if (data) {
        this.setChunk(x, y, z, new MC.Chunk(this, x, y, z, data));
      }
    }
    unloadChunk(x, y, z) {
      var mesh = this.getChunk(x, y, z).mesh;
      if (mesh) {
        this.scene.remove(mesh);
      }
      delete this.chunks[MC.util.positionKey(x, y, z)];
    }
    queueChunk(chunk) {
      this.queuedChunks.push(chunk);
    }
    buildQueuedChunks() {
      for (var i = this.queuedChunks.length - 1; i >= 0; i--) {
        var chunk = this.queuedChunks[i];
        if (!chunk.readyToBuild()) continue;
        var least;
        var leastLoad = Infinity;
        for (var worker of this.workers) {
          if (worker[1] < leastLoad) {
            leastLoad = worker[1];
            least = worker;
          }
        }
        for (var n of chunk.getSurroundingChunks()) {
          n.sendToWorker(least[0], false);
        }
        chunk.sendToWorker(least[0], true);
        least[1]++;
        this.queuedChunks.splice(i, 1);
      }
    }
    rebuildDirty() {
      for (var key of Object.keys(this.chunks)) {
        var chunk = this.chunks(key);
        if (chunk.dirty) {
          chunk.buildMesh();
        }
      }
    }
    getChunk(x, y, z) {
      return this.chunks[MC.util.positionKey(x, y, z)];
    }
    setChunk(x, y, z, chunk) {
      this.chunks[MC.util.positionKey(x, y, z)] = chunk;
    }
    getChunkContainingBlock(x, y, z) {
      return this.getChunk(x >> 4, y >> 4, z >> 4);
    }
    getSurroundingChunks(x, y, z) {
      var d = [{x:1,y:0,z:0},{x:-1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:-1,z:0},{x:0,y:0,z:1},{x:0,y:0,z:-1}];
      var chunks = [];
      for (var i = 0; i < d.length; i++) {
        var c = this.getChunk(x + d[i].x, y + d[i].y, z + d[i].z);
        if (c) {
          chunks.push(c);
        }
      }
      return chunks;
    }
    filterChunks(filter) {
      var chunks = [];
      for (var c in this.chunks) {
        if (filter(this.chunks[c])) {
          chunks.push(this.chunks[c]);
        }
      }
      return chunks;
    }
    setBloc(x, y, z, id, meta) {
      var mx = MC.util.mod(x, MC.CHUNK_SIZE);
      var my = MC.util.mod(y, MC.CHUNK_SIZE);
      var mz = MC.util.mod(z, MC.CHUNK_SIZE);
      var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
      if (chunk) {
        chunk.setBloc(mx, my, mz, id, meta);
      }
    }
    setBlock(x, y, z, id, meta) {
      var mx = MC.util.mod(x, MC.CHUNK_SIZE);
      var my = MC.util.mod(y, MC.CHUNK_SIZE);
      var mz = MC.util.mod(z, MC.CHUNK_SIZE);
      var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
      if (chunk) {
        chunk.setBlock(mx, my, mz, id, meta);
      }
    }
    setMeta(x, y, z, id) {
      var mx = MC.util.mod(x, MC.CHUNK_SIZE);
      var my = MC.util.mod(y, MC.CHUNK_SIZE);
      var mz = MC.util.mod(z, MC.CHUNK_SIZE);
      var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
      if (chunk) {
        chunk.setMeta(mx, my, mz, id);
      }
    }
    getBlock(x, y, z) {
      var mx = MC.util.mod(x, MC.CHUNK_SIZE);
      var my = MC.util.mod(y, MC.CHUNK_SIZE);
      var mz = MC.util.mod(z, MC.CHUNK_SIZE);
      var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
      return chunk ? chunk.getBlock(mx, my, mz) : 0;
    }
    getMeta(x, y, z) {
      var mx = MC.util.mod(x, MC.CHUNK_SIZE);
      var my = MC.util.mod(y, MC.CHUNK_SIZE);
      var mz = MC.util.mod(z, MC.CHUNK_SIZE);
      var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
      return chunk ? chunk.getMeta(mx, my, mz) : 0;
    }
    getModel(x, y, z) {
      var id = this.getBlock(x, y, z);
      return MC.Blocks.getModel(this.mc.resources, id, 0);
    }
    getBlockState(x, y, z) {
      var id = this.getBlock(x, y, z);
      var states = this.mc.resources.blockStates[MC.Blocks.getById(id).name];
      if (!states) {
        return null;
      }
      var variants = Object.keys(states.variants);
      var state = states.variants[variants[0]]; // TODO
      if (Array.isArray(state)) {
        state = state[0]; // TODO
      }
      return state;
    }
    getAABBs(x, y, z) {
      var model = this.getModel(x, y, z);
      if (!model) {
        return [];
      }
      return model[0].model.elements.map(function(element) {
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
    }
    isBlockSolid(x, y, z) {
      var mx = MC.util.mod(x, MC.CHUNK_SIZE);
      var my = MC.util.mod(y, MC.CHUNK_SIZE);
      var mz = MC.util.mod(z, MC.CHUNK_SIZE);
      var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
      return chunk ? chunk.isBlockSolid(mx, my, mz) : 0;
    };
    updateGeometry(chunk) {
      if (chunk.oldMesh)
        this.scene.remove(chunk.oldMesh);

      chunk.mesh.position.x = chunk.x * MC.CHUNK_SIZE;
      chunk.mesh.position.y = chunk.y * MC.CHUNK_SIZE;
      chunk.mesh.position.z = chunk.z * MC.CHUNK_SIZE;
      this.scene.add(chunk.mesh);
    }
  };


  MC.ServerChunkLoader = class ServerChunkLoader {
    constructor(server) {
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
          stream.arrayBuffer(MC.CHUNK_SIZE * MC.CHUNK_SIZE); // ignore biomes
        });
      });
    }
    load(x, y, z) {
      return this.chunks[x + '_' + y + '_' + z];
    }
  };
  MC.ServerChunkLoader.prototype.COLUMN_HEIGHT = 16;


  MC.TestChunkLoader = class TestChunkLoader {
    constructor() {

    }
    load(x, y, z) {
      var size = MC.CHUNK_SIZE*MC.CHUNK_SIZE*MC.CHUNK_SIZE;
      if (x === 0 && y === 0 && z === 0) {
        var chunk = {
          blocks: new Uint16Array(size),
          blockLight: new Uint8Array(size / 2),
          skyLight: new Uint8Array(size / 2),
        };
        var id = 0;
        for (var x = 0; x < MC.CHUNK_SIZE; x += 2) {
          for (var y = 0; y < MC.CHUNK_SIZE; y += 2) {
            for (var z = 0; z < MC.CHUNK_SIZE; z += 2) {
              chunk.blocks[z + y * MC.CHUNK_SIZE + x * MC.CHUNK_SIZE * MC.CHUNK_SIZE] = id++;
            }
          }
        }
        for (var i = 0; i < chunk.blockLight.length; i++) {
          chunk.blockLight[i] = 0xff;
        }
        return chunk;
      } else if (x === -1 && y === 0 && z === 0) {
        var chunk = {
          blocks: new Uint16Array(size),
          blockLight: new Uint8Array(size / 2),
          skyLight: new Uint8Array(size / 2),
        };
        chunk.blocks[0] = 16;
        for (var i = 0; i < chunk.blockLight.length; i++) {
          chunk.blockLight[i] = 0xff;
        }
        return chunk;
      } else if (x === -2 && y === 0 && z === 0) {
        var chunk = {
          blocks: new Uint16Array(size),
          blockLight: new Uint8Array(size / 2),
          skyLight: new Uint8Array(size / 2),
        };
        var id = 0;
        for (var x = 0; x < MC.CHUNK_SIZE; x++) {
          for (var y = 0; y < MC.CHUNK_SIZE; y++) {
            for (var z = 0; z < MC.CHUNK_SIZE; z++) {
              chunk.blocks[z + y * MC.CHUNK_SIZE + x * MC.CHUNK_SIZE * MC.CHUNK_SIZE] = (Math.random() > 0.5 ? 116 : 117) << 4;
            }
          }
        }
        for (var i = 0; i < chunk.blockLight.length; i++) {
          chunk.blockLight[i] = 0xff;
        }
        return chunk;
      } else {
        return {
          blocks: new Uint16Array(size).fill(16),
          blockLight: new Uint8Array(size / 2).fill(0x77),
          skyLight: new Uint8Array(size / 2).fill(256),
        };
      }
    }
  };


  MC.AnvilChunkLoader = class AnvilChunkLoader {
    constructor(data) { // TODO: Needs to be updated (metadata?)
      this.data = data;
      this.stream = new Streams.ReadStream(data);
      this.chunks = {};
    }
    load(x, y, z) {
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
    }
  };

  MC.GUI = class GUI {
    constructor(mc, container) {
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
      this.buttonSignIn;
      this.buttonOffline;
      this.buttonTest;
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
    }
    configurePointerLock() {
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
    }
    buildRenderer() {
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
    }
    tick() {

    }
    render() {
      if (this.scene)
        this.renderer.render(this.scene, this.camera);
    }
    update() {
      this.canvas.width = this.content.clientWidth;
      this.canvas.height = this.content.clientHeight;
      this.renderer.setSize(this.content.clientWidth, this.content.clientHeight);
      this.camera.aspect = this.content.clientWidth / this.content.clientHeight;
      this.camera.updateProjectionMatrix();
    }
    buildDom() {
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

          this.buttonSignIn = document.createElement('button');
          this.buttonSignIn.innerText = 'sign in';

          this.auth.appendChild(this.buttonSignIn);

          this.buttonOffline = document.createElement('button');
          this.buttonOffline.innerText = 'offline';

          this.auth.appendChild(this.buttonOffline);

          this.buttonTest = document.createElement('button');
          this.buttonTest.innerText = 'test world';

          this.auth.appendChild(this.buttonTest);

        this.overlay.appendChild(this.auth);

      this.content.appendChild(this.overlay);

      this.content.addEventListener('keydown', function(e) {
        this.keysDown[e.keyCode] = true;
      }.bind(this), false);

      this.content.addEventListener('keyup', function(e) {
        this.keysDown[e.keyCode] = false;
      }.bind(this), false);

      this.content.addEventListener('blur', e => {
        for (var i = 0; i < 256; i++) {
          this.keysDown[i] = false;
        }
      });

      window.addEventListener('resize', this.update.bind(this));

      this.stats = new Stats();
      this.stats.domElement.style.position = 'absolute';
      this.stats.domElement.style.top = '0px';
      this.content.appendChild(this.stats.domElement);
    }
    signIn(cb) {
      this.mc.server.once('session', function(data) {
        if (data.err) {
          return console.log(data.err);
        }
        var session = data.session;
        this.buttonSignIn.removeEventListener('click', click);
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
        this.buttonSignIn.addEventListener('click', click);
      }
    }
    offline(cb) {
      this.buttonOffline.addEventListener('click', function() {
        this.overlay.style.display = 'none';
        cb(null);
      }.bind(this));
    }
    testWorld(cb) {
      this.buttonTest.addEventListener('click', function() {
        this.overlay.style.display = 'none';
        cb(null);
      }.bind(this));
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

  MC.Text = class Text {
    constructor(translation) {
      this.translation = translation;
    }
    format(obj) {
      var text = obj.text;
      if (obj.translate) {
        text += translation[obj.translate](this.format(obj.with));
      }
    }
  };

  MC.ResourcePack = class ResourcePack {
    constructor(paths) {
      this.paths = paths;
      this.assets = {};
      this.terrain = null;
      this.textures = {};
      this.materials = {};

      this.builderConfig = {
        CHUNK_SIZE: MC.CHUNK_SIZE
      };
    }
    createResouces() {
      var terrain = new THREE.Texture(this.terrain);
      terrain.needsUpdate = true;
      terrain.wrapS = THREE.RepeatWrapping;
      terrain.wrapT = THREE.RepeatWrapping;
      terrain.magFilter = THREE.NearestFilter;
      terrain.minFilter = THREE.NearestMipMapNearestFilter;
      this.textures.terrain = terrain;
      MC.shaders.terrain.map = this.textures.terrain;
      this.materials.terrain = MC.shaders.terrain;
    }
    load(progress, cb) {
      var self = this;
      this.loadAssets(progress, function(err) {
        if (err) return cb(err);
        self.loaded();
        cb();
      });
    }
    loadAssets(progress, cb) {
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
    }
    loaded() {
      this.buildTerrain();
      this.buildModels();
      this.buildBlockStates();
      this.createResouces();
      this.language = this.assets['assets/minecraft/lang/en_US.lang']; // TODO: Configure
      this.buildMeshingFunctions();
    }
    buildMeshingFunctions() {
      var models = [];
      for (var id = 0; id < 0xfff; id++) {
        var variants = MC.Blocks.getModel(this, id);
        if (!variants) continue;

        var str = '';

        str += '  var lPPP = fn.getBlockLight(x + 1, y + 1, z + 1);\n'
        str += '  var lPPC = fn.getBlockLight(x + 1, y + 1, z    );\n'
        str += '  var lPPM = fn.getBlockLight(x + 1, y + 1, z - 1);\n'
        str += '  var lPCP = fn.getBlockLight(x + 1, y    , z + 1);\n'
        str += '  var lPCC = fn.getBlockLight(x + 1, y    , z    );\n'
        str += '  var lPCM = fn.getBlockLight(x + 1, y    , z - 1);\n'
        str += '  var lPMP = fn.getBlockLight(x + 1, y - 1, z + 1);\n'
        str += '  var lPMC = fn.getBlockLight(x + 1, y - 1, z    );\n'
        str += '  var lPMM = fn.getBlockLight(x + 1, y - 1, z - 1);\n'
        str += '  var lCPP = fn.getBlockLight(x    , y + 1, z + 1);\n'
        str += '  var lCPC = fn.getBlockLight(x    , y + 1, z    );\n'
        str += '  var lCPM = fn.getBlockLight(x    , y + 1, z - 1);\n'
        str += '  var lCCP = fn.getBlockLight(x    , y    , z + 1);\n'
        str += '  var lCCM = fn.getBlockLight(x    , y    , z - 1);\n'
        str += '  var lCMP = fn.getBlockLight(x    , y - 1, z + 1);\n'
        str += '  var lCMC = fn.getBlockLight(x    , y - 1, z    );\n'
        str += '  var lCMM = fn.getBlockLight(x    , y - 1, z - 1);\n'
        str += '  var lMPP = fn.getBlockLight(x - 1, y + 1, z + 1);\n'
        str += '  var lMPC = fn.getBlockLight(x - 1, y + 1, z    );\n'
        str += '  var lMPM = fn.getBlockLight(x - 1, y + 1, z - 1);\n'
        str += '  var lMCP = fn.getBlockLight(x - 1, y    , z + 1);\n'
        str += '  var lMCC = fn.getBlockLight(x - 1, y    , z    );\n'
        str += '  var lMCM = fn.getBlockLight(x - 1, y    , z - 1);\n'
        str += '  var lMMP = fn.getBlockLight(x - 1, y - 1, z + 1);\n'
        str += '  var lMMC = fn.getBlockLight(x - 1, y - 1, z    );\n'
        str += '  var lMMM = fn.getBlockLight(x - 1, y - 1, z - 1);\n'

        str += '\n'

        var totalWeight = 0;
        for (var variant of variants) {
          totalWeight += variant.weight || 1;
        }

        str += '  var n = Math.random() * ' + totalWeight + ';\n\n'

        var w = 0;

        for (var i = 0; i < variants.length; i++) {
          var variant = variants[i];
          w += variant.weight || 1;
          if (i === 0) {
            str += '  if (n < ' + w + ') {\n';
          } else if (i === variants.length - 1) {
            str += '  } else {\n';
          } else {
            str += '  } else if (n < ' + w + ') {\n';
          }
          var rotation = new THREE.Matrix4();
          // rotation.multiply(new THREE.Matrix4().makeTranslation(0.5, 0.5, 0.5));
          // rotation.multiply(new THREE.Matrix4().makeRotationX((variant.x) * Math.PI / 180));
          // rotation.multiply(new THREE.Matrix4().makeRotationY((variant.y) * Math.PI / 180));
          // rotation.multiply(new THREE.Matrix4().makeTranslation(-0.5, -0.5, -0.5));

          switch(MC.util.mod(variant.x, 90) << 2 | MC.util.mod(variant.y, 90)) {

          }

          for (var element of variant.model.elements) {
            var ttt = new THREE.Vector3(element.to.x,   element.to.y,   element.to.z  ).applyMatrix4(rotation);
            var ttf = new THREE.Vector3(element.to.x,   element.to.y,   element.from.z).applyMatrix4(rotation);
            var tft = new THREE.Vector3(element.to.x,   element.from.y, element.to.z  ).applyMatrix4(rotation);
            var tff = new THREE.Vector3(element.to.x,   element.from.y, element.from.z).applyMatrix4(rotation);
            var ftt = new THREE.Vector3(element.from.x, element.to.y,   element.to.z  ).applyMatrix4(rotation);
            var fft = new THREE.Vector3(element.from.x, element.from.y, element.to.z  ).applyMatrix4(rotation);
            var ftf = new THREE.Vector3(element.from.x, element.to.y,   element.from.z).applyMatrix4(rotation);
            var fff = new THREE.Vector3(element.from.x, element.from.y, element.from.z).applyMatrix4(rotation);

            var f;
            f = element.faces.east;
            if (f) {
              if (f.cullface) str += '    if (!(culled >> 0 & 1))\n';
              str += '      fn.squade(' + f.uv.x1 + ', ' + f.uv.y1 + ', ' + f.uv.x2 + ', ' + f.uv.y2 + ',\n';
              str += '        x + ' + tff.x + ', y + ' + tff.y + ', z + ' + tff.z + ', (lPCC + lPMC + lPCM + lPMM) / 4,\n';
              str += '        x + ' + ttf.x + ', y + ' + ttf.y + ', z + ' + ttf.z + ', (lPCC + lPPC + lPCM + lPPM) / 4,\n';
              str += '        x + ' + ttt.x + ', y + ' + ttt.y + ', z + ' + ttt.z + ', (lPCC + lPPC + lPCP + lPPP) / 4,\n';
              str += '        x + ' + tft.x + ', y + ' + tft.y + ', z + ' + tft.z + ', (lPCC + lPMC + lPCP + lPMP) / 4);\n';
            }
            f = element.faces.west;
            if (f) {
              if (f.cullface) str += '    if (!(culled >> 1 & 1))\n';
              str += '      fn.squade(' + f.uv.x1 + ', ' + f.uv.y1 + ', ' + f.uv.x2 + ', ' + f.uv.y2 + ',\n';
              str += '        x + ' + fft.x + ', y + ' + fft.y + ', z + ' + fft.z + ', (lMCC + lMMC + lMCP + lMMP) / 4,\n';
              str += '        x + ' + ftt.x + ', y + ' + ftt.y + ', z + ' + ftt.z + ', (lMCC + lMPC + lMCP + lMPP) / 4,\n';
              str += '        x + ' + ftf.x + ', y + ' + ftf.y + ', z + ' + ftf.z + ', (lMCC + lMPC + lMCM + lMPM) / 4,\n';
              str += '        x + ' + fff.x + ', y + ' + fff.y + ', z + ' + fff.z + ', (lMCC + lMMC + lMCM + lMMM) / 4);\n';
            }
            f = element.faces.up;
            if (f) {
              if (f.cullface) str += '    if (!(culled >> 2 & 1))\n';
              str += '      fn.squade(' + f.uv.x1 + ', ' + f.uv.y1 + ', ' + f.uv.x2 + ', ' + f.uv.y2 + ',\n';
              str += '        x + ' + ftf.x + ', y + ' + ftf.y + ', z + ' + ftf.z + ', (lCPC + lMPC + lCPM + lMPM) / 4,\n';
              str += '        x + ' + ftt.x + ', y + ' + ftt.y + ', z + ' + ftt.z + ', (lCPC + lMPC + lCPP + lMPP) / 4,\n';
              str += '        x + ' + ttt.x + ', y + ' + ttt.y + ', z + ' + ttt.z + ', (lCPC + lPPC + lCPP + lPPP) / 4,\n';
              str += '        x + ' + ttf.x + ', y + ' + ttf.y + ', z + ' + ttf.z + ', (lCPC + lPPC + lCPM + lPPM) / 4);\n';
            }
            f = element.faces.down;
            if (f) {
              if (f.cullface) str += '    if (!(culled >> 3 & 1))\n';
              str += '      fn.squade(' + f.uv.x1 + ', ' + f.uv.y1 + ', ' + f.uv.x2 + ', ' + f.uv.y2 + ',\n';
              str += '        x + ' + tff.x + ', y + ' + tff.y + ', z + ' + tff.z + ', (lCMC + lPMC + lCMM + lPMM) / 4,\n';
              str += '        x + ' + tft.x + ', y + ' + tft.y + ', z + ' + tft.z + ', (lCMC + lPMC + lCMP + lPMP) / 4,\n';
              str += '        x + ' + fft.x + ', y + ' + fft.y + ', z + ' + fft.z + ', (lCMC + lMMC + lCMP + lMMP) / 4,\n';
              str += '        x + ' + fff.x + ', y + ' + fff.y + ', z + ' + fff.z + ', (lCMC + lMMC + lCMM + lMMM) / 4);\n';
            }
            f = element.faces.north;
            if (f) {
              if (f.cullface) str += '    if (!(culled >> 4 & 1))\n';
              str += '      fn.squade(' + f.uv.x1 + ', ' + f.uv.y1 + ', ' + f.uv.x2 + ', ' + f.uv.y2 + ',\n';
              str += '        x + ' + tft.x + ', y + ' + tft.y + ', z + ' + tft.z + ', (lCCP + lPCP + lCMP + lPMP) / 4,\n';
              str += '        x + ' + ttt.x + ', y + ' + ttt.y + ', z + ' + ttt.z + ', (lCCP + lPCP + lCPP + lPPP) / 4,\n';
              str += '        x + ' + ftt.x + ', y + ' + ftt.y + ', z + ' + ftt.z + ', (lCCP + lMCP + lCPP + lMPP) / 4,\n';
              str += '        x + ' + fft.x + ', y + ' + fft.y + ', z + ' + fft.z + ', (lCCP + lMCP + lCMP + lMMP) / 4);\n';
            }
            f = element.faces.south;
            if (f) {
              if (f.cullface) str += '    if (!(culled >> 5 & 1))\n';
              str += '      fn.squade(' + f.uv.x1 + ', ' + f.uv.y1 + ', ' + f.uv.x2 + ', ' + f.uv.y2 + ',\n';
              str += '        x + ' + fff.x + ', y + ' + fff.y + ', z + ' + fff.z + ', (lCCM + lMCM + lCMM + lMMM) / 4,\n';
              str += '        x + ' + ftf.x + ', y + ' + ftf.y + ', z + ' + ftf.z + ', (lCCM + lMCM + lCPM + lMPM) / 4,\n';
              str += '        x + ' + ttf.x + ', y + ' + ttf.y + ', z + ' + ttf.z + ', (lCCM + lPCM + lCPM + lPPM) / 4,\n';
              str += '        x + ' + tff.x + ', y + ' + tff.y + ', z + ' + tff.z + ', (lCCM + lPCM + lCMM + lPMM) / 4);\n';
            }
          }
        }
        str += '  }\n'
        models[id] = str;
      }
      this.builderConfig.meshingFunctions = this.meshingFunctions = models;
    }
    buildModels() {
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
          var faces = element.faces || element.faceData;
          Object.keys(faces).forEach(function(dir) {
            var face = faces[dir];
            var texture = self.terrainRects['minecraft:' + resolve(textures, face.texture)];
            delete face.texture;
            if (!texture) {
              texture = {x1: 0, y1: 0, x2: 1, y2: 1};
            }
            if (face.uv) {
              face.uv[0] /= 16;
              face.uv[1] /= 16;
              face.uv[2] /= 16;
              face.uv[3] /= 16;
            } else {
              face.uv = [0, 0, 1, 1];
              // TODO: Location dependent UVs
              // switch(dir) {
              // case 'north':
              //   face.uv = [element.from.x, element.from.y, element.to.x, element.to.y];
              //   break;
              // case 'south':
              //   face.uv = [0, 0, 1, 1];
              //   break;
              // case 'east':
              //   face.uv = [0, 0, 1, 1];
              //   break;
              // case 'west':
              //   face.uv = [0, 0, 1, 1];
              //   break;
              // case 'up':
              //   face.uv = [0, 0, 1, 1];
              //   break;
              // case 'down':
              //   face.uv = [0, 0, 1, 1];
              //   break;
              // }
              // console.log(name);
            }
            var w = texture.x2 - texture.x1;
            var h = texture.y2 - texture.y1;
            face.uv = {
              x1: texture.x1 + w * face.uv[2],
              y1: texture.y1 + h * (1 - face.uv[3]),
              x2: texture.x1 + w * face.uv[0],
              y2: texture.y1 + h * (1 - face.uv[1]),
            };
          });
        });
        delete vars.textures;
        models[name] = vars;
      });

      this.models = models;
    }
    buildBlockStates() {
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
        var blockState = blockStates[m[1] + ':' + m[2]] = self.assets[n];
        if (blockState.variants) {
          for (var name of Object.keys(blockState.variants)) {
            if (Array.isArray(blockState.variants[name])) {
              var array = blockState.variants[name];
              for (var variant of array) {
                variant.x = variant.x || 0;
                variant.y = variant.y || 0;
                variant.model = self.models[m[1] + ':block/' + variant.model];
              }
            } else {
              var variant = blockState.variants[name];
              variant.x = variant.x || 0;
              variant.y = variant.y || 0;
              variant.model = self.models[m[1] + ':block/' + variant.model];
            }
          } 
        } else if(blockState.multipart) {
          // TODO: Minecraft 1.10 has multipart tag
        }
      });
      this.blockStates = blockStates;
    }
    buildTerrain() {
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
      this.terrainRects = positions;
    }
    configure(worker) {
      worker.postMessage(['configure', this.builderConfig]);
    }
  };

  MC.Server = class Server extends EventEmitter {
    constructor(host) {
      super();
      this.worker = new Worker('./js/workers/server.js');
      this.worker.onmessage = this._onmessage.bind(this);
      this.worker.postMessage({
        type: 'connect',
        host: host
      });
    }
    _onmessage(e) {
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
    send(type, packet) {
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
    }
    close() {
      this.worker.postMessage({type: 'close'});
    }
  };

  MC.TestServer = class TestServer extends EventEmitter {
    constructor() {
      super();
      setTimeout(() => {
        this.emit(['play', 'position'], {
          x: 0,
          y: 0,
          z: 0,
          yaw: 0,
          pitch: 0
        });
      });
    }
  };
}) (MC);
