(function (mc) {
    var extend = function (base, ex) {
        for (var key in ex) {
            if (ex.hasOwnProperty(key)) {
                base[key] = ex[key];
            }
        }
    };

    var mod = function (n1, n2) {
        return ((n1 % n2) + n2) % n2;
    };

    mc.Minecraft = function (container, server) {
        this.container = container;
        var self = this;
        this.buildDom();
        this.loadResources(function (err) {
            if (!err) {
                self.signIn(function (err, session) {
                    self.buildUI();
                    self.joinServer(server.host, server.port);
                    console.log(session);
                });
            }
        });
        this.server = io.connect('/');
        this.server.on(['login', 0x03], function (data) {
            this.sendSettings();
        }.bind(this));
        this.server.on(['play', 0x02], function (data) {
            document.querySelector('.chat').innerText += data.message + '\n';
        });
    };
    extend(mc.Minecraft.prototype, {
        buildDom: function () {
            //this.container.querySelector('.overlay .auth').style.display = 'none';
        },
        loadResources: function (cb) {
            this.resources = new mc.ResourcePack('/resourcepack.zip');
            var loading = this.container.querySelector('.overlay .loading');
            var bar = this.container.querySelector('.overlay .loading .bar');
            var l = 0;
            var i = setInterval(function () {
                bar.style.width = l;
            }, 1000);
            this.resources.load(function (p) {
                l = p * 100 + '%';
            }, function (err) {
                if (!err) {
                    loading.style.display = 'none';
                }
                clearInterval(i);
                cb(err);
            });
        },
        signIn: function (cb) {
            var overlay = this.container.querySelector('.overlay');
            var auth = this.container.querySelector('.overlay .auth');
            var button = this.container.querySelector('.overlay .auth button');
            var username = this.container.querySelector('.overlay .auth .username');
            var password = this.container.querySelector('.overlay .auth .password');
            auth.style.display = 'block';
            username.focus();
            var self = this;
            function click() {
                self.server.emit('auth', {
                    username: username.value,
                    password: password.value
                });
            }
            this.server.once('auth', function (data) {
                button.removeEventListener('click', click);
                overlay.style.display = 'none';
                cb(null, data);
                console.log(arguments);
            });
            button.addEventListener('click', click);
        },
        joinServer: function (host, port) {
            this.server.emit('connect', {
                host: host,
                port: port,
                username: 'Bot'
            });
        },
        buildUI: function () {
            this.element = this.container.getElementsByClassName('content')[0];

            this.canvas = this.element.getElementsByTagName('canvas')[0];
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas
            });
            this.renderer.setClearColor(0x101010); // sky: :0xbfd1e5

            var keysDown = this.keysDown = [];
            var mouseMovement = this.mouseMovement = new THREE.Vector2(0, 0);

            for (var i = 0; i < 255; i++) {
                this.keysDown[i] = false;
            }

            var self = this;

            this.element.addEventListener('click', function (e) {
                self.element.webkitRequestPointerLock();
            });
            this.element.addEventListener('keydown', function (e) {
                keysDown[e.keyCode] = true;
            }, false);

            this.element.addEventListener('keyup', function (e) {
                keysDown[e.keyCode] = false;
            }, false);

            this.element.addEventListener('mousemove', function (e) {
                mouseMovement.x = e.webkitMovementX;
                mouseMovement.y = e.webkitMovementY;
            }, false);

            this.scene = new THREE.Scene();

            this.scene.add(new THREE.AmbientLight(0xffd880));

            var loader = new mc.ServerChunkLoader(this.server);
            this.world = loader.world = new mc.World(this, loader);

            this.camera = new THREE.PerspectiveCamera(120, 1, 0.001, 20000);
            this.selector = cube = new THREE.Mesh(new THREE.CubeGeometry(1, 1, 1), new THREE.MeshBasicMaterial({
                color: 0x00ee00,
                wireframe: true,
                wireframeLinewidth: 2,
                transparent: true
            }));
            this.scene.add(this.selector);
            this.player = new mc.Player(this.world, 'Player', this.camera, this.selector);


            var update = function () {
                this.canvas.width = this.container.clientWidth;
                this.canvas.height = this.container.clientHeight;
                this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
                this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
                this.camera.updateProjectionMatrix();
            }.bind(this);
            update();
            window.addEventListener('resize', update);
            this.container.appendChild(this.element);
            this.stats = new Stats();
            this.stats.domElement.style.position = 'absolute';
            this.stats.domElement.style.top = '0px';
            this.container.appendChild(this.stats.domElement);
            this.render();
        },
        render: function () {
            var render;
            render = (function () {
                webkitRequestAnimationFrame(render);
                this.stats.begin();
                this.player.tick();
                this.tick();
                this.renderer.render(this.scene, this.player.camera);
                this.stats.end();
            }).bind(this);
            render();
        },
        tick: function () {
            this.mouseMovement.x = 0;
            this.mouseMovement.y = 0;
            this.world.tick();
        },
        sendSettings: function () {
            this.server.emit(0x15, {
                id: '0x15',
                locale: 'en_US',
                viewDistance: 6,
                chatFlags: 0,
                chatColors: true,
                difficulty: 3,
                showCape: true 
            });
            this.server.emit(0x17, {
                channel: 'MC|Brand',
                data: 'vanilla'.split('').map(function(s){return s.charCodeAt(0)})
            });
            this.server.emit(0x09, {
                slotId: 2
            });
        }
    });

    mc.Player = function (world, name, camera, selector) {
        this.world = world;
        this.name = name;
        this.camera = camera;
        this.selector = selector;
        this.selected = null;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.position = camera.position;
        this.speed = 0.1;
        this.lat = this.lon = 0;
        this.facing = new THREE.Vector3(1, 0, 0);
        this.heldItem = 1;

        this.spawned = false;
        this.flying = true;

        this.world.mc.element.addEventListener('keypress', function (e) {
            switch (String.fromCharCode(e.keyCode)) {
            case 'b':
                this.world.setBlock(this.position.x | 0, (this.position.y | 0) - 2, this.position.z | 0, 0);
                break;
            case 'p':
                this.world.setBlock(this.position.x | 0, (this.position.y | 0) - 2, this.position.z | 0, 1);
                break;
            case 'f':
                this.flying = !this.flying;
                break;
            }
        }.bind(this));

        this.world.mc.element.addEventListener('click', function (e) {
            if (e.button === 0) {
                this.breakBlock();
            } else if (e.button === 1) {
                this.pickBlock();
            } else if (e.button === 2) {
                this.placeBlock();
            }
        }.bind(this));

        this.world.mc.server.on(['play', 0x08], function (data) {
            this.spawned = true;
            this.position.x = data.x;
            this.position.y = data.y;
            this.position.z = data.z;
            this.lon = data.yaw + 90;
            this.lat = -data.pitch;
        }.bind(this));
    };
    extend(mc.Player.prototype, {
        tick: function () {
            if (!this.spawned) {
                return;
            }
            var lookSpeed = 0.5;

            this.lon += this.world.mc.mouseMovement.x * lookSpeed;
            this.lat -= this.world.mc.mouseMovement.y * lookSpeed;
            this.lat = THREE.Math.clamp(this.lat, -89.9, 89.9);

            var phi = (90 - this.lat) * Math.PI / 180;
            var theta = this.lon * Math.PI / 180;
            this.facing = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
            this.camera.lookAt(this.position.clone().add(this.facing));
            var oldFov = this.camera.fov;
            this.camera.fov = this.world.mc.keysDown[17] ? 30 : 120; // zoom
            if (oldFov !== this.camera.fov) {
                this.camera.updateProjectionMatrix();
            }

            if (this.flying) {
                this.velocity.set(0, 0, 0);
                if (this.world.mc.keysDown[32]) { // up
                    this.velocity.y = this.speed;
                }
                if (this.world.mc.keysDown[16]) { // down
                    this.velocity.y = -this.speed;
                }
            } else {
                this.velocity.x = 0;
                this.velocity.y -= 0.01;
                this.velocity.z = 0;
                if (this.world.mc.keysDown[32] && this.onGround) { // jump
                    this.velocity.y = Math.sqrt(0.02);
                }
            }

            var horizontal = new THREE.Vector3();
            var c = Math.cos(theta);
            var s = Math.sin(theta);
            if (this.world.mc.keysDown[65]) { // left
                horizontal.x += s;
                horizontal.z -= c;
            }
            if (this.world.mc.keysDown[68]) { // right
                horizontal.x -= s;
                horizontal.z += c;
            }
            if (this.world.mc.keysDown[87]) { // forward
                horizontal.x += c;
                horizontal.z += s;
            }
            if (this.world.mc.keysDown[83]) { // backward
                horizontal.x -= c;
                horizontal.z -= s;
            }
            this.velocity.add(horizontal.normalize().multiplyScalar(this.speed));

            this.position.add(this.velocity);

            if (!this.flying) {
                this.correctCollision();
            }

            this.sendUpdate();

            var chunks = this.world.chunks;
            var cx = this.position.x >> 4;
            var cy = this.position.y >> 4;
            var cz = this.position.z >> 4;

            var self = this;
            Object.keys(chunks).forEach(function (c) {
                var chunk = chunks[c];
                if ((chunk.x < cx - 4) || (chunk.x > cx + 4) || (chunk.y < cy - 4) || (chunk.y > cy + 4)  || (chunk.z < cz - 4) || (chunk.z > cz + 4)) {
                    self.world.unloadChunk(chunk.x, chunk.y, chunk.z);
                }
            });
            for (var x = cx - 3; x < cx + 3; x++) {
                for (var y = cy - 3; y < cy + 3; y++) {
                    for (var z = cz - 3; z < cz + 3; z++) {
                        if (!this.world.getChunk(x, y, z)) {
                            this.world.loadChunk(x, y, z);
                        }
                    }
                }
            }

            this.updateSelection();
        },
        correctCollision: function () {
            this.onGround = false;
            var oldbb = this.getBoundingBox().translate(this.velocity.clone().negate());
            var newbb = this.getBoundingBox(),
                bb = oldbb.clone().union(newbb),
                blocks = [];
            for (var x = Math.floor(bb.min.x); x < bb.max.x; x++) {
                for (var y = Math.floor(bb.min.y); y < bb.max.y; y++) {
                    for (var z = Math.floor(bb.min.z); z < bb.max.z; z++) {
                        if (this.world.isBlockSolid(x, y, z)) {
                            blocks.push(new THREE.Box3(new THREE.Vector3(x, y, z), new THREE.Vector3(x + 1, y + 1, z + 1)));
                        }
                    }
                }
            }

            function intersects(a, b) {
                var epsilon = 0.0001;
                return !(a.max.x <= b.min.x + epsilon || a.min.x >= b.max.x - epsilon || a.max.y <= b.min.y + epsilon || a.min.y >= b.max.y - epsilon)
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
                                }
                            }
                        }
                    }
                }
                if (min.axis === -1) {
                    break;
                } else {
                    var axis = axes[min.axis];
                    this.position[axis[0]] = min.pos;
                    this.velocity[axis[0]] = 0;
                    axes.splice(min.axis, 1);
                    min.axis = -1;
                }
            }
        },
        getBoundingBox: function () {
            var p = this.position;
            return new THREE.Box3(new THREE.Vector3(p.x - 0.3, p.y - 1.62, p.z - 0.3), new THREE.Vector3(p.x + 0.3, p.y + 0.3, p.z + 0.3));
        },
        updateSelection: function () {
            var r = 5;
            var boxes = [];
            var pos = new THREE.Vector3(Math.floor(this.position.x), Math.floor(this.position.y), Math.floor(this.position.z));
            for (var x = -r; x <= r; x++) {
                for (var y = -r; y <= r; y++) {
                    for (var z = -r; z <= r; z++) {
                        boxes = boxes.concat(this.world.getAABBs(pos.x + x, pos.y + y, pos.z + z));
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
                this.selector.position = box.center();
                this.selector.visible = true;
                this.selected = box.position;
                this.selectedFace = this.findSelectedFace(box);
            } else {
                this.selector.visible = false;
                this.selected = null;
                this.selectedFace = null;
            }
        },
        testBox: function (box) {
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
                t = tmax;
                return false;
            } else if (tmin > tmax) {
                return false;
            }
            return tmin;
        },
        findSelectedFace: function (box) {
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
            var f;
            for (var i = 0; i < faces.length; i++) {
                if (faces[i].t < t) {
                    t = faces[i].t
                    f = faces[i].f;
                }
            }
            return f;
        },
        breakBlock: function () {
            var p = this.selected;
            if (p) {
                this.world.setBlock(p.x, p.y, p.z, 0);
            }
        },
        pickBlock: function () {
            var p = this.selected;
            if (p) {
                this.heldItem = this.world.getBlock(p.x, p.y, p.z);
            }
        },
        placeBlock: function () {
            if (this.selected) {
                var p = this.selected.clone().add(this.selectedFace);
                this.world.setBlock(p.x, p.y, p.z, this.heldItem);
            }
        },
        sendUpdate: function () {
            this.world.mc.server.emit(0x06, {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z,
                yaw: this.lon - 90,
                pitch: -this.lat,
                onGround: this.onGround,
                stance: this.position.y - 1.62
            });
        }
    });

    mc.World = function (inst, loader) {
        this.mc = inst;
        this.chunks = {};
        this.chunkLoader = loader;
        this.queuedChunks = [];
        this.worker = new Worker('js/worker.js');
        var self = this;
        this.worker.onmessage = function (e) {
            var pos = e.data.position;
            var chunk = self.getChunk(pos.x, pos.y, pos.z);
            if (chunk) {
                if (e.data.attributes) {
                    chunk.setGeometryBuffer(e.data);
                } else {
                    chunk.transBlocks = e.data.blocks;
                    chunk.transMetadata = e.data.metadata;
                    chunk.transBlockLight = e.data.blockLight;
                    chunk.transSkyLight = e.data.skyLight;
                }
            }
        };
        this.mc.resources.configure(this.worker);
    };
    mc.CHUNK_SIZE = 16;
    extend(mc.World.prototype, {
        tick: function () {
            this.buildQueuedChunks();
        },
        loadChunk: function (x, y, z) {
            var data = this.chunkLoader.load(x, y, z);
            if (data) {
                this.setChunk(x, y, z, new mc.Chunk(this, x, y, z, data));
            }
        },
        unloadChunk: function (x, y, z) {
            var mesh = this.getChunk(x, y, z).mesh;
            if (mesh) {
                this.mc.scene.remove(mesh);
            }
            delete this.chunks[this.chunkKey(x, y, z)];
        },
        chunkKey: function (x, y, z) {
            return x + '_' + y + '_' + z;
        },
        queueChunk: function (chunk) {
            this.queuedChunks.push(chunk);
        },
        buildQueuedChunks: function () {
            if (this.queuedChunks.length === 0) {
                return;
            }
            var chunks = [],
                buffers = [];
            for (var i = this.queuedChunks.length - 1; i >= 0; i--) {
                var chunk = this.queuedChunks[i];
                if (chunk.isBuilding()) {
                    continue;
                }
                chunks.push({
                    blocks: chunk.blocks,
                    metadata: chunk.metadata,
                    blockLight: chunk.blockLight,
                    skyLight: chunk.skyLight,
                    position: {x: chunk.x, y: chunk.y, z: chunk.z},
                    build: true
                });
                var s = this.getSurroundingChunks(chunk.x, chunk.y, chunk.z);
                for (var j = 0; j < s.length; j++) {
                    var c = s[j];
                    if (!c.queued) {
                        chunks.push({
                            blocks: c.blocks,
                            metadata: c.metadata,
                            blockLight: c.blockLight,
                            skyLight: c.skyLight,
                            position: {x: c.x, y: c.y, z: c.z},
                            build: false
                        });
                    }
                }
                buffers.push(chunk.transBlocks.buffer, chunk.transMetadata.buffer, chunk.transBlockLight.buffer, chunk.transSkyLight.buffer);
                this.queuedChunks.splice(i, 1);
            }
            this.worker.postMessage(chunks, buffers);
        },
        rebuildDirty: function () {
            var chunks = this.chunks;
            Object.keys(chunks).forEach(function (v) {
                var chunk = chunks[v];
                if (chunk.dirty) {
                    chunk.buildMesh();
                }
            });
        },

        getChunk: function (x, y, z) {
            return this.chunks[this.chunkKey(x, y, z)];
        },
        setChunk: function (x, y, z, chunk) {
            return this.chunks[this.chunkKey(x, y, z)] = chunk;
        },
        getChunkContainingBlock: function (x, y, z) {
            return this.getChunk(x >> 4, y >> 4, z >> 4);
        },
        getSurroundingChunks: function (x, y, z) {
            var d = [{x:1,y:0,z:0},{x:-1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:-1,z:0},{x:0,y:0,z:1},{x:0,y:0,z:-1}];
            var chunks = [];
            for (var i = 0; i < d.length; i++) {
                var c = this.getChunk(x + d[i].x, y + d[i].y, z + d[i].z);
                if (c) {
                    chunks.push(c);
                }
            }
            return chunks;
        },
        filterChunks: function (filter) {
            var chunks = [];
            for (var c in this.chunks) {
                if (filter(this.chunks[c])) {
                    chunks.push(this.chunks[c]);
                }
            }
            return chunks;
        },

        setBlock: function (x, y, z, id, meta) {
            var mx = mod(x, mc.CHUNK_SIZE);
            var my = mod(y, mc.CHUNK_SIZE);
            var mz = mod(z, mc.CHUNK_SIZE);
            var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
            if (chunk) {
                chunk.setBlock(mx, my, mz, id, meta);
            }
        },
        setMeta: function (x, y, z, id) {
            var mx = mod(x, mc.CHUNK_SIZE);
            var my = mod(y, mc.CHUNK_SIZE);
            var mz = mod(z, mc.CHUNK_SIZE);
            var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
            if (chunk) {
                chunk.setMeta(mx, my, mz, id);
            }
        },
        getBlock: function (x, y, z) {
            var mx = mod(x, mc.CHUNK_SIZE);
            var my = mod(y, mc.CHUNK_SIZE);
            var mz = mod(z, mc.CHUNK_SIZE);
            var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
            return chunk ? chunk.getBlock(mx, my, mz) : 0;
        },
        getMeta: function (x, y, z) {
            var mx = mod(x, mc.CHUNK_SIZE);
            var my = mod(y, mc.CHUNK_SIZE);
            var mz = mod(z, mc.CHUNK_SIZE);
            var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
            return chunk ? chunk.getMeta(mx, my, mz) : 0;
        },

        getAABBs: function (x, y, z) {
            var id = this.getBlock(x, y, z)
            if (!id) {
                return [];
            }
            var b = new THREE.Box3(new THREE.Vector3(x, y, z), new THREE.Vector3(x + 1, y + 1, z + 1));
            b.position = new THREE.Vector3(x, y, z);
            return [b];
        },
        isBlockSolid: function (x, y, z) {
            var mx = mod(x, mc.CHUNK_SIZE);
            var my = mod(y, mc.CHUNK_SIZE);
            var mz = mod(z, mc.CHUNK_SIZE);
            var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
            return chunk ? chunk.isBlockSolid(mx, my, mz) : 0;
        },

        updateGeometry: function (chunk) {
            if (chunk.oldMesh) {
                this.mc.scene.remove(chunk.oldMesh);
            }

            chunk.mesh.position.x = chunk.x * mc.CHUNK_SIZE;
            chunk.mesh.position.y = chunk.y * mc.CHUNK_SIZE;
            chunk.mesh.position.z = chunk.z * mc.CHUNK_SIZE;
            this.mc.scene.add(chunk.mesh);
        }
    });
    
    mc.ServerChunkLoader = function (server) {
        this.chunks = {};
        this.server = server;
        var self = this;
        this.server.on(['play', 0x23], function (data) {
            self.world.setBlock(data.x, data.y, data.z, data.type, data.metadata);
        });
        this.server.on(['play', 0x26], function (data) {
            var stream = new Streams.ReadStream(new Zlib.Inflate(new Uint8Array(data.data.compressedChunkData)).decompress().buffer);
            var l = mc.CHUNK_SIZE*mc.CHUNK_SIZE*mc.CHUNK_SIZE;
            data.data.meta.forEach(function (d) {
                var chunks = {};
                for (var y = 0; y < self.COLUMN_HEIGHT; y++) {
                    if (d.bitMap & (1 << y)) {
                        chunks[y] = {};
                    }
                }
                for (var y = 0; y < self.COLUMN_HEIGHT; y++) {
                    if (d.bitMap & (1 << y)) {
                        chunks[y].blocks = new Uint8Array(stream.arrayBuffer(l));
                    }
                }
                for (var y = 0; y < self.COLUMN_HEIGHT; y++) {
                    if (d.bitMap & (1 << y)) {
                        chunks[y].metadata = new Uint8Array(stream.arrayBuffer(l / 2));
                    }
                }
                for (var y = 0; y < self.COLUMN_HEIGHT; y++) {
                    if (d.bitMap & (1 << y)) {
                        chunks[y].blockLight = new Uint8Array(stream.arrayBuffer(l / 2));
                    }
                }
                for (var y = 0; y < self.COLUMN_HEIGHT; y++) {
                    if (d.bitMap & (1 << y)) {
                        chunks[y].skyLight = new Uint8Array(stream.arrayBuffer(l / 2));
                    }
                }
                for (var y = 0; y < self.COLUMN_HEIGHT; y++) {
                    if (d.bitMap & (1 << y)) {
                        self.chunks[d.x + '_' + y + '_' + d.z] = chunks[y];
                    }
                }
                stream.arrayBuffer(mc.CHUNK_SIZE * mc.CHUNK_SIZE);
            });
        });
    };

    extend(mc.ServerChunkLoader.prototype, {
        COLUMN_HEIGHT: 16,
        load: function (x, y, z) {
            var l = mc.CHUNK_SIZE*mc.CHUNK_SIZE*mc.CHUNK_SIZE;
            return this.chunks[x + '_' + y + '_' + z];
        }
    });

    mc.AnvilChunkLoader = function (data) {
        this.data = data;
        this.stream = new Streams.ReadStream(data);
        this.chunks = {};
    },
    extend(mc.AnvilChunkLoader.prototype, {
        load: function (x, y, z) {
            if (this.chunks[x + '_' + y + '_' + z]) {
                var chunk = this.chunks[x + '_' + y + '_' + z];
                delete this.chunks[x + '_' + y + '_' + z];
                return chunk;
            }
            this.stream.index = 4 * (x + z * 32);
            var offset = this.stream.uint24();
            if (!offset || x < 0 || y < 0 || z < 0 || x >= 32 || y >= 32 || z >= 32) {
                return {
                    blocks: new Uint8Array(mc.CHUNK_SIZE*mc.CHUNK_SIZE*mc.CHUNK_SIZE),
                    metadata: new Uint8Array(mc.CHUNK_SIZE*mc.CHUNK_SIZE*mc.CHUNK_SIZE/2),
                    blockLight: new Uint8Array(mc.CHUNK_SIZE*mc.CHUNK_SIZE*mc.CHUNK_SIZE/2),
                    skyLight: new Uint8Array(mc.CHUNK_SIZE*mc.CHUNK_SIZE*mc.CHUNK_SIZE/2)
                };
            }
            this.stream.index = offset * 0x1000;
            var size = this.stream.uint32();
            var method = this.stream.uint8();
            var level = mc.nbt.read(new Zlib.Inflate(new Uint8Array(this.stream.arrayBuffer(size))).decompress()).Level;
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
            for (var i = 0; i < level.TileEntities.length; i++) {
                var te = level.TileEntities[i];
                this.chunks[x + '_' + Math.floor(te.y / mc.CHUNK_SIZE) + '_' + z].tileEntities.push(te);
            }
            return this.chunks[x + '_' + y + '_' + z] || (this.chunks[x + '_' + y + '_' + z] = {
                blocks: new Uint8Array(mc.CHUNK_SIZE*mc.CHUNK_SIZE*mc.CHUNK_SIZE),
                metadata: new Uint8Array(mc.CHUNK_SIZE*mc.CHUNK_SIZE*mc.CHUNK_SIZE/2),
                blockLight: new Uint8Array(mc.CHUNK_SIZE*mc.CHUNK_SIZE*mc.CHUNK_SIZE/2),
                skyLight: new Uint8Array(mc.CHUNK_SIZE*mc.CHUNK_SIZE*mc.CHUNK_SIZE/2),
            });
        }
    }),

    mc.Chunk = function (world, x, y, z, data) {
        this.world = world;
        this.x = x;
        this.y = y;
        this.z = z;
        this.blocks = data.blocks;
        this.metadata = data.metadata;
        this.blockLight = data.blockLight;
        this.skyLight = data.skyLight;
        this.transBlocks = new Uint8Array(this.blocks.length);
        this.transBlocks.set(this.blocks);
        this.transMetadata = new Uint8Array(this.metadata.length);
        this.transMetadata.set(this.metadata);
        this.transBlockLight = new Uint8Array(this.blockLight.length);
        this.transBlockLight.set(this.blockLight);
        this.transSkyLight = new Uint8Array(this.skyLight.length);
        this.transSkyLight.set(this.skyLight);
        this.buildMesh();
        var s = this.world.getSurroundingChunks(this.x, this.y, this.z);
        for (var i = 0; i < s.length; i++) {
            s[i].buildMesh();
        }
    }
    extend(mc.Chunk.prototype, {
        update: function (x, y, z) {
            var c;
            if (x === 0 && c = this.world.getChunk(this.x - 1, this.y, this.z))
                c.buildMesh();
            if (x === mc.CHUNK_SIZE - 1 && c = this.world.getChunk(this.x + 1, this.y, this.z))
                c.buildMesh();
            if (y === 0 && c = this.world.getChunk(this.x, this.y - 1, this.z))
                c.buildMesh();
            if (y === mc.CHUNK_SIZE - 1 && c = this.world.getChunk(this.x, this.y + 1, this.z))
                c.buildMesh();
            if (z === 0 && c = this.world.getChunk(this.x, this.y, this.z - 1))
                c.buildMesh();
            if (z === mc.CHUNK_SIZE - 1 && c = this.world.getChunk(this.x, this.y, this.z + 1))
                c.buildMesh();
        },
        setBlock: function (x, y, z, id, meta) {
            var index = x + z * mc.CHUNK_SIZE + y * mc.CHUNK_SIZE * mc.CHUNK_SIZE;
            this.blocks[index] = id;
            if (arguments.length > 4) this.metadata[index] = meta;
            if (this.isBuilding()) {
                if (!this.diff) {
                    this.diff = Object.create(null);
                }
                this.diff[index] = id; // TODO
            } else {
                this.transBlocks[index] = id;
                if (arguments.length > 4) this.transMetadata[index] = meta;
            }
            this.buildMesh();
        },
        setMeta: function (x, y, z, meta) {
            var index = x + z * mc.CHUNK_SIZE + y * mc.CHUNK_SIZE * mc.CHUNK_SIZE;
            this.metadata[index] = meta;
            if (this.isBuilding()) {
                /*if (!this.diff) {
                    this.diff = Object.create(null);
                }
                this.diff[index] = id; // TODO*/
            } else {
                this.transMetadata[index] = meta;
            }
            this.buildMesh();
        },
        getBlock: function (x, y, z) {
            if (x < 0 || x >= mc.CHUNK_SIZE || y < 0 || y > mc.CHUNK_SIZE || z < 0 || z >= mc.CHUNK_SIZE) {
                return -1;
            }
            return this.blocks[x + z * mc.CHUNK_SIZE + y * mc.CHUNK_SIZE * mc.CHUNK_SIZE];
        },
        getMeta: function (x, y, z) {
            if (x < 0 || x >= mc.CHUNK_SIZE || y < 0 || y > mc.CHUNK_SIZE || z < 0 || z >= mc.CHUNK_SIZE) {
                return -1;
            }
            return this.metadata[x + z * mc.CHUNK_SIZE + y * mc.CHUNK_SIZE * mc.CHUNK_SIZE];
        },
        
        isBlockSolid: function (x, y, z) {
            var id = this.getBlock(x, y, z);
            if (mc.blocks[id]) {
                return mc.blocks[id].solid;
            } else if (id === -1) {
                return true;
            }
            return false;
        },

        buildMesh: function () {
            if (this.queued) {
                return;
            }
            this.queued = true;
            this.world.queueChunk(this);
        },
        isBuilding: function () {
            return !(this.transBlocks && this.transBlocks.buffer);
        },
        setGeometryBuffer: function (res) {
            this.transBlocks = res.blocks;
            this.transMetadata = res.metadata;
            this.transBlockLight = res.blockLight;
            this.transSkyLight = res.skyLight;
            var geometry = new THREE.BufferGeometry();
            geometry.dynamic = true;
            this.attributes = geometry.attributes = res.attributes;
            geometry.offsets = [{
                start: 0,
                count: geometry.attributes.index.array.length,
                index: 0
            }];
            geometry.computeVertexNormals();
            var mesh = new THREE.Mesh(geometry, this.world.mc.resources.materials.terrain);

            this.oldMesh = this.mesh;
            this.dirty = false;
            this.mesh = mesh;
            this.world.updateGeometry(this);
            this.queued = false;
            this.applyDiff();
        },
        applyDiff: function () {
            if (this.diff && !this.isBuilding()) {
                for (var i in this.diff) {
                    this.transBlocks[i] = this.diff[i];
                }
                this.buildMesh();
            }
        }
    });

    mc.HUD = function (container) {

    };
    extend(mc.HUD.prototype, {

    });
    
    mc.nbt = {
        read: function (data) {
            var stream = new Streams.ReadStream(new Uint8Array(data).buffer);
            
            var id = stream.uint8();
            mc.nbt.tags.read[8](stream);
            return mc.nbt.tags.read[id](stream);
        },
        
        tags: {
            read: {
                1: function (stream) {
                    return stream.int8();
                },
                2: function (stream) {
                    return stream.int16();
                },
                3: function (stream) {
                    return stream.int32();
                },
                4: function (stream) {
                    return stream.int64();
                },
                5: function (stream) {
                    return stream.float32();
                },
                6: function (stream) {
                    return stream.float64();
                },
                7: function (stream) {
                    var size = stream.int32();
                    var array = new Uint8Array(size);
                    for (var i = 0; i < size; ++i) {
                        array[i] = stream.int8();
                    }
                    return array;
                },
                8: function (stream) {
                    return stream.utf8(stream.uint16());
                },
                9: function (stream) {
                    var id = stream.uint8();
                    var size = stream.uint32();
                    var array = [];
                    while (size--) {
                        array.push(mc.nbt.tags.read[id](stream));
                    }
                    return array;
                },
                10: function (stream) {
                    var obj = {};
                    while (true) {
                        var id = stream.uint8();
                        if (!id) {
                            break;
                        }
                        var n = mc.nbt.tags.read[8](stream);
                        var v = mc.nbt.tags.read[id](stream);
                        obj[n] = v;
                    }
                    return obj;
                },
                11: function (stream) {
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

    mc.ResourcePack = function (path) {
        this.path = path;
        this.assets = {};
        this.terrain = null;
        this.terrainIndex = null;
        this.textures = {};
        this.materials = {};
    };
    extend(mc.ResourcePack.prototype, {
        createResouces: function () {
            var terrain = new THREE.Texture(this.terrain);
            terrain.needsUpdate = true;
            terrain.magFilter = THREE.NearestFilter;
            terrain.minFilter = THREE.NearestFilter;
            this.textures.terrain = terrain;
            mc.shaders.terrain.map = this.textures.terrain;
            this.materials.terrain = mc.shaders.terrain;
        },
        load: function (progress, cb) {
            var self = this;
            this.loadAssets(progress, function (err) {
                if (err) return cb(err);
                self.buildTerrain();
                self.createResouces();
                cb();
            });
        },
        loadAssets: function (progress, cb) {
            var self = this;
            zip.createReader(new zip.HttpReader(this.path), function (reader) {
                reader.getEntries(function (entries) {
                    var images = entries.filter(function (entry) {
                        return /\.png$/.test(entry.filename);
                    });
                    window.es = images;
                    var i = 0;
                    async.eachLimit(images, 10, function (entry, cb) {
                        if (/\.png$/.test(entry.filename)) {
                            entry.getData(new zip.BlobWriter('image/png'), function (blob) {
                                var img = new Image();
                                self.assets[entry.filename.replace(/\..*$/, '').replace(/\//g, '.')] = img;
                                img.onload = function() {
                                    progress(++i / images.length);
                                    setTimeout(cb, 0);
                                };
                                img.src = URL.createObjectURL(blob);
                            });
                        } else {
                            cb();
                        }
                    }, cb);
                }, cb);
            }, cb);
        },
        buildTerrain: function () {
            var self = this;
            var blocks = Object.keys(this.assets).filter(function (n) {
                return /^assets\.minecraft\.textures\.blocks\./.test(n);
            }).map(function (n) {
                return {
                    name: n.match(/^assets\.minecraft\.textures\.blocks\.(.*)/)[1],
                    asset: self.assets[n]
                };
            });
            var s = 1;
            while (s*s < blocks.length) {
                s <<= 1;
            }
            this.terrainSize = s;
            var tw = blocks[0].asset.width;
            var th = blocks[0].asset.height;
            var canvas = document.createElement('canvas');
            this.tileWidth = tw;
            this.tileHeight = th;
            canvas.width = tw * s;
            canvas.height = th * s;
            var ctx = canvas.getContext('2d');
            var index = {};
            blocks.forEach(function (b, i) {
                var x = i % s;
                var y = i / s | 0;
                ctx.drawImage(b.asset, x * tw, y * th, tw, th); // TODO: Fix for none-uniform assets
                index[b.name] = i;
            });
            this.terrain = canvas;
            this.terrainIndex = index;
        },
        configure: function (worker) {
            worker.postMessage({
                config: true,
                size: this.terrainSize,
                tileWidth: this.tileWidth,
                tileHeight: this.tileHeight,
                index: this.terrainIndex
            });
        }
    });
}) (mc);
