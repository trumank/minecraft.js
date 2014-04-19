(function (obj) {
    obj.models = {
        cube: function (block, metdata, x, y, z, f) {
            var faces = block.faces;
            var c, a, b, c, d;
            if (!f.isBlockOpaque(x + 1, y, z)) {
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
                f.squad(faces[0],
                    x + 1, y,     z,     a,
                    x + 1, y + 1, z,     b,
                    x + 1, y + 1, z + 1, c,
                    x + 1, y,     z + 1, d);
            }
            if (!f.isBlockOpaque(x - 1, y, z)) {
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
                f.squad(faces[1],
                    x, y,     z + 1, a,
                    x, y + 1, z + 1, b,
                    x, y + 1, z,     c,
                    x, y,     z,     d);
            }
            if (!f.isBlockOpaque(x, y + 1, z)) {
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
                f.squad(faces[2],
                    x,     y + 1, z,     a,
                    x,     y + 1, z + 1, b,
                    x + 1, y + 1, z + 1, c,
                    x + 1, y + 1, z,     d);
            }
            if (!f.isBlockOpaque(x, y - 1, z)) {
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
                f.squad(faces[3],
                    x + 1, y, z,     a,
                    x + 1, y, z + 1, b,
                    x,     y, z + 1, c,
                    x,     y, z,     d);
            }
            if (!f.isBlockOpaque(x, y, z + 1)) {
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
                f.squad(faces[4],
                    x + 1, y,     z + 1, a,
                    x + 1, y + 1, z + 1, b,
                    x,     y + 1, z + 1, c,
                    x,     y,     z + 1, d);
            }
            if (!f.isBlockOpaque(x, y, z - 1)) {
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
                f.squad(faces[5],
                    x,     y,     z, a,
                    x,     y + 1, z, b,
                    x + 1, y + 1, z, c,
                    x + 1, y,     z, d);
            }
        },
        typed: function (block, metadata, x, y, z, f) {
            obj.models.cube({
                faces: block.faces[metadata & 3]
            }, metadata, x, y, z, f);
        },
        sprite: function (block, metadata, x, y, z, f) {
            var i = f.index(block.faces);
            var d = Math.sqrt(1/8);
            var mx = x + 0.5;
            var mz = z + 0.5;
            var c = f.getBlockLight(x, y, z) / 12 + 0.2;
            f.quad(f.vertex(mx + d, y, mz + d, c, c, c, f.uvx(i, 0), f.uvy(i, 0)),
                f.vertex(mx + d, y + 1, mz + d, c, c, c, f.uvx(i, 1), f.uvy(i, 1)),
                f.vertex(mx - d, y + 1, mz - d, c, c, c, f.uvx(i, 2), f.uvy(i, 2)),
                f.vertex(mx - d, y, mz - d, c, c, c, f.uvx(i, 3), f.uvy(i, 3)));
            f.quad(f.vertex(mx - d, y, mz - d, c, c, c, f.uvx(i, 3), f.uvy(i, 3)),
                f.vertex(mx - d, y + 1, mz - d, c, c, c, f.uvx(i, 2), f.uvy(i, 2)),
                f.vertex(mx + d, y + 1, mz + d, c, c, c, f.uvx(i, 1), f.uvy(i, 1)),
                f.vertex(mx + d, y, mz + d, c, c, c, f.uvx(i, 0), f.uvy(i, 0)));
            f.quad(f.vertex(mx + d, y, mz - d, c, c, c, f.uvx(i, 0), f.uvy(i, 0)),
                f.vertex(mx + d, y + 1, mz - d, c, c, c, f.uvx(i, 1), f.uvy(i, 1)),
                f.vertex(mx - d, y + 1, mz + d, c, c, c, f.uvx(i, 2), f.uvy(i, 2)),
                f.vertex(mx - d, y, mz + d, c, c, c, f.uvx(i, 3), f.uvy(i, 3)));
            f.quad(f.vertex(mx - d, y, mz + d, c, c, c, f.uvx(i, 3), f.uvy(i, 3)),
                f.vertex(mx - d, y + 1, mz + d, c, c, c, f.uvx(i, 2), f.uvy(i, 2)),
                f.vertex(mx + d, y + 1, mz - d, c, c, c, f.uvx(i, 1), f.uvy(i, 1)),
                f.vertex(mx + d, y, mz - d, c, c, c, f.uvx(i, 0), f.uvy(i, 0)));
        },
        liquid: function (block, metadata, x, y, z, f) {
            var i = f.index(block.faces);
            var i, c;
            if (!f.isBlockOpaque(x + 1, y, z) && f.getBlock(x + 1, y, z) !== block.id) {
                c = f.getBlockLight(x + 1, y, z) / 12 + 0.2;
                f.quad(f.vertex(x + 1, y, z, c, c, c, f.uvx(i, 0), f.uvy(i, 0)),
                    f.vertex(x + 1, y + 1, z, c, c, c, f.uvx(i, 1), f.uvy(i, 1)),
                    f.vertex(x + 1, y + 1, z + 1, c, c, c, f.uvx(i, 2), f.uvy(i, 2)),
                    f.vertex(x + 1, y, z + 1, c, c, c, f.uvx(i, 3), f.uvy(i, 3)));
            }
            if (!f.isBlockOpaque(x - 1, y, z) && f.getBlock(x - 1, y, z) !== block.id) {
                c = f.getBlockLight(x - 1, y, z) / 12 + 0.2;
                f.quad(f.vertex(x, y, z + 1, c, c, c, f.uvx(i, 0), f.uvy(i, 0)),
                    f.vertex(x, y + 1, z + 1, c, c, c, f.uvx(i, 1), f.uvy(i, 1)),
                    f.vertex(x, y + 1, z, c, c, c, f.uvx(i, 2), f.uvy(i, 2)),
                    f.vertex(x, y, z, c, c, c, f.uvx(i, 3), f.uvy(i, 3)));
            }
            if (!f.isBlockOpaque(x, y + 1, z) && f.getBlock(x, y + 1, z) !== block.id) {
                c = f.getBlockLight(x, y + 1, z) / 12 + 0.2;
                f.quad(f.vertex(x, y + 1, z, c, c, c, f.uvx(i, 0), f.uvy(i, 0)),
                    f.vertex(x, y + 1, z + 1, c, c, c, f.uvx(i, 1), f.uvy(i, 1)),
                    f.vertex(x + 1, y + 1, z + 1, c, c, c, f.uvx(i, 2), f.uvy(i, 2)),
                    f.vertex(x + 1, y + 1, z, c, c, c, f.uvx(i, 3), f.uvy(i, 3)));
            }
            if (!f.isBlockOpaque(x, y - 1, z) && f.getBlock(x, y - 1, z) !== block.id) {
                c = f.getBlockLight(x, y - 1, z) / 12 + 0.2;
                f.quad(f.vertex(x + 1, y, z, c, c, c, f.uvx(i, 0), f.uvy(i, 0)),
                    f.vertex(x + 1, y, z + 1, c, c, c, f.uvx(i, 1), f.uvy(i, 1)),
                    f.vertex(x, y, z + 1, c, c, c, f.uvx(i, 2), f.uvy(i, 2)),
                    f.vertex(x, y, z, c, c, c, f.uvx(i, 3), f.uvy(i, 3)));
            }
            if (!f.isBlockOpaque(x, y, z + 1) && f.getBlock(x, y, z + 1) !== block.id) {
                c = f.getBlockLight(x, y, z + 1) / 12 + 0.2;
                f.quad(f.vertex(x + 1, y, z + 1, c, c, c, f.uvx(i, 0), f.uvy(i, 0)),
                    f.vertex(x + 1, y + 1, z + 1, c, c, c, f.uvx(i, 1), f.uvy(i, 1)),
                    f.vertex(x, y + 1, z + 1, c, c, c, f.uvx(i, 2), f.uvy(i, 2)),
                    f.vertex(x, y, z + 1, c, c, c, f.uvx(i, 3), f.uvy(i, 3)));
            }
            if (!f.isBlockOpaque(x, y, z - 1) && f.getBlock(x, y, z - 1) !== block.id) {
                c = f.getBlockLight(x, y, z - 1) / 12 + 0.2;
                f.quad(f.vertex(x, y, z, c, c, c, f.uvx(i, 0), f.uvy(i, 0)),
                    f.vertex(x, y + 1, z, c, c, c, f.uvx(i, 1), f.uvy(i, 1)),
                    f.vertex(x + 1, y + 1, z, c, c, c, f.uvx(i, 2), f.uvy(i, 2)),
                    f.vertex(x + 1, y, z, c, c, c, f.uvx(i, 3), f.uvy(i, 3)));
            }
        }
    };
    obj.blocks = {
        1: {
            name: 'stone',
            faces: 'stone'
        },
        2: {
            name: 'grass',
            faces: ['grass_side', 'grass_side', 'grass_top', 'dirt', 'grass_side', 'grass_side']
        },
        3: {
            name: 'dirt',
            faces: [
                ['dirt', 'dirt', 'dirt', 'dirt', 'dirt', 'dirt'],
                ['dirt', 'dirt', 'dirt', 'dirt', 'dirt', 'dirt'],
                ['dirt', 'dirt', 'dirt_podzol_top', 'dirt_podzol_side', 'dirt', 'dirt']
            ],
            model: function (block, metadata, x, y, z, f) {
                obj.models.cube({
                    faces: block.faces[metadata]
                }, metadata, x, y, z, f);
            }
        },
        4: {
            name: 'cobblestone',
            faces: 'cobblestone'
        },
        5: {
            name: 'plank',
            faces: [
                'planks_oak',
                'planks_spruce',
                'planks_birch',
                'planks_jungle',
                'planks_acacia',
                'planks_big_oak'
            ],
            model: function (block, metadata, x, y, z, f) {
                var face = block.faces[metadata];
                obj.models.cube({
                    faces: [face, face, face, face, face, face]
                }, metadata, x, y, z, f);
            }
        },
        6: {
            name: 'sapling',
            faces: [
                'sapling_oak',
                'sapling_spruce',
                'sapling_birch',
                'sapling_jungle',
                'sapling_acacia',
                'sapling_big_oak'
            ],
            solid: false,
            model: function (block, metadata, x, y, z, f) {
                obj.models.sprite({
                    faces: block.faces[metadata]
                }, metadata, x, y, z, f);
            }
        },
        7: {
            name: 'bedrock',
            faces: 'bedrock'
        },
        8: {
            name: 'water',
            faces: 'water_still', // TODO
            solid: false,
            model: obj.models.liquid
        },
        9: {
            name: 'water',
            faces: 'water_still', // TODO
            solid: false,
            model: obj.models.liquid
        },
        10: {
            name: 'lava',
            faces: 'lava_still', // TODO
            solid: false,
            model: obj.models.liquid
        },
        11: {
            name: 'lava',
            faces: 'lava_still', // TODO
            solid: false,
            model: obj.models.liquid
        },
        12: {
            name: 'sand',
            faces: ['sand', 'red_sand'],
            model: function (block, metadata, x, y, z, f) {
                var face = block.faces[metadata];
                obj.models.cube({
                    faces: [face, face, face, face, face, face]
                }, metadata, x, y, z, f);
            }
        },
        13: {
            name: 'gravel',
            faces: 'gravel'
        },
        14: {
            name: 'gold ore',
            faces: 'gold_ore'
        },
        15: {
            name: 'iron ore',
            faces: 'iron_ore'
        },
        16: {
            name: 'coal ore',
            faces: 'coal_ore'
        },
        17: {
            name: 'wood',
            faces: ['log_oak', 'log_oak', 'log_oak_top', 'log_oak_top', 'log_oak', 'log_oak'] // TODO
        },
        18: {
            name: 'leaves',
            faces: ['leaves_oak', 'leaves_spruce', 'leaves_birch', 'leaves_jungle'],
            model: obj.models.typed
        },
        19: {
            name: 'sponge',
            faces: 'sponge'
        },
        20: {
            name: 'glass',
            faces: 'glass',
            transparent: true
        },
        21: {
            name: 'lapis ore',
            faces: 'lapis_ore'
        },
        22: {
            name: 'lapis block',
            faces: 'lapis_block'
        },
        23: {
            name: 'dispenser',
            faces: 'dispenser_front_horizontal' // TODO
        },
        24: {
            name: 'sand stone',
            faces: ['sandstone_normal', 'sandstone_normal', 'sandstone_bottom', 'sandstone_top', 'sandstone_normal', 'sandstone_normal'] // TODO
        },
        25: {
            name: 'note block',
            faces: 'noteblock'
        },
        // ...
        30: {
            name: 'web',
            faces: 'web',
            solid: false,
            model: obj.models.sprite
        },
        31: {
            name: 'tall grass',
            faces: 'tallgrass',
            solid: false,
            model: obj.models.sprite
        },
        32: {
            name: 'dead bush',
            faces: 'deadbush',
            solid: false,
            model: obj.models.sprite
        },
        // ...
        35: {
            name: 'wool',
            faces: [
                'wool_colored_white',
                'wool_colored_orange',
                'wool_colored_magenta',
                'wool_colored_light_blue',
                'wool_colored_yellow',
                'wool_colored_lime',
                'wool_colored_pink',
                'wool_colored_gray',
                'wool_colored_silver',
                'wool_colored_cyan',
                'wool_colored_purple',
                'wool_colored_blue',
                'wool_colored_brown',
                'wool_colored_green',
                'wool_colored_red',
                'wool_colored_black'
            ],
            model: function (block, metadata, x, y, z, f) {
                var face = block.faces[metadata];
                obj.models.cube({
                    faces: [face, face, face, face, face, face]
                }, metadata, x, y, z, f);
            }
        },
        // ...
        37: {
            name: 'dandelion',
            faces: 'flower_dandelion',
            solid: false,
            model: obj.models.sprite
        },
        38: {
            name: 'rose',
            faces: 'flower_rose',
            solid: false,
            model: obj.models.sprite
        },
        39: {
            name: 'brown mushroom',
            faces: 'mushroom_block_skin_brown', // TODO
            solid: false,
            model: obj.models.sprite
        },
        40: {
            name: 'red mushroom',
            faces: 'mushroom_block_skin_red', // TODO
            solid: false,
            model: obj.models.sprite
        },
        41: {
            name: 'gold block',
            faces: 'gold_block'
        },
        42: {
            name: 'iron block',
            faces: 'iron_block'
        },
        // ...
        45: {
            name: 'brick',
            faces: 'brick'
        },
        46: {
            name: 'tnt',
            faces: ['tnt_side', 'tnt_side', 'tnt_bottom', 'tnt_top', 'tnt_side', 'tnt_side']
        },
        47: {
            name: 'book shelf',
            faces: ['bookshelf', 'bookshelf', 'planks_oak', 'planks_oak', 'bookshelf', 'bookshelf']
        },
        48: {
            name: 'mossy cobblestone',
            faces: 'cobblestone_mossy'
        },
        49: {
            name: 'obsidian',
            faces: 'obsidian'
        },
        50: {
            name: 'torch',
            faces: 'torch_on', // TODO
            solid: false
        },
        51: {
            name: 'fire',
            faces: 'fire_layer_0', // TODO
            solid: false
        },
        52: {
            name: 'spawner',
            faces: 'mob_spawner',
            transparent: true
        },
        // ...
        56: {
            name: 'diamond ore',
            faces: 'diamond_ore'
        },
        57: {
            name: 'diamond block',
            faces: 'diamond_block'
        },
        58: {
            name: 'crafting table',
            faces: ['crafting_table_front', 'crafting_table_side', 'crafting_table_top', 'plank_oak', 'crafting_table_front', 'crafting_table_side']
        },
        // ...
        60: {
            name: 'tilled dirt',
            faces: [2, 2, 87, 2, 2, 2]
        },
        61: {
            name: 'furnace',
            faces: [44, 45, 62, 62, 45, 45]
        },
        62: {
            name: 'furnace',
            faces: [61, 45, 62, 62, 45, 45]
        },
        // ...
        73: {
            name: 'redstone ore',
            faces: 51
        },
        74: {
            name: 'redstone ore',
            faces: 51
        },
        // ...
        95: {
            name: 'clay',
            faces: 'clay'
        },
        // ...
        98: {
            name: 'stone brick',
            faces: 'stonebrick' // TODO
        }
    };

    Object.keys(obj.blocks).forEach(function (key) {
        var block = obj.blocks[key];
        block.id = Number(key);
        block.solid = block.solid === false ? false : true;
        var f;
        if (!block.model) {
            block.model = obj.models.cube;
        }
        if (block.model === obj.models.cube) {
            f = block.faces;
            if (!Array.isArray(f)) {
                block.faces = [f, f, f, f, f, f];
            }
        } else if (block.model === obj.models.typed) {
            for (var i = 0; i < block.faces.length; i++) {
                f = block.faces[i];
                if (!Array.isArray(f)) {
                    block.faces[i] = [f, f, f, f, f, f];
                }
            }
        }
    });
}) (self.mc ? mc : self);
