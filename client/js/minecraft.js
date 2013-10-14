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
    }

    mc.textures = {
        terrain: THREE.ImageUtils.loadTexture('img/32x32 terrain.png')
    };
    mc.textures.terrain.wrapS = THREE.RepeatWrapping;
    mc.textures.terrain.wrapT = THREE.RepeatWrapping;
    mc.textures.terrain.magFilter = THREE.NearestFilter;
    mc.textures.terrain.minFilter = THREE.NearestFilter;
    mc.shaders.terrain.map = mc.textures.terrain;
    mc.materials = {
        terrain: mc.shaders.terrain
    };

    mc.Minecraft = function (container, width, height) {
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(0x101010); // sky: :0xbfd1e5

        this.element = this.renderer.domElement;
        this.element.setAttribute('tabindex', '0');

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

        //var light = new THREE.PointLight(0x4c3d26, 6, 8);
        //this.scene.add(light);

        this.world = new mc.World(this, region);
        this.player = new mc.Player(this.world, 'Player', new THREE.PerspectiveCamera(120, width / height, 0.001, 20000));

        this.player.position.set(318, 89, 143);
        //light.position = this.player.position;

        container.appendChild(this.renderer.domElement);
        this.stats = new Stats();
        this.stats.domElement.style.position = 'absolute';
        this.stats.domElement.style.top = '0px';
        container.appendChild(this.stats.domElement);
        this.render();
    };
    extend(mc.Minecraft.prototype, {
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
        }
    });

    mc.Player = function (world, name, camera) {
        this.world = world;
        this.name = name;
        this.camera = camera;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.position = camera.position;
        this.speed = 0.1;
        this.lat = this.lon = 0;

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
    };
    extend(mc.Player.prototype, {
        tick: function () {
            var lookSpeed = 0.5;

            this.lon += this.world.mc.mouseMovement.x * lookSpeed;
            this.lat -= this.world.mc.mouseMovement.y * lookSpeed;
            this.lat = THREE.Math.clamp(this.lat, -89.9, 89.9);

            var phi = (90 - this.lat) * Math.PI / 180;
            var theta = this.lon * Math.PI / 180;

            this.camera.lookAt(this.position.clone().add(new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta))));
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
            this.world.rebuildDirty();
        },
        correctCollision: function () {
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
            var axes = [['x', 'y', 'z', 0.2, -0.2], ['y', 'x', 'z', 1.5, -0.3], ['z', 'x', 'y', 0.2, -0.2]];
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
            return new THREE.Box3(new THREE.Vector3(p.x - 0.2, p.y - 1.5, p.z - 0.2), new THREE.Vector3(p.x + 0.2, p.y + 0.3, p.z + 0.2));
        }
    });

    mc.Server = function (address) {
        this.address = address;
        this.socket = new WebSocket(address);
        this.socket.onmessage = this.onmessage;
    };
    extend(mc.Server.prototype, {
        onmessage: function (data) {
            console.log(data);
        }
    })

    mc.World = function (inst, data) {
        this.mc = inst;
        this.chunks = {};
        this.chunkLoader = new mc.AnvilChunkLoader(data);
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
    };
    mc.CHUNK_SIZE = 16;
    extend(mc.World.prototype, {
        tick: function () {
            this.buildQueuedChunks();
        },
        loadChunk: function (x, y, z) {
            var chunk = new mc.Chunk(this, x, y, z, this.chunkLoader.load(x, y, z));
            this.setChunk(x, y, z, chunk);
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

        setBlock: function (x, y, z, id) {
            var mx = mod(x, mc.CHUNK_SIZE);
            var my = mod(y, mc.CHUNK_SIZE);
            var mz = mod(z, mc.CHUNK_SIZE);
            var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
            if (chunk) {
                chunk.setBlock(mx, my, mz, id);
            }
        },
        getBlock: function (x, y, z) {
            var mx = mod(x, mc.CHUNK_SIZE);
            var my = mod(y, mc.CHUNK_SIZE);
            var mz = mod(z, mc.CHUNK_SIZE);
            var chunk = this.getChunk((x - mx) >> 4, (y - my) >> 4, (z - mz) >> 4);
            return chunk ? chunk.getBlock(mx, my, mz) : 0;
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
                    skyLight: sections[i].SkyLight
                };
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
        this.transBlocks = new Uint8Array(data.blocks.length);
        this.transBlocks.set(this.blocks);
        this.transMetadata = new Uint8Array(data.metadata.length);
        this.transMetadata.set(this.metadata);
        this.transBlockLight = new Uint8Array(data.blockLight.length);
        this.transBlockLight.set(this.metadata);
        this.transSkyLight = new Uint8Array(data.skyLight.length);
        this.transSkyLight.set(this.metadata);
        this.buildMesh();
        var s = this.world.getSurroundingChunks(this.x, this.y, this.z);
        for (var i = 0; i < s.length; i++) {
            s[i].buildMesh();
        }
    }
    extend(mc.Chunk.prototype, {
        setBlock: function (x, y, z, id) {
            var index = x + z * mc.CHUNK_SIZE + y * mc.CHUNK_SIZE * mc.CHUNK_SIZE;
            this.blocks[index] = id;
            if (this.isBuilding()) {
                if (!this.diff) {
                    this.diff = Object.create(null);
                }
                this.diff[index] = id;
            } else {
                this.transBlocks[index] = id;
            }
            this.buildMesh();
        },
        getBlock: function (x, y, z) {
            if (x < 0 || x >= mc.CHUNK_SIZE || y < 0 || y > mc.CHUNK_SIZE || z < 0 || z >= mc.CHUNK_SIZE) {
                return -1;
            }
            return this.blocks[x + z * mc.CHUNK_SIZE + y * mc.CHUNK_SIZE * mc.CHUNK_SIZE];
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
            var mesh = new THREE.Mesh(geometry, mc.materials.terrain);

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
}) (mc);
 