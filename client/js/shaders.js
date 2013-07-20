mc.shaders = {};
mc.shaders.terrain = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
        THREE.ShaderLib['lambert'].uniforms,
        {
            color: {type: 'c', value: new THREE.Color(0x1abf00)}
        }]),
    //vertexShader: syncLoad('shaders/grass.vert'),
    //fragmentShader: syncLoad('shaders/grass.frag'),
    vertexShader: [
        '#define LAMBERT',
        'varying vec3 vLightFront;',
        '#ifdef DOUBLE_SIDED',
            'varying vec3 vLightBack;',
        '#endif',
        THREE.ShaderChunk[ 'map_pars_vertex' ],
        THREE.ShaderChunk[ 'lightmap_pars_vertex' ],
        THREE.ShaderChunk[ 'envmap_pars_vertex' ],
        THREE.ShaderChunk[ 'lights_lambert_pars_vertex' ],
        THREE.ShaderChunk[ 'color_pars_vertex' ],
        THREE.ShaderChunk[ 'morphtarget_pars_vertex' ],
        THREE.ShaderChunk[ 'skinning_pars_vertex' ],
        THREE.ShaderChunk[ 'shadowmap_pars_vertex' ],

        'void main() {',
            THREE.ShaderChunk[ 'map_vertex' ],
            THREE.ShaderChunk[ 'lightmap_vertex' ],
            THREE.ShaderChunk[ 'color_vertex' ],

            THREE.ShaderChunk[ 'morphnormal_vertex' ],
            THREE.ShaderChunk[ 'skinbase_vertex' ],
            THREE.ShaderChunk[ 'skinnormal_vertex' ],
            THREE.ShaderChunk[ 'defaultnormal_vertex' ],

            THREE.ShaderChunk[ 'morphtarget_vertex' ],
            THREE.ShaderChunk[ 'skinning_vertex' ],
            THREE.ShaderChunk[ 'default_vertex' ],

            THREE.ShaderChunk[ 'worldpos_vertex' ],
            THREE.ShaderChunk[ 'envmap_vertex' ],
            THREE.ShaderChunk[ 'lights_lambert_vertex' ],
            THREE.ShaderChunk[ 'shadowmap_vertex' ],
        '}'
    ].join('\n'),
    fragmentShader: [
        'uniform vec3 color;',
        'uniform float opacity;',
        'varying vec3 vLightFront;',
        '#ifdef DOUBLE_SIDED',
            'varying vec3 vLightBack;',
        '#endif',

        THREE.ShaderChunk[ 'color_pars_fragment' ],
        THREE.ShaderChunk[ 'map_pars_fragment' ],
        THREE.ShaderChunk[ 'lightmap_pars_fragment' ],
        THREE.ShaderChunk[ 'envmap_pars_fragment' ],
        THREE.ShaderChunk[ 'fog_pars_fragment' ],
        THREE.ShaderChunk[ 'shadowmap_pars_fragment' ],
        THREE.ShaderChunk[ 'specularmap_pars_fragment' ],

        'void main() {',
            'gl_FragColor = vec4( vec3 ( 1.0 ), opacity );',

            THREE.ShaderChunk[ 'map_fragment' ],

            'gl_FragColor = mix(gl_FragColor, vec4(color, 1.0), 0.5);',

            THREE.ShaderChunk[ 'alphatest_fragment' ],
            THREE.ShaderChunk[ 'specularmap_fragment' ],

            '#ifdef DOUBLE_SIDED',

                //'float isFront = float( gl_FrontFacing );',
                //'gl_FragColor.xyz *= isFront * vLightFront + ( 1.0 - isFront ) * vLightBack;',

                'if ( gl_FrontFacing )',
                    'gl_FragColor.xyz *= vLightFront;',
                'else',
                    'gl_FragColor.xyz *= vLightBack;',

            '#else',

                'gl_FragColor.xyz *= vLightFront;',

            '#endif',

            THREE.ShaderChunk[ 'lightmap_fragment' ],
            THREE.ShaderChunk[ 'color_fragment' ],
            THREE.ShaderChunk[ 'envmap_fragment' ],
            THREE.ShaderChunk[ 'shadowmap_fragment' ],

            THREE.ShaderChunk[ 'linear_to_gamma_fragment' ],

            THREE.ShaderChunk[ 'fog_fragment' ],
        '}'
    ].join('\n'),
    lights: true,
    fog: true,
    map: true
});
