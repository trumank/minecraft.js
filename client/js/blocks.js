function syncLoad(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send();
    return xhr.response;
}

mc.textures = {
    terrain: []
};
mc.materials = {};
mc.materials.terrain = {
    0: function (texture) {
        var shader = mc.shaders.terrain.clone();
        shader.uniforms.map.value = texture;
        shader.map = texture;
        return shader;
    },
    53: function (texture) {
        var shader = mc.shaders.terrain.clone();
        shader.uniforms.map.value = texture;
        shader.map = texture;
        return shader;
    }
};

(function () {
    var terrain = [];
    for (var i = 0; i < 256; i++) {
        var image = new Image();
        var texture = new THREE.Texture(image, new THREE.UVMapping(), THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.NearestFilter, THREE.LinearMipMapLinearFilter);
        image.onload = (function () {
            this.needsUpdate = true;
        }).bind(texture);

        mc.textures.terrain.push(texture);
        terrain.push(mc.materials.terrain[i] ? mc.materials.terrain[i](texture) : new THREE.MeshLambertMaterial({
            map: texture
            //transparent: true
        }));
    }
    mc.materials.terrain = terrain;
    
    terrain = new Image();
    terrain.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = terrain.width / 16;
        canvas.height = terrain.height / 16;
        var ctx = canvas.getContext('2d');
        for (var i = 0; i < 256; i++) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(terrain, (i % 16) * -16, (i % 16) - i);
            mc.textures.terrain[i].image.src = canvas.toDataURL();
        }
    };
    terrain.src = 'img/terrain.png';
}) ();

mc.models = {};
mc.models.blocks = {
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
        solid: false
    },
    9: {
        name: 'water',
        faces: 223,
        solid: false
    },
    10: {
        name: 'lava',
        faces: 255,
        solid: false
    },
    11: {
        name: 'lava',
        faces: 255,
        solid: false
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

Object.keys(mc.models.blocks).forEach(function (key) {
    var block = mc.models.blocks[key];
    block.solid = block.solid === false ? false : true;
    var f = block.faces;
    if (typeof f === 'number') {
        block.faces = [f, f, f, f, f, f];
    }
});
