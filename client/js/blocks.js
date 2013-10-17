(function (obj) {
    obj.models = {
        cube: function (block, metdata, x, y, z, f) {
            var faces = block.faces;
            var i, c, a, b, c, d;
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
            var i = block.faces;
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
            var i = block.faces;
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
            faces: 1
        },
        2: {
            name: 'grass',
            faces: [3, 3, 0, 2, 3, 3]
        },
        3: {
            name: 'dirt',
            faces: 2
        },
        4: {
            name: 'cobblestone',
            faces: 16
        },
        5: {
            name: 'plank',
            faces: 4
        },
        6: {
            name: 'sapling',
            faces: 15,
            solid: false
        },
        7: {
            name: 'bedrock',
            faces: 17
        },
        8: {
            name: 'water',
            faces: 223,
            solid: false,
            model: obj.models.liquid
        },
        9: {
            name: 'water',
            faces: 223,
            solid: false,
            model: obj.models.liquid
        },
        10: {
            name: 'lava',
            faces: 255,
            solid: false,
            model: obj.models.liquid
        },
        11: {
            name: 'lava',
            faces: 255,
            solid: false,
            model: obj.models.liquid
        },
        12: {
            name: 'sand',
            faces: 18
        },
        13: {
            name: 'gravel',
            faces: 19
        },
        14: {
            name: 'gold ore',
            faces: 32
        },
        15: {
            name: 'iron ore',
            faces: 33
        },
        16: {
            name: 'coal ore',
            faces: 34
        },
        17: {
            name: 'wood',
            faces: [20, 20, 21, 21, 20, 20]
        },
        18: {
            name: 'leaves',
            faces: [53, 133, 53, 197],
            model: obj.models.typed
        },
        19: {
            name: 'sponge',
            faces: 48
        },
        20: {
            name: 'glass',
            faces: 49,
            transparent: true
        },
        21: {
            name: 'lapis ore',
            faces: 160
        },
        22: {
            name: 'lapis block',
            faces: 144
        },
        23: {
            name: 'dispenser',
            faces: 46
        },
        24: {
            name: 'sand stone',
            faces: [192, 192, 176, 208, 192, 192]
        },
        25: {
            name: 'note block',
            faces: [74, 74, 75, 74, 74, 74]
        },
        // ...
        30: {
            name: 'web',
            faces: 11,
            solid: false,
            model: obj.models.sprite
        },
        31: {
            name: 'tall grass',
            faces: 39,
            solid: false,
            model: obj.models.sprite
        },
        32: {
            name: 'dead bush',
            faces: 55,
            solid: false,
            model: obj.models.sprite
        },
        // ...
        35: {
            name: 'wool',
            faces: [64, 210, 194, 178, 162, 146, 130, 114, 225, 209, 193, 177, 161, 145, 129, 113]
        },
        // ...
        37: {
            name: 'dandelion',
            faces: 13,
            solid: false,
            model: obj.models.sprite
        },
        38: {
            name: 'rose',
            faces: 12,
            solid: false,
            model: obj.models.sprite
        },
        39: {
            name: 'brown mushroom',
            faces: 29,
            solid: false,
            model: obj.models.sprite
        },
        40: {
            name: 'red mushroom',
            faces: 28,
            solid: false,
            model: obj.models.sprite
        },
        41: {
            name: 'gold block',
            faces: 23
        },
        42: {
            name: 'iron block',
            faces: 22
        },
        // ...
        45: {
            name: 'brick',
            faces: 7
        },
        46: {
            name: 'tnt',
            faces: 8
        },
        47: {
            name: 'book shelf',
            faces: [35, 35, 4, 4, 35, 35]
        },
        48: {
            name: 'mossy cobblestone',
            faces: 36
        },
        49: {
            name: 'obsidian',
            faces: 37
        },
        50: {
            name: 'torch',
            faces: 80,
            solid: false
        },
        51: {
            name: 'fire',
            faces: 31,
            solid: false
        },
        52: {
            name: 'spawner',
            faces: 65,
            transparent: true
        },
        // ...
        56: {
            name: 'diamond ore',
            faces: 50
        },
        57: {
            name: 'diamond block',
            faces: 24
        },
        58: {
            name: 'crafting table',
            faces: [59, 59, 43, 4, 60, 60]
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
        98: {
            name: 'stone brick',
            faces: 54
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
            if (typeof f === 'number') {
                block.faces = [f, f, f, f, f, f];
            }
        } else if (block.model === obj.models.typed) {
            for (var i = 0; i < block.faces.length; i++) {
                f = block.faces[i];
                if (typeof f === 'number') {
                    block.faces[i] = [f, f, f, f, f, f];
                }
            }
        }
    });
}) (self.mc ? mc : self);