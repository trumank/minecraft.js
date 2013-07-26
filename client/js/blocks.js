(function (obj) {
    obj.models = {
        cube: function (block, x, y, z, f) {
            var faces = block.faces;
            var i;
            if (!f.isBlockSolid(x + 1, y, z)) {
                i = faces[0];
                f.quad(f.vertex(x + 1, y, z, f.uvx(i, 0), f.uvy(i, 0)),
                    f.vertex(x + 1, y + 1, z, f.uvx(i, 1), f.uvy(i, 1)),
                    f.vertex(x + 1, y + 1, z + 1, f.uvx(i, 2), f.uvy(i, 2)),
                    f.vertex(x + 1, y, z + 1, f.uvx(i, 3), f.uvy(i, 3)));
            }
            if (!f.isBlockSolid(x - 1, y, z)) {
                i = faces[1];
                f.quad(f.vertex(x, y, z + 1, f.uvx(i, 0), f.uvy(i, 0)),
                    f.vertex(x, y + 1, z + 1, f.uvx(i, 1), f.uvy(i, 1)),
                    f.vertex(x, y + 1, z, f.uvx(i, 2), f.uvy(i, 2)),
                    f.vertex(x, y, z, f.uvx(i, 3), f.uvy(i, 3)));
            }
            if (!f.isBlockSolid(x, y + 1, z)) {
                i = faces[2];
                f.quad(f.vertex(x, y + 1, z, f.uvx(i, 0), f.uvy(i, 0)),
                    f.vertex(x, y + 1, z + 1, f.uvx(i, 1), f.uvy(i, 1)),
                    f.vertex(x + 1, y + 1, z + 1, f.uvx(i, 2), f.uvy(i, 2)),
                    f.vertex(x + 1, y + 1, z, f.uvx(i, 3), f.uvy(i, 3)));
            }
            if (!f.isBlockSolid(x, y - 1, z)) {
                i = faces[3];
                f.quad(f.vertex(x + 1, y, z, f.uvx(i, 0), f.uvy(i, 0)),
                    f.vertex(x + 1, y, z + 1, f.uvx(i, 1), f.uvy(i, 1)),
                    f.vertex(x, y, z + 1, f.uvx(i, 2), f.uvy(i, 2)),
                    f.vertex(x, y, z, f.uvx(i, 3), f.uvy(i, 3)));
            }
            if (!f.isBlockSolid(x, y, z + 1)) {
                i = faces[4];
                f.quad(f.vertex(x + 1, y, z + 1, f.uvx(i, 0), f.uvy(i, 0)),
                    f.vertex(x + 1, y + 1, z + 1, f.uvx(i, 1), f.uvy(i, 1)),
                    f.vertex(x, y + 1, z + 1, f.uvx(i, 2), f.uvy(i, 2)),
                    f.vertex(x, y, z + 1, f.uvx(i, 3), f.uvy(i, 3)));
            }
            if (!f.isBlockSolid(x, y, z - 1)) {
                i = faces[5];
                f.quad(f.vertex(x, y, z, f.uvx(i, 0), f.uvy(i, 0)),
                    f.vertex(x, y + 1, z, f.uvx(i, 1), f.uvy(i, 1)),
                    f.vertex(x + 1, y + 1, z, f.uvx(i, 2), f.uvy(i, 2)),
                    f.vertex(x + 1, y, z, f.uvx(i, 3), f.uvy(i, 3)));
            }
        },
        sprite: function (block, x, y, z, f) {
            var i = block.faces;
            var d = Math.sqrt(1/8);
            var mx = x + 0.5;
            var mz = z + 0.5;
            f.quad(f.vertex(mx + d, y, mz + d, f.uvx(i, 0), f.uvy(i, 0)),
                f.vertex(mx + d, y + 1, mz + d, f.uvx(i, 1), f.uvy(i, 1)),
                f.vertex(mx - d, y + 1, mz - d, f.uvx(i, 2), f.uvy(i, 2)),
                f.vertex(mx - d, y, mz - d, f.uvx(i, 3), f.uvy(i, 3)));
            f.quad(f.vertex(mx - d, y, mz - d, f.uvx(i, 3), f.uvy(i, 3)),
                f.vertex(mx - d, y + 1, mz - d, f.uvx(i, 2), f.uvy(i, 2)),
                f.vertex(mx + d, y + 1, mz + d, f.uvx(i, 1), f.uvy(i, 1)),
                f.vertex(mx + d, y, mz + d, f.uvx(i, 0), f.uvy(i, 0)));
            f.quad(f.vertex(mx + d, y, mz - d, f.uvx(i, 0), f.uvy(i, 0)),
                f.vertex(mx + d, y + 1, mz - d, f.uvx(i, 1), f.uvy(i, 1)),
                f.vertex(mx - d, y + 1, mz + d, f.uvx(i, 2), f.uvy(i, 2)),
                f.vertex(mx - d, y, mz + d, f.uvx(i, 3), f.uvy(i, 3)));
            f.quad(f.vertex(mx - d, y, mz + d, f.uvx(i, 3), f.uvy(i, 3)),
                f.vertex(mx - d, y + 1, mz + d, f.uvx(i, 2), f.uvy(i, 2)),
                f.vertex(mx + d, y + 1, mz - d, f.uvx(i, 1), f.uvy(i, 1)),
                f.vertex(mx + d, y, mz - d, f.uvx(i, 0), f.uvy(i, 0)));
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
            //solid: false
        },
        9: {
            name: 'water',
            faces: 223,
            //solid: false
        },
        10: {
            name: 'lava',
            faces: 255,
            //solid: false
        },
        11: {
            name: 'lava',
            faces: 255,
            //solid: false
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
            faces: 53
        },
        19: {
            name: 'sponge',
            faces: 48
        },
        20: {
            name: 'glass',
            faces: 49
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
            faces: 64
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
        // ...
        50: {
            name: 'torch',
            faces: 80,
            solid: false
        },
        // ...
        56: {
            name: 'diamond ore',
            faces: 50
        },
        // ...
        73: {
            name: 'redstone ore',
            faces: 51
        },
        74: {
            name: 'redstone ore',
            faces: 51
        }
    };

    Object.keys(obj.blocks).forEach(function (key) {
        var block = obj.blocks[key];
        block.solid = block.solid === false ? false : true;
        var f = block.faces;
        if (!block.model) {
            block.model = obj.models.cube;
            if (typeof f === 'number') {
                block.faces = [f, f, f, f, f, f];
            }
        }
    });
}) (self.mc ? mc : self);