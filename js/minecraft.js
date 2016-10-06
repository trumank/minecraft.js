(function(MC) {
  'use strict';

  MC.util = {
    mod: (n1, n2) => {
      return ((n1 % n2) + n2) % n2;
    },
    clone: (object) => {
      return JSON.parse(JSON.stringify(object));
    },
    positionKey: (x, y, z) => {
      return x + '_' + y + '_' + z;
    }
  };

  MC.Minecraft = class Minecraft {
    constructor(container, server) {
      this.server = new MC.Server('ws://' + location.host);
      this.gui = new MC.GUI(this, container);
      this.player = null;
      this.resources = null;
      this.world = null;

      this.resources = this.loadResources(err => {
        if (err) return console.error(err);
        this.gui.signIn((err, session) => {
          this.joinServer(server.host, server.port, session);
        });
        this.gui.offline(err => {
          this.joinServer(server.host, server.port, 'Player');
        });
        this.gui.testWorld(err => {
          this.joinTestWorld();
        });
      });
      this.server.on(['login', 'success'], packet => {
        this.sendSettings();
      });

      var loop = () => {
        requestAnimationFrame(loop);
        this.tick();
      };
      loop();
    }
    loadResources(cb) {
      var resources = new MC.ResourcePack(['/resourcepacks/resourcepack.1.8.8.zip']);
      var l = 0;
      var i = setInterval(() => {
        this.gui.bar.style.width = l;
      }, 1000);
      resources.load(p => {
        l = p * 100 + '%';
      }, err => {
        if (!err) {
          this.gui.loading.style.display = 'none';
        }
        clearInterval(i);
        cb(err);
      });
      return resources;
    }
    joinServer(host, port, session) {
      var loader = new MC.ServerChunkLoader(this.server);
      this.world = loader.world = new MC.World(this, loader, this.gui.worldScene.scene);
      this.player = new MC.Player(this, 'Player', this.gui.worldScene.camera);

      var options = {
        host: host,
        port: port
      };

      if (typeof session === 'string') {
        options.username = session;
      } else {
        options.session = session;
        options.username = session.selectedProfile.name;
      }

      this.server.send('connect', options);
    }
    joinTestWorld() {
      this.server = new MC.TestServer();
      var loader = new MC.TestChunkLoader();
      this.world = loader.world = new MC.World(this, loader, this.gui.worldScene.scene);
      this.player = new MC.Player(this, 'Player', this.gui.worldScene.camera);
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
    sendSettings() {
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
        data: 'vanilla'.split('').map(s => s.charCodeAt(0))
      });
      this.server.send(['play'], 'held_item_slot', {
        slotId: 2
      });
    }
  };

  MC.Player = class Player {
    constructor(mc, name, camera) {
      this.mc = mc;
      this.name = name;
      this.camera = camera;
      this.selected = null;
      this.timestep = 0;
      this.position = camera.position;
      this.velocity = new THREE.Vector3();
      this.walkingSpeed = 0.1;
      this.flyingSpeed = 0.3;
      this.lat = this.lon = 0;
      this.facing = new THREE.Vector3(1, 0, 0);
      this.heldItem = 1;

      this.viewDistance = 2;

      this.spawned = false;
      this.flying = true;

      this.mc.gui.content.addEventListener('keypress', e => {
        switch (e.key) {
        case 'f':
          this.flying = !this.flying;
          break;
        }
      }, false);

      this.mc.gui.content.addEventListener('click', e => {
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
      });

      this.mc.gui.content.addEventListener('mousemove', e => {
        if (this.mc.gui.isPointerLocked) {
          var zoomed = this.mc.gui.keysDown[17];
          var lookSpeed = zoomed ? 0.05 : 0.2;
          var dx = typeof e.movementX === 'number' ? e.movementX : e.mozMovementX;
          var dy = typeof e.movementY === 'number' ? e.movementY : e.mozMovementY;
          this.lon += dx * lookSpeed;
          this.lat -= dy * lookSpeed;
          this.lat = THREE.Math.clamp(this.lat, -89.9, 89.9);
        }
      }, false);

      this.mc.server.on(['play', 'position'], packet => {
        this.spawned = true;
        this.position.x = packet.x;
        this.position.y = packet.y;
        this.position.z = packet.z;
        this.lon = packet.yaw + 90;
        this.lat = -packet.pitch;
      });
    }
    tick() {
      this.updatePosition();
      this.loadChunks();
      this.updateSelection();
    }
    updatePosition() {
      this.timestep = Math.min(10, this.lastFrame ? (Date.now() - this.lastFrame) * 60/1000 : 1);
      this.lastFrame = Date.now();

      var speed = this.flying ? this.flyingSpeed : this.walkingSpeed;
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
          this.velocity.y -= 0.01 * this.timestep;
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
        this.position.add(this.velocity.clone().multiplyScalar(this.timestep));

        if (!this.flying && this.getChunk()) {
          this.correctCollision();
        }

        this.sendUpdate();
      }
    }
    loadChunks() {
      var cx = this.position.x / MC.CHUNK_SIZE - 0.5 | 0;
      var cy = this.position.y / MC.CHUNK_SIZE - 0.5 | 0;
      var cz = this.position.z / MC.CHUNK_SIZE - 0.5 | 0;

      var r = this.viewDistance;
      for (var [key, chunk] of this.mc.world.chunks) {
        if ((chunk.x < cx - r - 1) || (chunk.x > cx + r) || (chunk.y < cy - r - 1) || (chunk.y > cy + r)  || (chunk.z < cz - r - 1) || (chunk.z > cz + r)) {
          this.mc.world.unloadChunk(chunk.x, chunk.y, chunk.z);
        } else {
          chunk.update();
        }
      }
      for (var x = cx - r; x < cx + r; x++) {
        for (var y = cy - r; y < cy + r; y++) {
          for (var z = cz - r; z < cz + r; z++) {
            if (!this.mc.world.getChunk(x, y, z)) {
              this.mc.world.loadChunk(x, y, z);
            }
          }
        }
      }
    }
    correctCollision() {
      this.onGround = false;
      var velocity = this.velocity.clone().multiplyScalar(this.timestep);
      var oldbb = this.getBoundingBox().translate(velocity.clone().negate());
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
        return !(a.max.x <= b.min.x || a.min.x >= b.max.x || a.max.y <= b.min.y || a.min.y >= b.max.y);
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
          if (velocity[axis[0]]) {
            dir = velocity[axis[0]] > 0 ? 'min' : 'max';
            playerFace = {
              pos: oldbb[velocity[axis[0]] < 0 ? 'min' : 'max'][axis[0]],
              box: new THREE.Box2(new THREE.Vector2(oldbb.min[axis[1]], oldbb.min[axis[2]]), new THREE.Vector2(oldbb.max[axis[1]], oldbb.max[axis[2]]))
            };
            var n = velocity[axis[0]] > 0 ? Infinity : -Infinity,
              minT = Infinity;
            for (var i = 0; i < blocks.length; i++) {
              var block = blocks[i],
                face = {
                  pos: block[dir][axis[0]],
                  box: new THREE.Box2(new THREE.Vector2(block.min[axis[1]], block.min[axis[2]]), new THREE.Vector2(block.max[axis[1]], block.max[axis[2]]))
                },
                t = (face.pos - playerFace.pos) / velocity[axis[0]];
              if (t >= 0 && intersects(face.box, playerFace.box.clone().translate(new THREE.Vector2(velocity[axis[1]] * t, velocity[axis[2]] * t)))) {
                n = Math[dir](face.pos, n);
                minT = Math.min(minT, t);
              }
            }
            if (axis[0] === 'y') {
              this.onGround = isFinite(n) && velocity.y < 0;
            }
            if (isFinite(n)) {
              if (min.time > minT) {
                min = {
                  axis: a,
                  time: minT,
                  pos: n + (velocity[axis[0]] < 0 ? axis[3] + 0.00001: axis[4] - 0.00001)
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
          this.velocity[j] = velocity[j] = 0;
          axes.splice(min.axis, 1);
          min.axis = -1;
        }
      }
    }
    getBoundingBox() {
      var p = this.position;
      return new THREE.Box3(new THREE.Vector3(p.x - 0.3, p.y - 1.62, p.z - 0.3), new THREE.Vector3(p.x + 0.3, p.y + 0.3, p.z + 0.3));
    }
    updateSelection() {
      var r = 5;
      var boxes = [];
      var pos = new THREE.Vector3(Math.floor(this.position.x), Math.floor(this.position.y), Math.floor(this.position.z));
      for (var x = -r; x <= r; x++) {
        for (var y = -r; y <= r; y++) {
          for (var z = -r; z <= r; z++) {
            for (var b of this.mc.world.getAABBs(pos.x + x, pos.y + y, pos.z + z)) {
              boxes.push(b);
            }
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
        this.mc.gui.worldScene.selectBox(box);
        this.selectedFace = this.findSelectedFace(box);
        this.selected = pos;
      } else {
        this.mc.gui.worldScene.selectBox(null);
        this.selectedFace = null;
        this.selected = null;
      }
    }
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
    }
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
    }
    getChunk() {
      return this.mc.world.getChunk(this.position.x / MC.CHUNK_SIZE | 0, this.position.y / MC.CHUNK_SIZE | 0, this.position.z / MC.CHUNK_SIZE | 0);
    }
    breakBlock() {
      var p = this.selected;
      if (p) {
        this.mc.world.setBlock(p.x, p.y, p.z, 0);
      }
    }
    pickBlock() {
      var p = this.selected;
      if (p) {
        this.heldItem = this.mc.world.getBlock(p.x, p.y, p.z);
      }
    }
    placeBlock() {
      if (this.selected) {
        var p = this.selected.clone().add(this.selectedFace);
        this.mc.world.setBlock(p.x, p.y, p.z, this.heldItem);
      }
    }
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
    }
  };

  MC.CHUNK_SIZE = 16;

  MC.World = class World {
    constructor(inst, loader, scene) {
      this.mc = inst;
      this.chunks = new Map();
      this.chunkLoader = loader;
      this.scene = scene;
      this.queuedChunks = [];
      this.workers = [];
      for (var i = 0; i < navigator.hardwareConcurrency; i++) {
        var worker = [new Worker('js/workers/chunk.js'), 0];
        this.mc.resources.configure(worker[0]);
        worker[0].onmessage = this._onmessage.bind(this, worker);
        this.workers.push(worker);
      }
    }
    _onmessage(worker, msg) {
      var [type, data] = msg.data;
      var p = data.position;
      var chunk = this.getChunk(p.x, p.y, p.z);
      switch (type) {
        case 'chunk':
          if (chunk) {
            chunk.setFromWorker(data.data);
          }
          break;
        case 'mesh':
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
      this.chunks.delete(MC.util.positionKey(x, y, z));
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
    getChunk(x, y, z) {
      return this.chunks.get(MC.util.positionKey(x, y, z));
    }
    setChunk(x, y, z, chunk) {
      this.chunks.set(MC.util.positionKey(x, y, z), chunk);
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
    setBlock(x, y, z, id) {
      var mx = MC.util.mod(x, MC.CHUNK_SIZE);
      var my = MC.util.mod(y, MC.CHUNK_SIZE);
      var mz = MC.util.mod(z, MC.CHUNK_SIZE);
      var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
      if (chunk) {
        chunk.setBlock(mx, my, mz, id);
      }
    }
    getBlock(x, y, z) {
      var mx = MC.util.mod(x, MC.CHUNK_SIZE);
      var my = MC.util.mod(y, MC.CHUNK_SIZE);
      var mz = MC.util.mod(z, MC.CHUNK_SIZE);
      var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
      return chunk ? chunk.getBlock(mx, my, mz) : 0;
    }
    getModel(x, y, z) {
      return MC.Blocks.getModel(this.mc.resources, this.getBlock(x, y, z), 0);
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
      return model[0].model.elements.map(element => {
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
    }
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
      this.chunks = new Map();
      this.server = server;
      this.server.on(['play', 'block_change'], packet => {
        this.world.setBlock(packet.location.x, packet.location.y, packet.location.z, packet.type);
      });
      this.server.on(['play', 'multi_block_change'], packet => {
        for (var record of packet.records) {
          this.world.setBlock(packet.chunkX * MC.CHUNK_SIZE + (record.horizontalPos >> 4 & 0xf), record.y, packet.chunkZ * MC.CHUNK_SIZE + (record.horizontalPos & 0xf), record.blockId);
        }
      });
      this.server.on(['play', 'map_chunk'], packet => {
        var stream = new Streams.ReadStream(packet.chunkData.buffer.buffer);
        var l = MC.CHUNK_SIZE*MC.CHUNK_SIZE*MC.CHUNK_SIZE;
        var chunks = {};
        var y;
        for (y = 0; y < this.COLUMN_HEIGHT; y++) {
          if (packet.bitMap & (1 << y)) {
            chunks[y] = {};
          }
        }
        for (y = 0; y < this.COLUMN_HEIGHT; y++) {
          if (packet.bitMap & (1 << y)) {
            chunks[y].blocks = new Uint16Array(stream.arrayBuffer(l * 2));
          }
        }
        for (y = 0; y < this.COLUMN_HEIGHT; y++) {
          if (packet.bitMap & (1 << y)) {
            chunks[y].blockLight = new Uint8Array(stream.arrayBuffer(l / 2));
          }
        }
        for (y = 0; y < this.COLUMN_HEIGHT; y++) {
          if (packet.bitMap & (1 << y)) {
            chunks[y].skyLight = new Uint8Array(stream.arrayBuffer(l / 2));
          }
        }
        for (y = 0; y < this.COLUMN_HEIGHT; y++) {
          if (packet.bitMap & (1 << y)) {
            this.chunks.set(MC.util.positionKey(packet.x, y, packet.z), chunks[y]);
          }
        }
      });
      this.server.on(['play', 'map_chunk_bulk'], packet => {
        var stream = new Streams.ReadStream(packet.data.buffer.buffer);
        var l = MC.CHUNK_SIZE*MC.CHUNK_SIZE*MC.CHUNK_SIZE;
        for (var d of packet.meta) {
          var chunks = {};
          var y;
          for (y = 0; y < this.COLUMN_HEIGHT; y++) {
            if (d.bitMap & (1 << y)) {
              chunks[y] = {};
            }
          }
          for (y = 0; y < this.COLUMN_HEIGHT; y++) {
            if (d.bitMap & (1 << y)) {
              chunks[y].blocks = new Uint16Array(stream.arrayBuffer(l * 2));
            }
          }
          for (y = 0; y < this.COLUMN_HEIGHT; y++) {
            if (d.bitMap & (1 << y)) {
              chunks[y].blockLight = new Uint8Array(stream.arrayBuffer(l / 2));
            }
          }
          for (y = 0; y < this.COLUMN_HEIGHT; y++) {
            if (d.bitMap & (1 << y)) {
              chunks[y].skyLight = new Uint8Array(stream.arrayBuffer(l / 2));
            }
          }
          for (y = 0; y < this.COLUMN_HEIGHT; y++) {
            if (d.bitMap & (1 << y)) {
              this.chunks.set(MC.util.positionKey(d.x, y, d.z), chunks[y]);
            }
          }
          stream.arrayBuffer(MC.CHUNK_SIZE * MC.CHUNK_SIZE); // ignore biomes
        }
      });
    }
    load(x, y, z) {
      return this.chunks.get(MC.util.positionKey(x, y, z));
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

  MC.GUI = class GUI {
    constructor(mc, container) {
      this.mc = mc;
      this.content = null;
      this.canvas = null;
      this.chat = null;
      this.overlay = null;
      this.loading = null;
      this.bar = null;
      this.auth = null;
      this.username = null;
      this.password = null;
      this.buttonSignIn = null;
      this.buttonOffline = null;
      this.buttonTest = null;

      this.renderer = null;

      this.worldScene = new MC.WorldScene();

      this.keysDown = [];
      for (var i = 0; i < 255; i++) {
        this.keysDown[i] = false;
      }

      this.buildDom();
      this.configurePointerLock();
      this.buildRenderer();
      container.appendChild(this.content);

      this.update();

      this.mc.server.on(['play', 'chat'], packet => { // TODO: Complete chat messages
        var obj = JSON.parse(packet.message);
        this.showMessage(obj);
      });
    }
    configurePointerLock() {
      this.isPointerLocked = false;
      var pointerLockChange = () => {
        this.isPointerLocked = this.content === (document.pointerLockElement || document.mozPointerLockElement);
      };
      document.addEventListener('pointerlockchange', pointerLockChange);
      document.addEventListener('mozpointerlockchange', pointerLockChange);

      var pointerLockError = () => {
        this.isPointerLocked = false;
      };
      document.addEventListener('pointerlockerror', pointerLockError);
      document.addEventListener('mozpointerlockerror', pointerLockError);

      this.content.requestPointerLock = this.content.requestPointerLock || this.content.mozRequestPointerLock;
      this.canvas.addEventListener('click', e => { // TODO: tweak when pointer lock activates
        this.content.requestPointerLock();
      });
    }
    buildRenderer() {
      this.renderer = new THREE.WebGLRenderer({canvas: this.canvas});
      this.renderer.setClearColor(0x101010); // sky: :0xbfd1e5
    }
    tick() {

    }
    render() {
      this.worldScene.render(this.renderer);
    }
    update() {
      this.canvas.width = this.content.clientWidth;
      this.canvas.height = this.content.clientHeight;
      this.renderer.setSize(this.content.clientWidth, this.content.clientHeight);
      this.worldScene.updateSize(this.content.clientWidth, this.content.clientHeight);
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

      this.content.addEventListener('keydown', e => {
        this.keysDown[e.keyCode] = true;
      }, false);

      this.content.addEventListener('keyup', e => {
        this.keysDown[e.keyCode] = false;
      }, false);

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
      var signedIn = (err, session) => {
        if (err) {
          return console.log(err);
        }
        this.buttonSignIn.removeEventListener('click', click);
        this.overlay.style.display = 'none';
        localStorage.session = JSON.stringify(session);
        cb(null, session);
      };
      this.mc.server.once('session', data => {
        session(data.err, data.session);
      });
      var session;
      if (localStorage.session && (session = JSON.parse(localStorage.session))) {
        signedIn(null, session);
      } else {
        this.auth.style.display = 'block';
        this.username.focus();
        var click = () => {
          var cred = {
            username: this.username.value,
            password: this.password.value
          };
          this.mc.server.send('authenticate', cred);
        };
        this.buttonSignIn.addEventListener('click', click);
      }
    }
    offline(cb) {
      this.buttonOffline.addEventListener('click', () => {
        this.overlay.style.display = 'none';
        cb(null);
      });
    }
    testWorld(cb) {
      this.buttonTest.addEventListener('click', () => {
        this.overlay.style.display = 'none';
        cb(null);
      });
    }
    showMessage(message) {
      this.chat.innerText += this.buildMessage(message) + '\n';
    }
    buildMessage(object) {
      var msg = '';
      if (typeof object === 'string') {
        return object;
      }
      else if (typeof object.text === 'string') {
        msg += object.text;
      } else if (typeof object.translate === 'string') {
        msg += this.mc.resources.language.get(object.translate)(object.with.map(obj => this.buildMessage(obj)));
      } else {
        // TODO: score and selector cases
      }
      if (object.extra) {
        for (var extra of object.extra) {
          msg += this.buildMessage(extra);
        }
      }
      return msg;
    }
  };

  MC.Scene = class Scene {
    constructor() {
      this.scene = new THREE.Scene();
      this.camera = null;
    }
    updateSize(width, height) {
      if (this.camera instanceof THREE.OrthographicCamera) {
        if (width < height) {
          this.camera.left = -1;
          this.camera.right = 1;
          this.camera.bottom = -height / width;
          this.camera.top = height / width;
        } else {
          this.camera.left = width / height;
          this.camera.right = -width / height;
          this.camera.bottom = -1;
          this.camera.top = 1;
        }
      } else if (this.camera instanceof THREE.PerspectiveCamera) {
        this.camera.aspect = width / height;
      }
      this.camera.updateProjectionMatrix();
    }
    render(renderer) {
      renderer.render(this.scene, this.camera);
    }
  };

  MC.WorldScene = class WorldScene extends MC.Scene {
    constructor() {
      super();

      this.scene.add(new THREE.AmbientLight(0xffd880));

      this.camera = new THREE.PerspectiveCamera(120, 1, 0.001, 20000);

      this.selector = new THREE.BoxHelper();
      this.selector.material.color.set(0x00ee00);
      this.selector.material.linewidth = 2;
      this.scene.add(this.selector);
    }
    selectBox(box) {
      this.selector.visible = !!box;
      if (box) this.selector.update(box.expandByScalar(0.01));
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
      this.assets = new Map();
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
      this.loadAssets(progress, err => {
        if (err) return cb(err);
        this.loaded();
        cb();
      });
    }
    loadAssets(progress, cb) {
      async.eachSeries(this.paths, (path, cb) => {
        zip.createReader(new zip.HttpReader(path), reader => {
          reader.getEntries(entries => {
            var assets = entries.filter(entry => {
              return /\.(png|json|lang)$/.test(entry.filename);
            });
            var i = 0;
            async.eachLimit(assets, 10, (entry, cb) => {
              var name = entry.filename;
              if (/\.png$/.test(entry.filename)) {
                entry.getData(new zip.BlobWriter('image/png'), blob => {
                  var img = new Image();
                  this.assets.set(name, img);
                  img.onload = () => {
                    progress(++i / assets.length);
                    cb();
                  };
                  img.src = URL.createObjectURL(blob);
                });
              } else if (/\.json$/.test(entry.filename)) {
                entry.getData(new zip.TextWriter(), json => {
                  this.assets.set(name, JSON.parse(json));
                  progress(++i / assets.length);
                  cb();
                });
              } else if (/\.lang$/.test(entry.filename)) {
                entry.getData(new zip.TextWriter(), text => {
                  var translations = new Map();
                  this.assets.set(name, translations);
                  for (var l of (text.match(/[^\n\r]+/g) || [])) {
                    var m = l.match(/^([^=]+)=(.*)$/);
                    if (!m) return;
                    var j = 0;
                    translations.set(m[1], new Function('a', 'return "' + JSON.stringify(m[2]).slice(1, -1).replace(/%(.)/g, (m, b) => {
                      if (b === '%') return '%';
                      return '" + a[' + j++ + '] + "';
                    }) + '"'));
                  }
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
      this.language = this.assets.get('assets/minecraft/lang/en_US.lang'); // TODO: Configure
      this.buildMeshingFunctions();
    }
    buildMeshingFunctions() {
      var models = [];
      for (var id = 0; id < 0xfff; id++) {
        var variants = MC.Blocks.getModel(this, id);
        if (!variants) continue;

        var str = '';

        str += '  var lPPP = fn.getBlockLight(x + 1, y + 1, z + 1);\n';
        str += '  var lPPC = fn.getBlockLight(x + 1, y + 1, z    );\n';
        str += '  var lPPM = fn.getBlockLight(x + 1, y + 1, z - 1);\n';
        str += '  var lPCP = fn.getBlockLight(x + 1, y    , z + 1);\n';
        str += '  var lPCC = fn.getBlockLight(x + 1, y    , z    );\n';
        str += '  var lPCM = fn.getBlockLight(x + 1, y    , z - 1);\n';
        str += '  var lPMP = fn.getBlockLight(x + 1, y - 1, z + 1);\n';
        str += '  var lPMC = fn.getBlockLight(x + 1, y - 1, z    );\n';
        str += '  var lPMM = fn.getBlockLight(x + 1, y - 1, z - 1);\n';
        str += '  var lCPP = fn.getBlockLight(x    , y + 1, z + 1);\n';
        str += '  var lCPC = fn.getBlockLight(x    , y + 1, z    );\n';
        str += '  var lCPM = fn.getBlockLight(x    , y + 1, z - 1);\n';
        str += '  var lCCP = fn.getBlockLight(x    , y    , z + 1);\n';
        str += '  var lCCM = fn.getBlockLight(x    , y    , z - 1);\n';
        str += '  var lCMP = fn.getBlockLight(x    , y - 1, z + 1);\n';
        str += '  var lCMC = fn.getBlockLight(x    , y - 1, z    );\n';
        str += '  var lCMM = fn.getBlockLight(x    , y - 1, z - 1);\n';
        str += '  var lMPP = fn.getBlockLight(x - 1, y + 1, z + 1);\n';
        str += '  var lMPC = fn.getBlockLight(x - 1, y + 1, z    );\n';
        str += '  var lMPM = fn.getBlockLight(x - 1, y + 1, z - 1);\n';
        str += '  var lMCP = fn.getBlockLight(x - 1, y    , z + 1);\n';
        str += '  var lMCC = fn.getBlockLight(x - 1, y    , z    );\n';
        str += '  var lMCM = fn.getBlockLight(x - 1, y    , z - 1);\n';
        str += '  var lMMP = fn.getBlockLight(x - 1, y - 1, z + 1);\n';
        str += '  var lMMC = fn.getBlockLight(x - 1, y - 1, z    );\n';
        str += '  var lMMM = fn.getBlockLight(x - 1, y - 1, z - 1);\n';

        str += '\n';

        var totalWeight = 0;
        for (var variant of variants) {
          totalWeight += variant.weight || 1;
        }

        str += '  var n = Math.random() * ' + totalWeight + ';\n\n';

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

          for (let element of variant.model.elements) {
            var ttt = new THREE.Vector3(element.to.x,   element.to.y,   element.to.z  ).applyMatrix4(rotation);
            var ttf = new THREE.Vector3(element.to.x,   element.to.y,   element.from.z).applyMatrix4(rotation);
            var tft = new THREE.Vector3(element.to.x,   element.from.y, element.to.z  ).applyMatrix4(rotation);
            var tff = new THREE.Vector3(element.to.x,   element.from.y, element.from.z).applyMatrix4(rotation);
            var ftt = new THREE.Vector3(element.from.x, element.to.y,   element.to.z  ).applyMatrix4(rotation);
            var fft = new THREE.Vector3(element.from.x, element.from.y, element.to.z  ).applyMatrix4(rotation);
            var ftf = new THREE.Vector3(element.from.x, element.to.y,   element.from.z).applyMatrix4(rotation);
            var fff = new THREE.Vector3(element.from.x, element.from.y, element.from.z).applyMatrix4(rotation);

            var f, r, g, b;
            var c = 0x85c14a;
            var biome = [(c >> 16 & 0xff) / 0xff, (c >> 8 & 0xff) / 0xff, (c & 0xff) / 0xff];
            var constant = [1, 1, 1];
            f = element.faces.east;
            if (f) {
              if (f.cullface) str += '    if (!(culled >> 0 & 1))\n';
              str += '      fn.squade(' + f.uv.x1 + ', ' + f.uv.y1 + ', ' + f.uv.x2 + ', ' + f.uv.y2 + ',\n';
              [r, g, b] = f.biomeColor ? biome : constant;
              str += '        ' + r + ', ' + g + ', ' + b + ',\n';
              str += '        x + ' + tff.x + ', y + ' + tff.y + ', z + ' + tff.z + ', (lPCC + lPMC + lPCM + lPMM) / 4,\n';
              str += '        x + ' + ttf.x + ', y + ' + ttf.y + ', z + ' + ttf.z + ', (lPCC + lPPC + lPCM + lPPM) / 4,\n';
              str += '        x + ' + ttt.x + ', y + ' + ttt.y + ', z + ' + ttt.z + ', (lPCC + lPPC + lPCP + lPPP) / 4,\n';
              str += '        x + ' + tft.x + ', y + ' + tft.y + ', z + ' + tft.z + ', (lPCC + lPMC + lPCP + lPMP) / 4);\n';
            }
            f = element.faces.west;
            if (f) {
              if (f.cullface) str += '    if (!(culled >> 1 & 1))\n';
              str += '      fn.squade(' + f.uv.x1 + ', ' + f.uv.y1 + ', ' + f.uv.x2 + ', ' + f.uv.y2 + ',\n';
              [r, g, b] = f.biomeColor ? biome : constant;
              str += '        ' + r + ', ' + g + ', ' + b + ',\n';
              str += '        x + ' + fft.x + ', y + ' + fft.y + ', z + ' + fft.z + ', (lMCC + lMMC + lMCP + lMMP) / 4,\n';
              str += '        x + ' + ftt.x + ', y + ' + ftt.y + ', z + ' + ftt.z + ', (lMCC + lMPC + lMCP + lMPP) / 4,\n';
              str += '        x + ' + ftf.x + ', y + ' + ftf.y + ', z + ' + ftf.z + ', (lMCC + lMPC + lMCM + lMPM) / 4,\n';
              str += '        x + ' + fff.x + ', y + ' + fff.y + ', z + ' + fff.z + ', (lMCC + lMMC + lMCM + lMMM) / 4);\n';
            }
            f = element.faces.up;
            if (f) {
              if (f.cullface) str += '    if (!(culled >> 2 & 1))\n';
              str += '      fn.squade(' + f.uv.x1 + ', ' + f.uv.y1 + ', ' + f.uv.x2 + ', ' + f.uv.y2 + ',\n';
              [r, g, b] = f.biomeColor ? biome : constant;
              str += '        ' + r + ', ' + g + ', ' + b + ',\n';
              str += '        x + ' + ftf.x + ', y + ' + ftf.y + ', z + ' + ftf.z + ', (lCPC + lMPC + lCPM + lMPM) / 4,\n';
              str += '        x + ' + ftt.x + ', y + ' + ftt.y + ', z + ' + ftt.z + ', (lCPC + lMPC + lCPP + lMPP) / 4,\n';
              str += '        x + ' + ttt.x + ', y + ' + ttt.y + ', z + ' + ttt.z + ', (lCPC + lPPC + lCPP + lPPP) / 4,\n';
              str += '        x + ' + ttf.x + ', y + ' + ttf.y + ', z + ' + ttf.z + ', (lCPC + lPPC + lCPM + lPPM) / 4);\n';
            }
            f = element.faces.down;
            if (f) {
              if (f.cullface) str += '    if (!(culled >> 3 & 1))\n';
              str += '      fn.squade(' + f.uv.x1 + ', ' + f.uv.y1 + ', ' + f.uv.x2 + ', ' + f.uv.y2 + ',\n';
              [r, g, b] = f.biomeColor ? biome : constant;
              str += '        ' + r + ', ' + g + ', ' + b + ',\n';
              str += '        x + ' + tff.x + ', y + ' + tff.y + ', z + ' + tff.z + ', (lCMC + lPMC + lCMM + lPMM) / 4,\n';
              str += '        x + ' + tft.x + ', y + ' + tft.y + ', z + ' + tft.z + ', (lCMC + lPMC + lCMP + lPMP) / 4,\n';
              str += '        x + ' + fft.x + ', y + ' + fft.y + ', z + ' + fft.z + ', (lCMC + lMMC + lCMP + lMMP) / 4,\n';
              str += '        x + ' + fff.x + ', y + ' + fff.y + ', z + ' + fff.z + ', (lCMC + lMMC + lCMM + lMMM) / 4);\n';
            }
            f = element.faces.north;
            if (f) {
              if (f.cullface) str += '    if (!(culled >> 4 & 1))\n';
              str += '      fn.squade(' + f.uv.x1 + ', ' + f.uv.y1 + ', ' + f.uv.x2 + ', ' + f.uv.y2 + ',\n';
              [r, g, b] = f.biomeColor ? biome : constant;
              str += '        ' + r + ', ' + g + ', ' + b + ',\n';
              str += '        x + ' + tft.x + ', y + ' + tft.y + ', z + ' + tft.z + ', (lCCP + lPCP + lCMP + lPMP) / 4,\n';
              str += '        x + ' + ttt.x + ', y + ' + ttt.y + ', z + ' + ttt.z + ', (lCCP + lPCP + lCPP + lPPP) / 4,\n';
              str += '        x + ' + ftt.x + ', y + ' + ftt.y + ', z + ' + ftt.z + ', (lCCP + lMCP + lCPP + lMPP) / 4,\n';
              str += '        x + ' + fft.x + ', y + ' + fft.y + ', z + ' + fft.z + ', (lCCP + lMCP + lCMP + lMMP) / 4);\n';
            }
            f = element.faces.south;
            if (f) {
              if (f.cullface) str += '    if (!(culled >> 5 & 1))\n';
              str += '      fn.squade(' + f.uv.x1 + ', ' + f.uv.y1 + ', ' + f.uv.x2 + ', ' + f.uv.y2 + ',\n';
              [r, g, b] = f.biomeColor ? biome : constant;
              str += '        ' + r + ', ' + g + ', ' + b + ',\n';
              str += '        x + ' + fff.x + ', y + ' + fff.y + ', z + ' + fff.z + ', (lCCM + lMCM + lCMM + lMMM) / 4,\n';
              str += '        x + ' + ftf.x + ', y + ' + ftf.y + ', z + ' + ftf.z + ', (lCCM + lMCM + lCPM + lMPM) / 4,\n';
              str += '        x + ' + ttf.x + ', y + ' + ttf.y + ', z + ' + ttf.z + ', (lCCM + lPCM + lCPM + lPPM) / 4,\n';
              str += '        x + ' + tff.x + ', y + ' + tff.y + ', z + ' + tff.z + ', (lCCM + lPCM + lCMM + lPMM) / 4);\n';
            }
          }
        }
        str += '  }\n';
        models[id] = str;
      }
      this.builderConfig.meshingFunctions = this.meshingFunctions = models;
    }
    buildModels() {
      var models = {};
      var regex = /^assets\/([^\/]*)\/models\/(block\/.*)\.json$/;
      for (var [n, asset] of this.assets) {
        if (regex.test(n)) {
          var m = n.match(regex);
          if (!models[m[1]]) {
            models[m[1]] = {};
          }
          models[m[1] + ':' + m[2]] = asset;
        }
      }

      for (var name of Object.keys(models)) {
        var model = models[name];
        if (model.parent) {
          var parent = model.parent;
          if (!~parent.indexOf(':')) parent = 'minecraft:' + parent;
          model.parent = models[parent];
        }
      }

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
          for (var key of Object.keys(model.textures)) {
            parent.textures[key] = JSON.parse(JSON.stringify(model.textures[key]));
          }
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

      for (var name of Object.keys(models)) {
        var model = models[name];
        var vars = collect(model);
        var textures = vars.textures;
        var elements = vars.elements;
        for (var element of elements) {
          var fr = element.from;
          element.from = {x: fr[0] / 16, y: fr[1] / 16, z: fr[2] / 16};
          var to = element.to;
          element.to = {x: to[0] / 16, y: to[1] / 16, z: to[2] / 16};
          var faces = element.faces || element.faceData;
          for (var dir of Object.keys(faces)) {
            var face = faces[dir];
            var texture = this.terrainRects['minecraft:' + resolve(textures, face.texture)];
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
            face.biomeColor = texture.biomeColor;
          }
        }
        delete vars.textures;
        models[name] = vars;
      }

      this.models = models;
    }
    buildBlockStates() {
      this.blockStates = {};
      var regex = /^assets\/([^\/]*)\/blockstates\/(.*)\.json$/;
      for (var [key, asset] of this.assets) {
        if (regex.test(key)) {
          var m = key.match(regex);
          if (!this.blockStates[m[1]]) {
            this.blockStates[m[1]] = {};
          }
          var blockState = this.blockStates[m[1] + ':' + m[2]] = asset;
          if (blockState.variants) {
            for (var name of Object.keys(blockState.variants)) {
              if (Array.isArray(blockState.variants[name])) {
                var array = blockState.variants[name];
                for (var variant of array) {
                  variant.x = variant.x || 0;
                  variant.y = variant.y || 0;
                  variant.model = this.models[m[1] + ':block/' + variant.model];
                }
              } else {
                var variant = blockState.variants[name];
                variant.x = variant.x || 0;
                variant.y = variant.y || 0;
                variant.model = this.models[m[1] + ':block/' + variant.model];
              }
            } 
          } else if(blockState.multipart) {
            // TODO: Minecraft 1.10 has multipart tag
          }
        }
      }
    }
    buildTerrain() {
      var regex = /^assets\/([^\/]*)\/textures\/(blocks\/.*)\.png$/;
      var maxWidth = 0;
      var maxHeight = 0;
      var blocks = [];
      for (var [key, asset] of this.assets) {
        if (regex.test(key)) {
          var m = key.match(regex);
          var name = m[1] + ':' + m[2];
          maxWidth = Math.max(asset.width, maxWidth);
          maxHeight = Math.max(asset.height, maxHeight);
          blocks.push({
            name: name,
            asset: asset,
            biomeColor: this.isBiomeSpecificColor(name)
          });
        }
      }
      blocks.sort((a, b) => {
        return b.asset.height - a.asset.height;
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
      for (var block of blocks) {
        var node = insert(root, block);
        if (!node) {
          throw new Error('Could not fit texture.');
        }
        node.block = block;
      }

      var positions = {};
      function find(node) {
        if (node) {
          if (node.block) {
            positions[node.block.name] = {
              biomeColor: node.block.biomeColor,
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
    isBiomeSpecificColor(name) {
      return this.BIOME_COLOR_TEXTURES.has(name);
    }
    configure(worker) {
      worker.postMessage(['configure', this.builderConfig]);
    }
  };
  MC.ResourcePack.prototype.BIOME_COLOR_TEXTURES = new Set([
    'minecraft:blocks/double_plant_grass_bottom',
    'minecraft:blocks/grass_side_overlay',
    'minecraft:blocks/grass_top',
    'minecraft:blocks/double_plant_grass_top',
    'minecraft:blocks/tallgrass',
    'minecraft:blocks/leaves_acacia',
    'minecraft:blocks/leaves_jungle',
    'minecraft:blocks/leaves_oak',
    'minecraft:blocks/leaves_big_oak',
    'minecraft:blocks/leaves_birch',
    'minecraft:blocks/leaves_spruce',
    'minecraft:block/waterlily'
  ]);

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
      // console.log(e.data.type);
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
