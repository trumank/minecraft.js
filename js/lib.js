(function (MC) {
  'use strict';
  var extend = function (base, ex) {
    for (var key in ex) {
      if (ex.hasOwnProperty(key)) {
        base[key] = ex[key];
      }
    }
  };

  function NameIDMap() {
    this.names = {};
    this.ids = {};
  }
  NameIDMap.prototype.nameOf = function (id) {
    return this.names[id];
  };
  NameIDMap.prototype.idOf = function (name) {
    return this.ids[name];
  };
  NameIDMap.prototype.add = function (prefix, map) {
    var self = this;
    Object.keys(map).forEach(function (name) {
      var prefixed = prefix + name;
      var id = map[name];
      self.names[id] = prefixed;
      self.ids[prefixed] = id;
    });
  };

  MC.DynamicArray = function DynamicArray(type) {
    this.type = type;
    this.chunkSize = 16;
    this.chunks = [];
    this.totalSize = 0;
    this.currentChunk = null;
    this.currentIndex = 0;
  };
  MC.DynamicArray.prototype.push = function (item) {
    if (!this.currentChunk || this.currentIndex >= this.chunkSize) {
      this.expand();
    }
    this.currentChunk[this.currentIndex++] = item;
    return this.totalSize++;
  };

  MC.DynamicArray.prototype.expand = function () {
    this.chunkSize *= 2;
    this.currentChunk = new this.type(this.chunkSize);
    this.currentIndex = 0;
    this.chunks.push(this.currentChunk);
  };

  MC.DynamicArray.prototype.size = function () {
    return this.totalSize;
  };

  MC.DynamicArray.prototype.concat = function () {
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
  };

  MC.ID = new NameIDMap();

  MC.ID.add('minecraft:', {air:0,stone:1,grass:2,dirt:3,cobblestone:4,planks:5,sapling:6,bedrock:7,flowing_water:8,water:9,flowing_lava:10,lava:11,sand:12,gravel:13,gold_ore:14,iron_ore:15,coal_ore:16,log:17,leaves:18,sponge:19,glass:20,lapis_ore:21,lapis_block:22,dispenser:23,sandstone:24,noteblock:25,bed:26,golden_rail:27,detector_rail:28,sticky_piston:29,web:30,tallgrass:31,deadbush:32,piston:33,piston_head:34,wool:35,yellow_flower:37,red_flower:38,brown_mushroom:39,red_mushroom:40,gold_block:41,iron_block:42,double_stone_slab:43,stone_slab:44,brick_block:45,tnt:46,bookshelf:47,mossy_cobblestone:48,obsidian:49,torch:50,fire:51,mob_spawner:52,oak_stairs:53,chest:54,redstone_wire:55,diamond_ore:56,diamond_block:57,crafting_table:58,wheat:59,farmland:60,furnace:61,lit_furnace:62,standing_sign:63,wooden_door:64,ladder:65,rail:66,stone_stairs:67,wall_sign:68,lever:69,stone_pressure_plate:70,iron_door:71,wooden_pressure_plate:72,redstone_ore:73,lit_redstone_ore:74,unlit_redstone_torch:75,redstone_torch:76,stone_button:77,snow_layer:78,ice:79,snow:80,cactus:81,clay:82,reeds:83,jukebox:84,fence:85,pumpkin:86,netherrack:87,soul_sand:88,glowstone:89,portal:90,lit_pumpkin:91,cake:92,unpowered_repeater:93,powered_repeater:94,stained_glass:95,trapdoor:96,monster_egg:97,stonebrick:98,/*stonebrick:99,stonebrick:100, TODO*/iron_bars:101,glass_pane:102,melon_block:103,pumpkin_stem:104,melon_stem:105,vine:106,fence_gate:107,brick_stairs:108,stone_brick_stairs:109,mycelium:110,waterlily:111,nether_brick:112,nether_brick_fence:113,nether_brick_stairs:114,nether_wart:115,enchanting_table:116,brewing_stand:117,cauldron:118,end_portal:119,end_portal_frame:120,end_stone:121,dragon_egg:122,redstone_lamp:123,lit_redstone_lamp:124,double_wooden_slab:125,wooden_slab:126,cocoa:127,sandstone_stairs:128,emerald_ore:129,ender_chest:130,tripwire_hook:131,/*tripwire_hook:132 TODO,*/emerald_block:133,spruce_stairs:134,birch_stairs:135,jungle_stairs:136,command_block:137,beacon:138,cobblestone_wall:139,flower_pot:140,carrots:141,potatoes:142,wooden_button:143,skull:144,anvil:145,trapped_chest:146,light_weighted_pressure_plate:147,heavy_weighted_pressure_plate:148,unpowered_comparator:149,powered_comparator:150,daylight_detector:151,redstone_block:152,quartz_ore:153,hopper:154,quartz_block:155,quartz_stairs:156,activator_rail:157,dropper:158,stained_hardened_clay:159,stained_glass_pane:160,leaves2:161,logs2:162,acacia_stairs:163,dark_oak_stairs:164,slime:165,barrier:166,iron_trapdoor:167,prismarine:168,sea_lantern:169,hay_block:170,carpet:171,hardened_clay:172,coal_block:173,packed_ice:174,double_plant:175});
  MC.ID.add('minecraft:', {iron_shovel:256,iron_pickaxe:257,iron_axe:258,flint_and_steel:259,apple:260,bow:261,arrow:262,coal:263,diamond:264,iron_ingot:265,gold_ingot:266,iron_sword:267,wooden_sword:268,wooden_shovel:269,wooden_pickaxe:270,wooden_axe:271,stone_sword:272,stone_shovel:273,stone_pickaxe:274,stone_axe:275,diamond_sword:276,diamond_shovel:277,diamond_pickaxe:278,diamond_axe:279,stick:280,bowl:281,mushroom_stew:282,golden_sword:283,golden_shovel:284,golden_pickaxe:285,golden_axe:286,string:287,feather:288,gunpowder:289,wooden_hoe:290,stone_hoe:291,iron_hoe:292,diamond_hoe:293,golden_hoe:294,wheat_seeds:295,wheat:296,bread:297,leather_helmet:298,leather_chestplate:299,leather_leggings:300,leather_boots:301,chainmail_helmet:302,chainmail_chestplate:303,chainmail_leggings:304,chainmail_boots:305,iron_helmet:306,iron_chestplate:307,iron_leggings:308,iron_boots:309,diamond_helmet:310,diamond_chestplate:311,diamond_leggings:312,diamond_boots:313,golden_helmet:314,golden_chestplate:315,golden_leggings:316,golden_boots:317,/*flint_and_steel:318,*/porkchop:319,cooked_porkchop:320,painting:321,golden_apple:322,sign:323,wooden_door:324,bucket:325,water_bucket:326,lava_bucket:327,minecart:328,saddle:329,iron_door:330,redstone:331,snowball:332,boat:333,leather:334,milk_bucket:335,brick:336,clay_ball:337,reeds:338,paper:339,book:340,slime_ball:341,chest_minecart:342,furnace_minecart:343,egg:344,compass:345,fishing_rod:346,clock:347,glowstone_dust:348,fish:349,cooked_fish:350,dye:351,bone:352,sugar:353,cake:354,bed:355,repeater:356,cookie:357,filled_map:358,shears:359,melon:360,pumpkin_seeds:361,melon_seeds:362,beef:363,cooked_beef:364,chicken:365,cooked_chicken:366,rotten_flesh:367,ender_pearl:368,blaze_rod:369,ghast_tear:370,gold_nugget:371,nether_wart:372,potion:373,glass_bottle:374,spider_eye:375,fermented_spider_eye:376,blaze_powder:377,magma_cream:378,brewing_stand:379,cauldron:380,ender_eye:381,speckled_melon:382,experience_bottle:384,fire_charge:385,writable_book:386,written_book:387,emerald:388,item_frame:389,flower_pot:390,carrot:391,potato:392,baked_potato:393,poisonous_potato:394,map:395,golden_carrot:396,skull:397,carrot_on_a_stick:398,nether_star:399,pumpkin_pie:400,fireworks:401,firework_charge:402,enchanted_book:403,comparator:404,netherbrick:405,quartz:406,tnt_minecart:407,hopper_minecart:408,prismarine_shard:409,prismarine_crystals:410,rabbit:411,cooked_rabbit:412,rabbit_stew:413,rabbit_foot:414,rabbit_hide:415,iron_horse_armor:417,golden_horse_armor:418,diamond_horse_armor:419,lead:420,name_tag:421,command_block_minecart:422,mutton:423,cooked_mutton:424,record_13:2256,record_cat:2257,record_blocks:2258,record_chirp:2259,record_far:2260,record_mall:2261,record_mellohi:2262,record_stal:2263,record_strad:2264,record_ward:2265,record_11:2266,record_wait:2267});
}) (self.MC || (MC = {}));
