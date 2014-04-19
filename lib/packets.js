var C = require('./construct.js');

var T = {
    String: C.Adapter(C.Bytes(C.UBInt16()), {
        encode: function (obj) {
            return new Buffer(obj).toString();
        },
        decode: function (obj) {
            return new Uint8Array(new Buffer(obj));
        }
    }),
    Slot: function (name) {
        return {
            name: name,
            build: function (stream, value, ctx) {
            },
            parse: function (stream, ctx) {
                var slot = {};
                slot.id = stream.int16();
                if (slot.id === -1) {
                    return slot;
                }
                slot.count = stream.uint8();
                slot.damage = stream.uint16();
                var size = stream.uint16();
                if (size === -1) {
                    return slot;
                }
                slot.nbt = new Buffer(size);
                for (var i = 0; i < size; i++) {
                    slot.nbt[i] = stream.uint8();
                }
                return slot;
            }
        };
    },
    Metadata: function (name) {
        return {
            name: name,
            build: function (stream, value, ctx) {
            },
            parse: function (stream, ctx) {
                console.log(JSON.stringify([].slice.call(stream.view.buffer)))
                var data = {};
                while (true) {
                    var b = stream.uint8();
                    if (b === 0x7f) {
                        break;
                    }
                    var index = b & 0x1f;
                    switch (b >> 5) {
                    case 0:
                        data[index] = stream.uint8();
                        break;
                    case 1:
                        data[index] = stream.uint16();
                        break;
                    case 2:
                        data[index] = stream.uint32();
                        break;
                    case 3:
                        data[index] = stream.float32();
                        break;
                    case 4:
                        data[index] = T.String({}).parse(stream);
                        break;
                    case 5:
                        data[index] = T.Slot().parse(stream);
                        break;
                    case 6:
                        data[index] = {
                            x: stream.int32(),
                            y: stream.int32(),
                            z: stream.int32()
                        };
                        break;
                    }
                }
                return data;
            }
        };
    }
};

var packets = {
    KeepAlive: C.Struct([
        C.SBInt32('id')
    ]),
    LoginRequest: C.Struct([
        C.SBInt32('entityID'),
        T.String('levelType', {}),
        C.SBInt8('gameMode'),
        C.SBInt8('dimension'),
        C.UBInt8('difficulty'),
        C.UBInt8(),
        C.UBInt8('maxPlayers')
    ]),
    Handshake: C.Struct([
        C.UBInt8('version'),
        T.String('name', {}),
        T.String('host', {}),
        C.UBInt32('port')
    ]),
    TimeUpdate: C.Struct([
        C.UBInt64('age'),
        C.UBInt64('time')
    ]),
    SpawnPosition: C.Struct([
        C.UBInt32('x'),
        C.UBInt32('x'),
        C.UBInt32('y')
    ]),
    PlayerPositionAndLook: C.Struct([
        C.BFloat64('x'),
        C.BFloat64('stance'),
        C.BFloat64('y'),
        C.BFloat64('z'),
        C.BFloat32('yaw'),
        C.BFloat32('pitch'),
        C.Boolean('onGround')
    ]),
    HeldItemChange: C.Struct([
        C.UBInt16('slot')
    ]),
    EntityMetadata: C.Struct([
        C.UBInt32('entity'),
        T.Metadata('metadata')
    ]),
    MapChunkBulk: C.Struct([
        C.UBInt16('count'),
        C.UBInt32('size'),
        C.Boolean('skyLight'),
        C.Bytes('data', function () {
            return this.size;
        }),
        C.Array('meta', C.Struct([
            C.SBInt32('x'),
            C.SBInt32('z'),
            C.UBInt16('bitmapPrimary'),
            C.UBInt16('bitmapAdd')
        ]), function () {
            return this.count;
        })
    ]),
    ChangeGameState: C.Struct([
        C.UBInt8('reason'),
        C.UBInt8('gameMode')
    ]),
    SetSlot: C.Struct([
        C.UBInt8('window'),
        C.UBInt16('slot'),
        T.Slot('item')
    ]),
    SetWindowItems: C.Struct([
        C.UBInt8('window'),
        C.Array('slots', T.Slot(), C.UBInt16())
    ]),
    PlayerListItem: C.Struct([
        T.String('name', {}),
        C.Boolean('host'),
        C.UBInt16('ping')
    ]),
    PlayerAbilities: C.Struct([
        C.UBInt8('flags'),
        C.BFloat32('speedFlying'),
        C.BFloat32('speedWalking')
    ]),
    ClientStatus: C.Struct([
        C.UBInt32('data')
    ]),
    PluginMessage: C.Struct([
        T.String('channel', {}),
        C.Bytes('data', C.UBInt16())
    ]),
    EncryptionKeyResponse: C.Struct([
        C.Bytes('secret', C.UBInt16()),
        C.Bytes('token', C.UBInt16())
    ]),
    EncryptionKeyRequest: C.Struct([
        T.String('id', {}),
        C.Bytes('key', C.UBInt16()),
        C.Bytes('token', C.UBInt16())
    ]),
    Kick: C.Struct([
        T.String('reason', {})
    ])
};

var packet = C.Struct([
    C.Enum('type', C.UBInt8(), {
        0x00: 'KeepAlive',
        0x01: 'LoginRequest',
        0x02: 'Handshake',
        0x04: 'TimeUpdate',
        0x06: 'SpawnPosition',
        0x0d: 'PlayerPositionAndLook',
        0x10: 'HeldItemChange',
        0x28: 'EntityMetadata',
        0x2c: 'EntityProperties',
        0x38: 'MapChunkBulk',
        0x46: 'ChangeGameState',
        0x67: 'SetSlot',
        0x68: 'SetWindowItems',
        0xc9: 'PlayerListItem',
        0xca: 'PlayerAbilities',
        0xcd: 'ClientStatus',
        0xfa: 'PluginMessage',
        0xfc: 'EncryptionKeyResponse',
        0xfd: 'EncryptionKeyRequest',
        0xff: 'Kick'
    }),
    C.Switch('packet', function () {
        return this.type;
    }, packets)
]);

exports.build = function (value) {
    var ws = new C.WriteStream();
    packet.build(ws, value);
    return new Buffer(ws.bytes());
};
exports.parse = function (data) {
    var s = new C.ReadStream(data);
    return {
        packet: packet.parse(s),
        size: s.index
    }
};