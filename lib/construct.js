(function (C) {
    C.Build = function (obj, stream, ctx, value) {
        if (typeof obj === 'function') {
            // TODO: Oh what TODO?
            //return obj.apply(ctx, [].slice.call(arguments, 3));
        } else if (obj.parse && obj.build) {
            return obj.build(stream, value, ctx);
        } else {
            return obj;
        }
    };
    C.Parse = function (obj, stream, ctx) {
        if (typeof obj === 'function') {
            return obj.apply(ctx, [].slice.call(arguments, 3));
        } else if (obj.parse && obj.build) {
            return obj.parse(stream, ctx);
        } else {
            return obj;
        }
    };
    C.ReadStream = function (data) {
        if (data instanceof ArrayBuffer) {
            this.buffer = buffer;
        } else if (data.buffer && data.buffer instanceof ArrayBuffer) {
            this.buffer = data.buffer;
        } else if (Array.isArray(data)) {
            this.buffer = new Uint8Array(data).buffer;
        } else if ((typeof Buffer === 'function') && Buffer.isBuffer(data)) {
            this.buffer = data;
        } else {
            throw new TypeError('data must be an ArrayBuffer, typed array, or array');
        }
        this.view = new DataView(this.buffer);
        this.index = 0;
    };
    C.ReadStream.prototype = {
        int8: function (endian) {var i = this.view.getInt8(this.index, endian); this.index += 1; return i;},
        uint8: function (endian) {var i = this.view.getUint8(this.index, endian); this.index += 1; return i;},
        int16: function (endian) {var i = this.view.getInt16(this.index, endian); this.index += 2; return i;},
        uint16: function (endian) {var i = this.view.getUint16(this.index, endian); this.index += 2; return i;},
        int32: function (endian) {var i = this.view.getInt32(this.index, endian); this.index += 4; return i;},
        uint32: function (endian) {var i = this.view.getUint32(this.index, endian); this.index += 4; return i;},
        int64: function (endian) {
            var v = this.uint64(endian);
            return v < 0x8000000000000000 ? v : v - 0x10000000000000000;
        },
        uint64: function (endian) {
            var a = this.uint32(endian);
            var b = this.uint32(endian);
            return endian ? (b * 0x100000000 + a) : (a * 0x100000000 + b);
        },
        float32: function (endian) {var i = this.view.getFloat32(this.index, endian); this.index += 4; return i;},
        float64: function (endian) {var i = this.view.getFloat64(this.index, endian); this.index += 8; return i;},
        array: function (type, length) {return new type(this.buffer.slice(this.index += length * type.BYTES_PER_ELEMENT, this.index));}
    };
    C.WriteStream = function (initialSize) {
        initialSize = initialSize || 1;
        this.array = new Uint8Array(initialSize);
        this.view = new DataView(this.array.buffer);
        this.allocated = initialSize;
        this.index = 0;
    };
    C.WriteStream.prototype = {
        allocate: function (size) {
            if (size + this.index < this.allocated) {
                return;
            }
            var total = size + this.index;
            while (this.allocated < total) {
                this.allocated <<= 1;
            }
            var newArray = new Uint8Array(this.allocated);
            newArray.set(this.array, 0);
            this.array = newArray;
            this.view = new DataView(this.array.buffer);
        },
        int8: function (n, endian) {this.allocate(1); this.view.setInt8(this.index, n, endian); this.index += 1;},
        uint8: function (n, endian) {this.allocate(1); this.view.setUint8(this.index, n, endian); this.index += 1;},
        int16: function (n, endian) {this.allocate(2); this.view.setInt16(this.index, n, endian); this.index += 2;},
        uint16: function (n, endian) {this.allocate(2); this.view.setUint16(this.index, n, endian); this.index += 2;},
        int32: function (n, endian) {this.allocate(4); this.view.setInt32(this.index, n, endian); this.index += 4;},
        uint32: function (n, endian) {this.allocate(4); this.view.setUint32(this.index, n, endian); this.index += 4;},
        int64: function (n, endian) {
            this.uint64(n > 0 ? n + 0x10000000000000000 : n);
        },
        uint64: function (n, endian) {
            var a = endian ? n : n / 0x100000000;
            var b = endian ? n / 0x100000000 : n;
            this.uint32(a, endian);
            this.uint32(b, endian);
        },
        float32: function (n, endian) {this.allocate(4); this.view.setFloat32(this.index, n, endian); this.index += 4;},
        float64: function (n, endian) {this.allocate(8); this.view.setFloat64(this.index, n, endian); this.index += 8;},
        array: function (array) {
            /*this.allocate(array.length * array.BYTES_PER_ELEMENT);
            for (var i = 0; i < array.length; i++) {
                this.uint8(array[i]);
            }*/
        },
        bytes: function () {
            return new Uint8Array(this.array.buffer, 0, this.index);
        }
    };
    function native(type, littleEndian) {
        return function (name, value) {
            return {
                type: type,
                name: name,
                value: value,
                build: function (stream, value, ctx) {
                    stream[this.type](this.value ? C.Build(this.value, ctx, stream, value) : value, littleEndian);
                },
                parse: function (stream, ctx) {
                    return stream[this.type](littleEndian);
                }
            };
        };
    }
    var natives = [
        ['UBInt8', 'uint8', false],
        ['UBInt16', 'uint16', false],
        ['UBInt32', 'uint32', false],
        ['UBInt64', 'uint64', false],
        ['SBInt8', 'int8', false],
        ['SBInt16', 'int16', false],
        ['SBInt32', 'int32', false],
        ['SBInt64', 'int64', false],
        ['ULInt8', 'uint8', true],
        ['ULInt16', 'uint16', true],
        ['ULInt32', 'uint32', true],
        ['ULInt64', 'uint64', true],
        ['SLInt8', 'int8', true],
        ['SLInt16', 'int16', true],
        ['SLInt32', 'int32', true],
        ['SLInt64', 'int64', true],
        ['BFloat32', 'float32', false],
        ['LFloat32', 'float32', true],
        ['BFloat64', 'float64', false],
        ['LFloat64', 'float64', true]
    ];
    var i = natives.length;
    while (i--) {
        var n = natives[i];
        C[n[0]] = native(n[1], n[2]);
    }
    C.Field = function (name) {
        return {
            name: name
        };
    };
    C.Path = function (path) {
        return {
            path: path,
            encode: function () {
                //TODO
            },
            decode: function () {
                //TODO
            }
        };
    };
    C.Boolean = function (name) {
        return {
            name: name,
            build: function (stream, value) {
                stream.uint8(value ? 1 : 0);
            },
            parse: function (stream) {
                return !!stream.uint8();
            }
        }
    };
    C.Adapter = function (type, methods) {
        return function (name, params) {
            if (arguments.length < 2) {
                params = name;
                name = undefined;
            }
            var obj = {
                name: name,
                type: type,
                encode: methods.encode,
                decode: methods.decode,
                build: function (stream, value) {
                    this.type.build(stream, this.encode(value));
                },
                parse: function (stream) {
                    return this.decode(this.type.parse(stream));
                }
            };
            if (methods.init) {
                methods.init.call(obj, params);
            }
            return obj;
        }
    };
    C.Struct = function (name, types) {
        if (arguments.length < 2) {
            types = name;
            name = undefined;
        }
        return {
            name: name,
            types: types,
            setField: function (name, type) {
                type.name = name;
                for (var i = 0; i < this.types.length; ++i) {
                    if (this.types[i].name === name) {
                        this.types[i] = type;
                    }
                }
            },
            build: function (stream, value) {
                for (var i = 0; i < this.types.length; ++i) {
                    var type = this.types[i];
                    type.build(stream, value[type.name], value);
                }
            },
            parse: function (stream) {
                var value = Object.create(null);
                for (var i = 0; i < this.types.length; ++i) {
                    var type = this.types[i];
                    var v = type.parse(stream, value);
                    if (type.name) {
                        value[type.name] = v;
                    }
                }
                return value;
            }
        };
    };
    C.String = function (name, length) {
        if (arguments.length < 2) {
            length = name;
            name = undefined;
        }
        return {
            name: name,
            length: length,
            build: function (stream, value) {
                for (var n = 0; n < value.length; n++) {
                    var c = value.charCodeAt(n);
                    if (c < 128) {
                        stream.uint8(c);
                    } else if((c > 127) && (c < 2048)) {
                        stream.uint8((c >> 6) | 192);
                        stream.uint8((c & 63) | 128);
                    } else {
                        stream.uint8((c >> 12) | 224);
                        stream.uint8(((c >> 6) & 63) | 128);
                        stream.uint8((c & 63) | 128);
                    }
                }
            },
            parse: function (stream, ctx) {
                var value = '';
                var i = 0;
                var l = C.Parse(this.length, stream, ctx);
                while (i < l) {
                    var c = stream.uint8();
                    if (c < 128) {
                        value += String.fromCharCode(c);
                        i++;
                    } else if((c > 191) && (c < 224)) {
                        value += String.fromCharCode(((c & 31) << 6) | (stream.uint8() & 63));
                        i += 2;
                    } else {
                        value += String.fromCharCode(((c & 15) << 12) | ((stream.uint8() & 63) << 6) | (stream.uint8() & 63));
                        i += 3;
                    }
                }
                return value;
            }
        };
    };
    C.PascalString = C.Adapter(C.Struct([
            C.Field('length'),
            C.String('string', function () {
                return this.length;
            })
        ]), {
        init: function (params) {
            this.type.setField('length', params.length);
        },
        encode: function (obj) {
            return {
                length: obj.length,
                string: obj
            };
        },
        decode: function (obj) {
            return obj.string;
        }
    });
    C.Bytes = function (name, length) {
        if (arguments.length < 2) {
            length = name;
            name = undefined;
        }
        return {
            name: name,
            length: length,
            build: function (stream, value, ctx) {
                C.Build(this.length, stream, ctx, value.length);
                for (var i = 0; i < value.length; ++i) {
                    stream.uint8(value[i]);
                }
            },
            parse: function (stream, ctx) {
                var l = C.Parse(this.length, stream, ctx);
                var a = new Uint8Array(l);
                for (var i = 0; i < l; ++i) {
                    a[i] = stream.uint8();
                }
                return a;
            }
        };
    };
    C.Array = function (name, type, length) {
        if (arguments.length < 3) {
            type = name;
            length = type;
            name = undefined;
        }
        return {
            name: name,
            type: type,
            length: length,
            build: function (stream, value, ctx) {
                C.Build(this.length, stream, ctx, value.length);
                for (var i = 0; i < value.length; ++i) {
                    this.type.build(stream, value[i]);
                }
            },
            parse: function (stream, ctx) {
                var l = C.Parse(this.length, stream, ctx);
                var a = [];
                for (var i = 0; i < l; ++i) {
                    a[i] = this.type.parse(stream, ctx);
                }
                return a;
            }
        };
    };
    C.Enum = function (name, type, values) {
        if (arguments.length < 3) {
            type = name;
            values = type;
            name = undefined;
        }
        return {
            name: name,
            type: type,
            values: values,
            build: function (stream, value) {
                for (var key in this.values) {
                    if (value === this.values[key]) {
                        this.type.build(stream, Number(key));
                        return;
                    }
                }
                throw new Error('Invalid value: ' + value);
            },
            parse: function (stream, ctx) {
                var value = this.type.parse(stream, ctx);
                if (!this.values[value]) {
                    throw new Error('Invalid value: ' + value);
                }
                return this.values[value];
            }
        };
    };
    C.Switch = function (name, which, types) {
        if (arguments.length < 3) {
            which = name;
            types = which;
            name = undefined;
        }
        return {
            name: name,
            which: which,
            types: types,
            build: function (stream, value, ctx) {
                return this.types[C.Parse(this.which, stream, ctx)].build(stream, value, ctx);
            },
            parse: function (stream, ctx) {
                return this.types[C.Parse(this.which, stream, ctx)].parse(stream, ctx);
            }
        };
    };
}) (typeof exports !== 'undefined' ? module.exports = {} : C = {});