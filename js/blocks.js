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
        this.values = {};
    }

    extend(NameIDMap.prototype, {
        nameOf: function (id) {
            return this.names[id >> 4];
        },
        idOf: function (name) {
            return this.ids[name];
        },
        add: function (prefix, map) {
            var self = this;
            Object.keys(map).forEach(function (name) {
                var value = map[name];
                value.name = name;
                var prefixed = prefix + name;
                var id = value.id;
                self.names[id] = prefixed;
                self.ids[prefixed] = id;
                self.values[id] = self.values[prefixed] = value;
            });
        },
        get: function (id) {
            return this.values[id >> 4];
        }
    });
    MC.Blocks = new NameIDMap();

    MC.Blocks.add('minecraft:', {
        air: {
            id: 0
        },
        stone: {
            id: 1,
            solid: true
        },
        grass: {
            id: 2,
            solid: true
        },
        dirt: {
            id: 3,
            solid: true
        },
        cobblestone: {
            id: 4,
            solid: true
        },
        oak_planks: {
            id: 5,
            solid: true
        },
        sapling: {
            id: 6
        },
        bedrock: {
            id: 7,
            solid: true
        },
        flowing_water: {
            id: 8
        },
        water: {
            id: 9
        },
        flowing_lava: {
            id: 10
        },
        lava: {
            id: 11
        },
        sand: {
            id: 12,
            solid: true
        },
        gravel: {
            id: 13,
            solid: true
        },
        gold_ore: {
            id: 14,
            solid: true
        },
        iron_ore: {
            id: 15,
            solid: true
        },
        coal_ore: {
            id: 16,
            solid: true
        },
        log: {
            id: 17,
            solid: true
        },
        leaves: {
            id: 18,
            solid: true
        },
        sponge: {
            id: 19,
            solid: true
        },
        glass: {
            id: 20,
            solid: true
        },
        lapis_ore: {
            id: 21,
            solid: true
        },
        lapis_block: {
            id: 22,
            solid: true
        },
        dispenser: {
            id: 23,
            solid: true
        },
        sandstone: {
            id: 24,
            solid: true
        },
        noteblock: {
            id: 25,
            solid: true
        },
        bed: {
            id: 26
        },
        golden_rail: {
            id: 27
        },
        detector_rail: {
            id: 28
        },
        sticky_piston: {
            id: 29
        },
        web: {
            id: 30
        },
        tallgrass: {
            id: 31
        },
        deadbush: {
            id: 32
        },
        piston: {
            id: 33
        },
        piston_head: {
            id: 34
        },
        wool: {
            id: 35,
            solid: true
        },
        yellow_flower: {
            id: 37
        },
        red_flower: {
            id: 38
        },
        brown_mushroom: {
            id: 39
        },
        red_mushroom: {
            id: 40
        },
        gold_block: {
            id: 41,
            solid: true
        },
        iron_block: {
            id: 42,
            solid: true
        },
        double_stone_slab: {
            id: 43,
            solid: true
        },
        stone_slab: {
            id: 44
        },
        brick_block: {
            id: 45,
            solid: true
        },
        tnt: {
            id: 46,
            solid: true
        },
        bookshelf: {
            id: 47,
            solid: true
        },
        mossy_cobblestone: {
            id: 48,
            solid: true
        },
        obsidian: {
            id: 49,
            solid: true
        },
        torch: {
            id: 50
        },
        fire: {
            id: 51
        },
        mob_spawner: {
            id: 52,
            solid: true
        },
        oak_stairs: {
            id: 53
        },
        chest: {
            id: 54
        },
        redstone_wire: {
            id: 55
        },
        diamond_ore: {
            id: 56,
            solid: true
        },
        diamond_block: {
            id: 57,
            solid: true
        },
        crafting_table: {
            id: 58,
            solid: true
        },
        wheat: {
            id: 59
        },
        farmland: {
            id: 60
        },
        furnace: {
            id: 61,
            solid: true
        },
        lit_furnace: {
            id: 62,
            solid: true
        },
        standing_sign: {
            id: 63
        },
        wooden_door: {
            id: 64
        },
        ladder: {
            id: 65
        },
        rail: {
            id: 66
        },
        stone_stairs: {
            id: 67
        },
        wall_sign: {
            id: 68
        },
        lever: {
            id: 69
        },
        stone_pressure_plate: {
            id: 70
        },
        iron_door: {
            id: 71
        },
        wooden_pressure_plate: {
            id: 72
        },
        redstone_ore: {
            id: 73,
            solid: true
        },
        lit_redstone_ore: {
            id: 74,
            solid: true
        },
        unlit_redstone_torch: {
            id: 75
        },
        redstone_torch: {
            id: 76
        },
        stone_button: {
            id: 77
        },
        snow_layer: {
            id: 78
        },
        ice: {
            id: 79,
            solid: true
        },
        snow: {
            id: 80,
            solid: true
        },
        cactus: {
            id: 81
        },
        clay: {
            id: 82,
            solid: true
        },
        reeds: {
            id: 83
        },
        jukebox: {
            id: 84,
            solid: true
        },
        fence: {
            id: 85
        },
        pumpkin: {
            id: 86,
            solid: true
        },
        netherrack: {
            id: 87,
            solid: true
        },
        soul_sand: {
            id: 88
        },
        glowstone: {
            id: 89,
            solid: true
        },
        portal: {
            id: 90
        },
        lit_pumpkin: {
            id: 91,
            solid: true
        },
        cake: {
            id: 92
        },
        unpowered_repeater: {
            id: 93
        },
        powered_repeater: {
            id: 94
        },
        stained_glass: {
            id: 95,
            solid: true
        },
        trapdoor: {
            id: 96
        },
        monster_egg: {
            id: 97
        },
        stonebrick: {
            id: 98,
            solid: true
        },
        /*stonebrick: {
            id: 99
        },
        stonebrick: {
            id: 100
        }, TODO*/
        iron_bars: {
            id: 101
        },
        glass_pane: {
            id: 102
        },
        melon_block: {
            id: 103,
            solid: true
        },
        pumpkin_stem: {
            id: 104
        },
        melon_stem: {
            id: 105
        },
        vine: {
            id: 106
        },
        fence_gate: {
            id: 107
        },
        brick_stairs: {
            id: 108
        },
        stone_brick_stairs: {
            id: 109
        },
        mycelium: {
            id: 110,
            solid: true
        },
        waterlily: {
            id: 111
        },
        nether_brick: {
            id: 112,
            solid: true
        },
        nether_brick_fence: {
            id: 113
        },
        nether_brick_stairs: {
            id: 114
        },
        nether_wart: {
            id: 115
        },
        enchanting_table: {
            id: 116
        },
        brewing_stand: {
            id: 117
        },
        cauldron: {
            id: 118
        },
        end_portal: {
            id: 119
        },
        end_portal_frame: {
            id: 120
        },
        end_stone: {
            id: 121,
            solid: true
        },
        dragon_egg: {
            id: 122
        },
        redstone_lamp: {
            id: 123,
            solid: true
        },
        lit_redstone_lamp: {
            id: 124,
            solid: true
        },
        double_wooden_slab: {
            id: 125,
            solid: true
        },
        wooden_slab: {
            id: 126
        },
        cocoa: {
            id: 127
        },
        sandstone_stairs: {
            id: 128
        },
        emerald_ore: {
            id: 129,
            solid: true
        },
        ender_chest: {
            id: 130
        },
        tripwire_hook: {
            id: 131
        },
        /*tripwire_hook:132 TODO,*/
        emerald_block: {
            id: 133,
            solid: true
        },
        spruce_stairs: {
            id: 134
        },
        birch_stairs: {
            id: 135
        },
        jungle_stairs: {
            id: 136
        },
        command_block: {
            id: 137,
            solid: true
        },
        beacon: {
            id: 138,
            solid: true
        },
        cobblestone_wall: {
            id: 139
        },
        flower_pot: {
            id: 140
        },
        carrots: {
            id: 141
        },
        potatoes: {
            id: 142
        },
        wooden_button: {
            id: 143
        },
        skull: {
            id: 144
        },
        anvil: {
            id: 145
        },
        trapped_chest: {
            id: 146
        },
        light_weighted_pressure_plate: {
            id: 147
        },
        heavy_weighted_pressure_plate: {
            id: 148
        },
        unpowered_comparator: {
            id: 149
        },
        powered_comparator: {
            id: 150
        },
        daylight_detector: {
            id: 151
        },
        redstone_block: {
            id: 152,
            solid: true
        },
        quartz_ore: {
            id: 153,
            solid: true
        },
        hopper: {
            id: 154
        },
        quartz_block: {
            id: 155,
            solid: true
        },
        quartz_stairs: {
            id: 156
        },
        activator_rail: {
            id: 157
        },
        dropper: {
            id: 158,
            solid: true
        },
        stained_hardened_clay: {
            id: 159,
            solid: true
        },
        stained_glass_pane: {
            id: 160
        },
        leaves2: {
            id: 161,
            solid: true
        },
        logs2: {
            id: 162,
            solid: true
        },
        acacia_stairs: {
            id: 163
        },
        dark_oak_stairs: {
            id: 164
        },
        slime: {
            id: 165,
            solid: true
        },
        barrier: {
            id: 166
        },
        iron_trapdoor: {
            id: 167
        },
        prismarine: {
            id: 168,
            solid: true
        },
        sea_lantern: {
            id: 169,
            solid: true
        },
        hay_block: {
            id: 170,
            solid: true
        },
        carpet: {
            id: 171
        },
        hardened_clay: {
            id: 172,
            solid: true
        },
        coal_block: {
            id: 173,
            solid: true
        },
        packed_ice: {
            id: 174,
            solid: true
        },
        double_plant: {
            id: 175
        }
    });
    //mc.Blocks.add('minecraft:', {iron_shovel:256,iron_pickaxe:257,iron_axe:258,flint_and_steel:259,apple:260,bow:261,arrow:262,coal:263,diamond:264,iron_ingot:265,gold_ingot:266,iron_sword:267,wooden_sword:268,wooden_shovel:269,wooden_pickaxe:270,wooden_axe:271,stone_sword:272,stone_shovel:273,stone_pickaxe:274,stone_axe:275,diamond_sword:276,diamond_shovel:277,diamond_pickaxe:278,diamond_axe:279,stick:280,bowl:281,mushroom_stew:282,golden_sword:283,golden_shovel:284,golden_pickaxe:285,golden_axe:286,string:287,feather:288,gunpowder:289,wooden_hoe:290,stone_hoe:291,iron_hoe:292,diamond_hoe:293,golden_hoe:294,wheat_seeds:295,wheat:296,bread:297,leather_helmet:298,leather_chestplate:299,leather_leggings:300,leather_boots:301,chainmail_helmet:302,chainmail_chestplate:303,chainmail_leggings:304,chainmail_boots:305,iron_helmet:306,iron_chestplate:307,iron_leggings:308,iron_boots:309,diamond_helmet:310,diamond_chestplate:311,diamond_leggings:312,diamond_boots:313,golden_helmet:314,golden_chestplate:315,golden_leggings:316,golden_boots:317,/*flint_and_steel:318,*/porkchop:319,cooked_porkchop:320,painting:321,golden_apple:322,sign:323,wooden_door:324,bucket:325,water_bucket:326,lava_bucket:327,minecart:328,saddle:329,iron_door:330,redstone:331,snowball:332,boat:333,leather:334,milk_bucket:335,brick:336,clay_ball:337,reeds:338,paper:339,book:340,slime_ball:341,chest_minecart:342,furnace_minecart:343,egg:344,compass:345,fishing_rod:346,clock:347,glowstone_dust:348,fish:349,cooked_fish:350,dye:351,bone:352,sugar:353,cake:354,bed:355,repeater:356,cookie:357,filled_map:358,shears:359,melon:360,pumpkin_seeds:361,melon_seeds:362,beef:363,cooked_beef:364,chicken:365,cooked_chicken:366,rotten_flesh:367,ender_pearl:368,blaze_rod:369,ghast_tear:370,gold_nugget:371,nether_wart:372,potion:373,glass_bottle:374,spider_eye:375,fermented_spider_eye:376,blaze_powder:377,magma_cream:378,brewing_stand:379,cauldron:380,ender_eye:381,speckled_melon:382,experience_bottle:384,fire_charge:385,writable_book:386,written_book:387,emerald:388,item_frame:389,flower_pot:390,carrot:391,potato:392,baked_potato:393,poisonous_potato:394,map:395,golden_carrot:396,skull:397,carrot_on_a_stick:398,nether_star:399,pumpkin_pie:400,fireworks:401,firework_charge:402,enchanted_book:403,comparator:404,netherbrick:405,quartz:406,tnt_minecart:407,hopper_minecart:408,prismarine_shard:409,prismarine_crystals:410,rabbit:411,cooked_rabbit:412,rabbit_stew:413,rabbit_foot:414,rabbit_hide:415,iron_horse_armor:417,golden_horse_armor:418,diamond_horse_armor:419,lead:420,name_tag:421,command_block_minecart:422,mutton:423,cooked_mutton:424,record_13:2256,record_cat:2257,record_blocks:2258,record_chirp:2259,record_far:2260,record_mall:2261,record_mellohi:2262,record_stal:2263,record_strad:2264,record_ward:2265,record_11:2266,record_wait:2267});

    MC.models = {
        cube: function (element, x, y, z, culled, f) {
            var faces = element.faces;
            var fr = {x: x + element.from.x, y: y + element.from.y, z: z + element.from.z};
            var to = {x: x + element.to.x, y: y + element.to.y, z: z + element.to.z};
            var c, a, b, d;
            if (faces.east && (faces.east.cullface ? !(culled >> 0 & 1) : true)) {
                a = (f.getBlockLight(x + 1, y,     z    ) +
                     f.getBlockLight(x + 1, y - 1, z    ) +
                     f.getBlockLight(x + 1, y,     z - 1) +
                     f.getBlockLight(x + 1, y - 1, z - 1)) / 4;
                b = (f.getBlockLight(x + 1, y,     z    ) +
                     f.getBlockLight(x + 1, y + 1, z    ) +
                     f.getBlockLight(x + 1, y,     z - 1) +
                     f.getBlockLight(x + 1, y + 1, z - 1)) / 4;
                c = (f.getBlockLight(x + 1, y,     z    ) +
                     f.getBlockLight(x + 1, y + 1, z    ) +
                     f.getBlockLight(x + 1, y,     z + 1) +
                     f.getBlockLight(x + 1, y + 1, z + 1)) / 4;
                d = (f.getBlockLight(x + 1, y,     z    ) +
                     f.getBlockLight(x + 1, y - 1, z    ) +
                     f.getBlockLight(x + 1, y,     z + 1) +
                     f.getBlockLight(x + 1, y - 1, z + 1)) / 4;
                f.squade(faces.east.uv,
                    to.x, fr.y, fr.z, a,
                    to.x, to.y, fr.z, b,
                    to.x, to.y, to.z, c,
                    to.x, fr.y, to.z, d);
            }
            if (faces.west && (faces.west.cullface ? !(culled >> 1 & 1) : true)) {
                a = (f.getBlockLight(x - 1, y,     z    ) +
                     f.getBlockLight(x - 1, y - 1, z    ) +
                     f.getBlockLight(x - 1, y,     z + 1) +
                     f.getBlockLight(x - 1, y - 1, z + 1)) / 4;
                b = (f.getBlockLight(x - 1, y,     z    ) +
                     f.getBlockLight(x - 1, y + 1, z    ) +
                     f.getBlockLight(x - 1, y,     z + 1) +
                     f.getBlockLight(x - 1, y + 1, z + 1)) / 4;
                c = (f.getBlockLight(x - 1, y,     z    ) +
                     f.getBlockLight(x - 1, y + 1, z    ) +
                     f.getBlockLight(x - 1, y,     z - 1) +
                     f.getBlockLight(x - 1, y + 1, z - 1)) / 4;
                d = (f.getBlockLight(x - 1, y,     z    ) +
                     f.getBlockLight(x - 1, y - 1, z    ) +
                     f.getBlockLight(x - 1, y,     z - 1) +
                     f.getBlockLight(x - 1, y - 1, z - 1)) / 4;
                f.squade(faces.west.uv,
                    fr.x, fr.y, to.z, a,
                    fr.x, to.y, to.z, b,
                    fr.x, to.y, fr.z, c,
                    fr.x, fr.y, fr.z, d);
            }
            if (faces.up && (faces.up.cullface ? !(culled >> 2 & 1) : true)) {
                a = (f.getBlockLight(x,     y + 1, z    ) +
                     f.getBlockLight(x - 1, y + 1, z    ) +
                     f.getBlockLight(x,     y + 1, z - 1) +
                     f.getBlockLight(x - 1, y + 1, z - 1)) / 4;
                b = (f.getBlockLight(x,     y + 1, z    ) +
                     f.getBlockLight(x - 1, y + 1, z    ) +
                     f.getBlockLight(x,     y + 1, z + 1) +
                     f.getBlockLight(x - 1, y + 1, z + 1)) / 4;
                c = (f.getBlockLight(x,     y + 1, z    ) +
                     f.getBlockLight(x + 1, y + 1, z    ) +
                     f.getBlockLight(x,     y + 1, z + 1) +
                     f.getBlockLight(x + 1, y + 1, z + 1)) / 4;
                d = (f.getBlockLight(x,     y + 1, z    ) +
                     f.getBlockLight(x + 1, y + 1, z    ) +
                     f.getBlockLight(x,     y + 1, z - 1) +
                     f.getBlockLight(x + 1, y + 1, z - 1)) / 4;
                f.squade(faces.up.uv,
                    fr.x, to.y, fr.z, a,
                    fr.x, to.y, to.z, b,
                    to.x, to.y, to.z, c,
                    to.x, to.y, fr.z, d);
            }
            if (faces.down && (faces.down.cullface ? !(culled >> 3 & 1) : true)) {
                a = (f.getBlockLight(x,     y - 1, z    ) +
                     f.getBlockLight(x + 1, y - 1, z    ) +
                     f.getBlockLight(x,     y - 1, z - 1) +
                     f.getBlockLight(x + 1, y - 1, z - 1)) / 4;
                b = (f.getBlockLight(x,     y - 1, z    ) +
                     f.getBlockLight(x + 1, y - 1, z    ) +
                     f.getBlockLight(x,     y - 1, z + 1) +
                     f.getBlockLight(x + 1, y - 1, z + 1)) / 4;
                c = (f.getBlockLight(x,     y - 1, z    ) +
                     f.getBlockLight(x - 1, y - 1, z    ) +
                     f.getBlockLight(x,     y - 1, z + 1) +
                     f.getBlockLight(x - 1, y - 1, z + 1)) / 4;
                d = (f.getBlockLight(x,     y - 1, z    ) +
                     f.getBlockLight(x - 1, y - 1, z    ) +
                     f.getBlockLight(x,     y - 1, z - 1) +
                     f.getBlockLight(x - 1, y - 1, z - 1)) / 4;
                f.squade(faces.down.uv,
                    to.x, fr.y, fr.z, a,
                    to.x, fr.y, to.z, b,
                    fr.x, fr.y, to.z, c,
                    fr.x, fr.y, fr.z, d);
            }
            if (faces.north && (faces.north.cullface ? !(culled >> 4 & 1) : true)) {
                a = (f.getBlockLight(x,     y,     z + 1) +
                     f.getBlockLight(x + 1, y,     z + 1) +
                     f.getBlockLight(x,     y - 1, z + 1) +
                     f.getBlockLight(x + 1, y - 1, z + 1)) / 4;
                b = (f.getBlockLight(x,     y,     z + 1) +
                     f.getBlockLight(x + 1, y,     z + 1) +
                     f.getBlockLight(x,     y + 1, z + 1) +
                     f.getBlockLight(x + 1, y + 1, z + 1)) / 4;
                c = (f.getBlockLight(x,     y,     z + 1) +
                     f.getBlockLight(x - 1, y,     z + 1) +
                     f.getBlockLight(x,     y + 1, z + 1) +
                     f.getBlockLight(x - 1, y + 1, z + 1)) / 4;
                d = (f.getBlockLight(x,     y,     z + 1) +
                     f.getBlockLight(x - 1, y,     z + 1) +
                     f.getBlockLight(x,     y - 1, z + 1) +
                     f.getBlockLight(x - 1, y - 1, z + 1)) / 4;
                f.squade(faces.north.uv,
                    to.x, fr.y, to.z, a,
                    to.x, to.y, to.z, b,
                    fr.x, to.y, to.z, c,
                    fr.x, fr.y, to.z, d);
            }
            if (faces.south && (faces.south.cullface ? !(culled >> 5 & 1) : true)) {
                a = (f.getBlockLight(x,     y,     z - 1) +
                     f.getBlockLight(x - 1, y,     z - 1) +
                     f.getBlockLight(x,     y - 1, z - 1) +
                     f.getBlockLight(x - 1, y - 1, z - 1)) / 4;
                b = (f.getBlockLight(x,     y,     z - 1) +
                     f.getBlockLight(x - 1, y,     z - 1) +
                     f.getBlockLight(x,     y + 1, z - 1) +
                     f.getBlockLight(x - 1, y + 1, z - 1)) / 4;
                c = (f.getBlockLight(x,     y,     z - 1) +
                     f.getBlockLight(x + 1, y,     z - 1) +
                     f.getBlockLight(x,     y + 1, z - 1) +
                     f.getBlockLight(x + 1, y + 1, z - 1)) / 4;
                d = (f.getBlockLight(x,     y,     z - 1) +
                     f.getBlockLight(x + 1, y,     z - 1) +
                     f.getBlockLight(x,     y - 1, z - 1) +
                     f.getBlockLight(x + 1, y - 1, z - 1)) / 4;
                f.squade(faces.south.uv,
                    fr.x, fr.y, fr.z, a,
                    fr.x, to.y, fr.z, b,
                    to.x, to.y, fr.z, c,
                    to.x, fr.y, fr.z, d);
            }
        }
    };
    MC.draw = function (block, x, y, z, culled, f) {
        block = MC.Blocks.nameOf(block);

        var blockstate = config.blockStates[block];
        if (!blockstate) {
            return;
        }
        var variants = Object.keys(blockstate.variants);
        var i = variants[Math.random() * variants.length | 0];
        var state = config.blockStates[block].variants[i];

        if (Array.isArray(state)) {
            state = state[Math.random() * state.length | 0];
            //state = state[0];
        }

        var model = config.models['minecraft:block/' + state.model];
        if (!model) {
            return;
        }
        var elements = model.elements;
        for (var e = 0; e < elements.length; e++) {
            if (!elements[e].type || elements[e].type === 'cube') {
                MC.models.cube(elements[e], x, y, z, culled, f);
            } else {
                // TODO
            }
        }
    };
}) (self.MC || (MC = {}));
