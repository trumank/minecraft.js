var net = require('net');
    crypto = require('crypto'),
    ursa = require('ursa'),
    util = require('util'),
    events = require('events'),
    http = require('http'),
    Packet = require('./packets');

function connect(host, port, name, session, cb) {
    var socket = net.connect(port, host, function (err) {
        if (err) {
            return null;
        } else {
            cb(new Client(socket, host, port, name, session));
        }
    });
}

function javaHash(hash) {
    var buffer = new Buffer(hash.digest(), 'binary');
    var sign = '';
    if (buffer.readUInt8(0) > 127) {
        sign = '-';
        var c = true;
        for (var i = buffer.length - 1; i >= 0; --i) {
            var v = ~buffer.readUInt8(i) & 0xff;
            buffer.writeUInt8(v + (c ? 1 : 0) & 0xff, i)
            c = v === 0xff;
        }
    }
    return sign + buffer.toString('hex').replace(/^0+/, '');
}

function Client(socket, host, port, name, session) {
    events.EventEmitter.call(this);
    this.socket = socket;
    this.encrypted = false;

    var self = this;
    var stream = new Buffer(0);
    socket.on('data', function (data) {
        console.log(data);
        stream = Buffer.concat([stream, self.encrypted ? new Buffer(self.decipher.update(data), 'binary') : data]);
        while (true) {
            var packet;
            try {
                packet = Packet.parse(stream);
            } catch (e) {
                if (e.message === 'byteOffset out of range.' || e.message === 'Index out of range.') {
                    console.log('incomplete packet: ' + e.message);
                } else {
                    throw e;
                }
                return;
            }
            stream = stream.slice(packet.size);
            packet = packet.packet;
            console.log('<<< ' + packet.type);
            self.emit(packet.type, packet.packet);
            if (stream.length === 0) {
                return;
            }
        }
    });
    socket.on('end', function () {
        console.log('socket closed');
    });
    this.once('EncryptionKeyRequest', function (packet) {
        crypto.randomBytes(16, function (err, secret) {
            var hash = crypto.createHash('sha1');
            hash.update(packet.id);
            hash.update(secret);
            hash.update(packet.key);
            http.get({
                hostname: 'session.minecraft.net',
                path: '/game/joinserver.jsp?user=' + name + '&sessionId=' + session + '&serverId=' + javaHash(hash)
            }, function (res) {
                res.on('end', function () {
                    var key = ursa.createPublicKey('-----BEGIN PUBLIC KEY-----\n' + new Buffer(packet.key).toString('base64').match(/.{1,65}/g).join('\n') + '\n-----END PUBLIC KEY-----\n', 'utf8');
                    self.once('EncryptionKeyResponse', function (packet) {
                        self.encrypt(secret);
                        self.send('ClientStatus', {
                            data: 0
                        });
                    });
                    self.send('EncryptionKeyResponse', {
                        secret: key.encrypt(secret, undefined, undefined, ursa.RSA_PKCS1_PADDING),
                        token: key.encrypt(packet.token, undefined, undefined, ursa.RSA_PKCS1_PADDING)
                    });
                });
            });
        });
    });

    this.on('KeepAlive', function (packet) {
        this.send('KeepAlive', packet);
    });
    this.on('EntityMetadata', function (packet) {
        console.log(packet);
    })
    this.send('Handshake', {
        host: host,
        port: port,
        name: name,
        version: Client.version
    });
}

util.inherits(Client, events.EventEmitter);

Client.version = 78;

Client.prototype.send = function (type, packet) {
    var data = Packet.build({
        type: type,
        packet: packet
    });
    //console.log(JSON.stringify([].slice.call(data)));
    this.socket.write(this.encrypted ? new Buffer(this.cipher.update(data), 'binary') : data);
    console.log('>>> ' + type);
};

Client.prototype.encrypt = function (secret) {
    this.cipher = crypto.createCipheriv('aes-128-cfb8', secret, secret);
    this.decipher = crypto.createDecipheriv('aes-128-cfb8', secret, secret);
    this.encrypted = true;
}

connect('localhost', 25565, 'Revesilia', '1f3251fe1ea1493591b5845b5d659ea4', function (client) {
    client.on('Kick', function (packet) {
        console.log(packet.reason);
    })
});