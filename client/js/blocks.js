(function (obj) {
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
        // ...
        37: {
            name: 'dandelion',
            faces: 13,
            solid: false
        },
        38: {
            name: 'rose',
            faces: 12,
            solid: false
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
        if (typeof f === 'number') {
            block.faces = [f, f, f, f, f, f];
        }
    });
}) (self.mc ? mc.models : self);