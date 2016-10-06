(function (MC) {
  'use strict';

  var Util = {
    random: array => {
      return Array.isArray(array) ? array[Math.random() * array.length | 0] : array;
    },
    getVariant: blockState => {
      if (Array.isArray(blockState.variants.normal)) {
        return Util.random(blockState.variants.normal);
      } else {
        return blockState.variants.normal;
      }
    }
  };

  MC.DynamicArray = class DynamicArray {
    constructor(type) {
      this.type = type;
      this.chunkSize = 16;
      this.chunks = [];
      this.totalSize = 0;
      this.currentChunk = null;
      this.currentIndex = 0;
    }
    push(item) {
      if (!this.currentChunk || this.currentIndex >= this.chunkSize) {
        this.expand();
      }
      this.currentChunk[this.currentIndex++] = item;
      return this.totalSize++;
    }
    expand() {
      this.chunkSize *= 2;
      this.currentChunk = new this.type(this.chunkSize);
      this.currentIndex = 0;
      this.chunks.push(this.currentChunk);
    }
    size() {
      return this.totalSize;
    }
    concat() {
      if (this.totalSize === 0) {
        return new this.type(0);
      }
      var whole = new this.type(this.totalSize);
      var offset = 0,
        i;
      for (i = 0; i < this.chunks.length - 1; i++) {
        whole.set(this.chunks[i], offset);
        offset += this.chunks[i].length;
      }
      whole.set(this.chunks[i].subarray(0, this.currentIndex), offset);
      return whole;
    }
  };

  MC.Chunk = class Chunk {
    constructor(world, x, y, z, data) {
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
      this.intact = true; // false when trans data is in a worker
      this.diff = new Map();
      this.buildMesh();
      for (var chunk of this.getSurroundingChunks()) {
        chunk.buildMesh();
      }
    }
    update(x, y, z) {
      var c;
      if (x === 0 && (c = this.world.getChunk(this.x - 1, this.y, this.z)))
        c.buildMesh();
      if (x === MC.CHUNK_SIZE - 1 && (c = this.world.getChunk(this.x + 1, this.y, this.z)))
        c.buildMesh();
      if (y === 0 && (c = this.world.getChunk(this.x, this.y - 1, this.z)))
        c.buildMesh();
      if (y === MC.CHUNK_SIZE - 1 && (c = this.world.getChunk(this.x, this.y + 1, this.z)))
        c.buildMesh();
      if (z === 0 && (c = this.world.getChunk(this.x, this.y, this.z - 1)))
        c.buildMesh();
      if (z === MC.CHUNK_SIZE - 1 && (c = this.world.getChunk(this.x, this.y, this.z + 1)))
        c.buildMesh();
    }
    setBlock(x, y, z, id) {
      var index = x + z * MC.CHUNK_SIZE + y * MC.CHUNK_SIZE * MC.CHUNK_SIZE;
      this.blocks[index] = id;

      if (this.intact) {
        this.transBlocks[index] = id;
      } else {
        this.diff.set(index, id); // TODO?
      }
      this.buildMesh();
      this.update(x, y, z);
    }
    getBlock(x, y, z) {
      if (x < 0 || x >= MC.CHUNK_SIZE || y < 0 || y > MC.CHUNK_SIZE || z < 0 || z >= MC.CHUNK_SIZE) {
        return -1;
      }
      return this.blocks[x + z * MC.CHUNK_SIZE + y * MC.CHUNK_SIZE * MC.CHUNK_SIZE];
    }
    getSurroundingChunks() {
      return this.world.getSurroundingChunks(this.x, this.y, this.z);
    }

    isBlockSolid(x, y, z) {
      var id = this.getBlock(x, y, z);
      var b = MC.Blocks.getById(id);
      if (b) {
        return b.solid;
      } else if (id === -1) {
        return true;
      }
      return false;
    }

    buildMesh() {
      if (this.queued) {
        return;
      }
      this.queued = true;
      this.world.queueChunk(this);
    }
    readyToBuild() {
      if (!this.intact) return false;
      for (var chunk of this.getSurroundingChunks()) {
        if (!chunk.intact) {
          return false;
        }
      }
      return true;
    }
    setGeometryBuffer(res) {
      //this.blockIndexes = res.blocks;
      var geometry = new THREE.BufferGeometry();
      geometry.setIndex(new THREE.BufferAttribute(res[0], 1));
      geometry.addAttribute('position', new THREE.BufferAttribute(res[1], 3));
      geometry.addAttribute('color', new THREE.BufferAttribute(res[2], 3));
      geometry.addAttribute('uv', new THREE.BufferAttribute(res[3], 2));
      //geometry.computeVertexNormals(); // TODO: Do we even need normals? They're slow to compute
      var mesh = new THREE.Mesh(geometry, this.world.mc.resources.materials.terrain);

      this.oldMesh = this.mesh;
      this.dirty = false;
      this.mesh = mesh;
      this.world.updateGeometry(this);
      this.queued = false;
    }
    sendToWorker(worker, build) {
      this.intact = false;
      var data = [this.transBlocks, this.transBlockLight, this.transSkyLight];
      worker.postMessage(['chunk', {
        build: build,
        data: data,
        position: {x: this.x, y: this.y, z: this.z},
      }], data.map(a => a.buffer));
    }
    setFromWorker(data) {
      [this.transBlocks, this.transBlockLight, this.transSkyLight] = data;
      this.intact = true;
      this.applyDiff();
    }
    applyDiff() {
      if (this.intact) {
        for (var [index, id] of this.diff) {
          this.transBlocks[index] = id;
          this.buildMesh();
        }
        this.diff.clear();
      }
    }
  };

  MC.BlockMap = class BlockMap {
    constructor() {
      this.ids = new Map();
      this.names = new Map();
    }
    getByName(name) {
      return this.names.get(name);
    }
    getById(id) {
      return this.ids.get(id >> 4);
    }
    add(prefix, blocks) {
      for (var block of blocks) {
        block.prefix = prefix;
        this.ids.set(block.id, block);
        this.names.set(prefix + ':' + block.name, block);
      }
    }
    getModel(resources, id) {
      var block = this.getById(id);
      if (!block) return;
      var [model, state] = block.getState(id & 0xf);
      model = block.prefix + model;
      var blockstate = resources.blockStates[model];
      if (!blockstate) return; //console.warn('missing block state for ' + block.name);
      var variant = blockstate.variants[state];
      if (!variant) return; //console.warn('missing variant for ' + block.name);
      return Array.isArray(variant) ? variant : [variant];
    }
    isOpaque(id) {
      var block = this.getById(id);
      return block ? block.opaque : false;
    }
  };

  MC.Block = class Block {
    constructor(id, name, solid, opaque, states) {
      this.id = id;
      this.name = name;
      this.solid = !!solid;
      this.opaque = !!opaque;
      this.states = (states || []).map(state => {
        return Array.isArray(state) ? state : [state, 'normal'];
      });
    }
    getState(metadata) { // TODO: Some blocks need more than metadata to determine state (e.g. grass)
      return this.states[metadata] || [this.name, 'normal'];
    }
  };


  MC.Blocks = new MC.BlockMap();

  MC.Blocks.add('minecraft:', [
    new MC.Block(0, 'air', false, false),
    new MC.Block(1, 'stone', true, true, ['stone', 'granite', 'smooth_granite', 'diorite', 'smooth_diorite', 'andesite', 'smooth_andesite']),
    new MC.Block(2, 'grass', true, true, [['grass', 'snowy=false']]), // TODO: Snowy grass?
    new MC.Block(3, 'dirt', true, true, ['dirt', 'coarse_dirt']),
    new MC.Block(4, 'cobblestone', true, true),
    new MC.Block(5, 'oak_planks', true, true, ['oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks', 'acacia_planks', 'dark_oak_planks']),
    new MC.Block(6, 'sapling', false, false, [['oak_sapling', 'stage=0'], ['spruce_sapling', 'stage=0'], ['birch_sapling', 'stage=0'], ['jungle_sapling', 'stage=0'], ['acacia_sapling', 'stage=0'], , , , ['oak_sapling', 'stage=1'], ['spruce_sapling', 'stage=1'], ['birch_sapling', 'stage=1'], ['jungle_sapling', 'stage=1'], ['acacia_sapling', 'stage=1']]),
    new MC.Block(7, 'bedrock', true, true),
    new MC.Block(8, 'flowing_water', false, false),
    new MC.Block(9, 'water', false, false),
    new MC.Block(10, 'flowing_lava', false, false),
    new MC.Block(11, 'lava', false, false),
    new MC.Block(12, 'sand', true, true, ['sand', 'red_sand']),
    new MC.Block(13, 'gravel', true, true),
    new MC.Block(14, 'gold_ore', true, true),
    new MC.Block(15, 'iron_ore', true, true),
    new MC.Block(16, 'coal_ore', true, true),
    new MC.Block(17, 'log', true, true, [
      ['oak_log', 'axis=y'],    ['spruce_log', 'axis=y'],    ['birch_log', 'axis=y'],    ['jungle_log', 'axis=y'],
      ['oak_log', 'axis=x'],    ['spruce_log', 'axis=x'],    ['birch_log', 'axis=x'],    ['jungle_log', 'axis=x'],
      ['oak_log', 'axis=z'],    ['spruce_log', 'axis=z'],    ['birch_log', 'axis=z'],    ['jungle_log', 'axis=z'],
      ['oak_log', 'axis=none'], ['spruce_log', 'axis=none'], ['birch_log', 'axis=none'], ['jungle_log', 'axis=none']]),
    new MC.Block(18, 'leaves', true, false, [
      'oak_leaves', 'spruce_leaves', 'birch_leaves', 'jungle_leaves',
      'oak_leaves', 'spruce_leaves', 'birch_leaves', 'jungle_leaves',
      'oak_leaves', 'spruce_leaves', 'birch_leaves', 'jungle_leaves',
      'oak_leaves', 'spruce_leaves', 'birch_leaves', 'jungle_leaves']),
    new MC.Block(19, 'sponge', true, true),
    new MC.Block(20, 'glass', true),
    new MC.Block(21, 'lapis_ore', true, true),
    new MC.Block(22, 'lapis_block', true, true),
    new MC.Block(23, 'dispenser', true, true),
    new MC.Block(24, 'sandstone', true, true),
    new MC.Block(25, 'noteblock', true, true),
    new MC.Block(26, 'bed', false),
    new MC.Block(27, 'golden_rail'),
    new MC.Block(28, 'detector_rail'),
    new MC.Block(29, 'sticky_piston'),
    new MC.Block(30, 'web', false),
    new MC.Block(31, 'tallgrass', false),
    new MC.Block(32, 'deadbush', false),
    new MC.Block(33, 'piston', false),
    new MC.Block(34, 'piston_head', false),
    new MC.Block(35, 'wool', true, true, ['white_wool', 'orange_wool', 'magenta_wool', 'light_blue_wool', 'yellow_wool', 'lime_wool', 'pink_wool', 'gray_wool', 'light_gray_wool', 'cyan_wool', 'purple_wool', 'blue_wool', 'brown_wool', 'green_wool', 'red_wool', 'black_wool']),
    new MC.Block(37, 'yellow_flower', false),
    new MC.Block(38, 'red_flower', false),
    new MC.Block(39, 'brown_mushroom', false),
    new MC.Block(40, 'red_mushroom', false),
    new MC.Block(41, 'gold_block', true, true),
    new MC.Block(42, 'iron_block', true, true),
    new MC.Block(43, 'double_stone_slab', true, true),
    new MC.Block(44, 'stone_slab', false),
    new MC.Block(45, 'brick_block', true, true),
    new MC.Block(46, 'tnt', true, true),
    new MC.Block(47, 'bookshelf', true),
    new MC.Block(48, 'mossy_cobblestone', true, true),
    new MC.Block(49, 'obsidian', true, true),
    new MC.Block(50, 'torch', false),
    new MC.Block(51, 'fire', false),
    new MC.Block(52, 'mob_spawner', false),
    new MC.Block(53, 'oak_stairs', false),
    new MC.Block(54, 'chest', false),
    new MC.Block(55, 'redstone_wire', false),
    new MC.Block(56, 'diamond_ore', true, true),
    new MC.Block(57, 'diamond_block', true, true),
    new MC.Block(58, 'crafting_table', true, true),
    new MC.Block(59, 'wheat', false),
    new MC.Block(60, 'farmland', false),
    new MC.Block(61, 'furnace', true, true),
    new MC.Block(62, 'lit_furnace', true, true),
    new MC.Block(63, 'standing_sign', false),
    new MC.Block(64, 'wooden_door', false),
    new MC.Block(65, 'ladder', false, false, [['ladder', 'facing=south'], ['ladder', 'facing=south'], ['ladder', 'facing=north'], ['ladder', 'facing=south'], ['ladder', 'facing=west'], ['ladder', 'facing=east']]),
    new MC.Block(66, 'rail', false),
    new MC.Block(67, 'stone_stairs', false),
    new MC.Block(68, 'wall_sign', false),
    new MC.Block(69, 'lever', false),
    new MC.Block(70, 'stone_pressure_plate', false),
    new MC.Block(71, 'iron_door', false),
    new MC.Block(72, 'wooden_pressure_plate', false),
    new MC.Block(73, 'redstone_ore', true, true),
    new MC.Block(74, 'lit_redstone_ore', true, true),
    new MC.Block(75, 'unlit_redstone_torch', false),
    new MC.Block(76, 'redstone_torch', false),
    new MC.Block(77, 'stone_button', false),
    new MC.Block(78, 'snow_layer', false),
    new MC.Block(79, 'ice', false, true),
    new MC.Block(80, 'snow', false),
    new MC.Block(81, 'cactus', false),
    new MC.Block(82, 'clay', true, true),
    new MC.Block(83, 'reeds', false),
    new MC.Block(84, 'jukebox', true, true),
    new MC.Block(85, 'fence', false),
    new MC.Block(86, 'pumpkin', true),
    new MC.Block(87, 'netherrack', true, true),
    new MC.Block(88, 'soul_sand', false),
    new MC.Block(89, 'glowstone', true, true),
    new MC.Block(90, 'portal', false),
    new MC.Block(91, 'lit_pumpkin', true, true),
    new MC.Block(92, 'cake', false),
    new MC.Block(93, 'unpowered_repeater', false),
    new MC.Block(94, 'powered_repeater', false),
    new MC.Block(95, 'stained_glass', true),
    new MC.Block(96, 'trapdoor', false),
    new MC.Block(97, 'monster_egg', false),
    new MC.Block(98, 'stonebrick', true, true),
    new MC.Block(101, 'iron_bars', false),
    new MC.Block(102, 'glass_pane', false),
    new MC.Block(103, 'melon_block', true),
    new MC.Block(104, 'pumpkin_stem', false),
    new MC.Block(105, 'melon_stem', false),
    new MC.Block(106, 'vine', false),
    new MC.Block(107, 'fence_gate', false),
    new MC.Block(108, 'brick_stairs', false),
    new MC.Block(109, 'stone_brick_stairs', false),
    new MC.Block(110, 'mycelium', true, true),
    new MC.Block(111, 'waterlily', false),
    new MC.Block(112, 'nether_brick', true, true),
    new MC.Block(113, 'nether_brick_fence', false),
    new MC.Block(114, 'nether_brick_stairs', false),
    new MC.Block(115, 'nether_wart', false),
    new MC.Block(116, 'enchanting_table', false),
    new MC.Block(117, 'brewing_stand', false, false, [
      ['brewing_stand', 'has_bottle_0=false,has_bottle_1=false,has_bottle_2=true'],
      ['brewing_stand', 'has_bottle_0=false,has_bottle_1=true,has_bottle_2=false'],
      ['brewing_stand', 'has_bottle_0=false,has_bottle_1=true,has_bottle_2=true'],
      ['brewing_stand', 'has_bottle_0=true,has_bottle_1=false,has_bottle_2=false'],
      ['brewing_stand', 'has_bottle_0=true,has_bottle_1=false,has_bottle_2=true'],
      ['brewing_stand', 'has_bottle_0=true,has_bottle_1=true,has_bottle_2=false'],
      ['brewing_stand', 'has_bottle_0=true,has_bottle_1=true,has_bottle_2=true']]), // TODO: Confirm these are correct
    new MC.Block(118, 'cauldron', false),
    new MC.Block(119, 'end_portal', false),
    new MC.Block(120, 'end_portal_frame', false),
    new MC.Block(121, 'end_stone', true, true),
    new MC.Block(122, 'dragon_egg', false),
    new MC.Block(123, 'redstone_lamp', true, true),
    new MC.Block(124, 'lit_redstone_lamp', true, true),
    new MC.Block(125, 'double_wooden_slab', true, true),
    new MC.Block(126, 'wooden_slab', false),
    new MC.Block(127, 'cocoa', false),
    new MC.Block(128, 'sandstone_stairs', false),
    new MC.Block(129, 'emerald_ore', true, true),
    new MC.Block(130, 'ender_chest', false),
    new MC.Block(131, 'tripwire_hook', false),
    new MC.Block(133, 'emerald_block', true, true),
    new MC.Block(134, 'spruce_stairs', false),
    new MC.Block(135, 'birch_stairs', false),
    new MC.Block(136, 'jungle_stairs', false),
    new MC.Block(137, 'command_block', true, true),
    new MC.Block(138, 'beacon', true, true),
    new MC.Block(139, 'cobblestone_wall', false),
    new MC.Block(140, 'flower_pot', false),
    new MC.Block(141, 'carrots', false),
    new MC.Block(142, 'potatoes', false),
    new MC.Block(143, 'wooden_button', false),
    new MC.Block(144, 'skull', false),
    new MC.Block(145, 'anvil', false),
    new MC.Block(146, 'trapped_chest', false),
    new MC.Block(147, 'light_weighted_pressure_plate', false),
    new MC.Block(148, 'heavy_weighted_pressure_plate', false),
    new MC.Block(149, 'unpowered_comparator', false),
    new MC.Block(150, 'powered_comparator', false),
    new MC.Block(151, 'daylight_detector', false),
    new MC.Block(152, 'redstone_block', true, true),
    new MC.Block(153, 'quartz_ore', true, true),
    new MC.Block(154, 'hopper', false),
    new MC.Block(155, 'quartz_block', true, true),
    new MC.Block(156, 'quartz_stairs', false),
    new MC.Block(157, 'activator_rail', false),
    new MC.Block(158, 'dropper', false),
    new MC.Block(159, 'stained_hardened_clay', true, true),
    new MC.Block(160, 'stained_glass_pane', false),
    new MC.Block(161, 'leaves2', true, false, [
      'oak_leaves', 'spruce_leaves', , ,
      'oak_leaves', 'spruce_leaves', , ,
      'oak_leaves', 'spruce_leaves', , ,
      'oak_leaves', 'spruce_leaves']),
    new MC.Block(162, 'log2', true, true, [
      ['acacia_log', 'axis=y'],    ['dark_oak_log', 'axis=y'],  , ,
      ['acacia_log', 'axis=x'],    ['dark_oak_log', 'axis=x'],  , ,
      ['acacia_log', 'axis=z'],    ['dark_oak_log', 'axis=z'],  , ,
      ['acacia_log', 'axis=none'], ['dark_oak_log', 'axis=none']]),
    new MC.Block(163, 'acacia_stairs', false),
    new MC.Block(164, 'dark_oak_stairs', false),
    new MC.Block(165, 'slime', true),
    new MC.Block(166, 'barrier', true),
    new MC.Block(167, 'iron_trapdoor', false),
    new MC.Block(168, 'prismarine', true, true),
    new MC.Block(169, 'sea_lantern', true, true),
    new MC.Block(170, 'hay_block', true, true),
    new MC.Block(171, 'carpet', false),
    new MC.Block(172, 'hardened_clay', true, true),
    new MC.Block(173, 'coal_block', true, true),
    new MC.Block(174, 'packed_ice', true, true),
    new MC.Block(175, 'double_plant', false),
  ]);
}) (self.MC || (MC = {}));
