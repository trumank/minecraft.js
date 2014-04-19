var mc = require('minecraft-protocol'),
    express = require('express'),
    http = require('http'),
    path = require('path');

var app = express();
app.configure(function () {
    //app.use(express.static(path.resolve('./resourcepack/'), {maxAge: 31557600000}));
    app.use(express.static(path.resolve('.')));
});
var httpServer = http.createServer(app);
require('socket.io').listen(httpServer, {log: false}).sockets.on('connection', function (socket) {
    var session = null;
    socket.on('auth', function (data) {
        /*mc.yggdrasil.getSession(data.username, data.password, mc.yggdrasil.generateUUID(), false, function (err, s) {
            if (err) {
                socket.emit('auth failed', {});
            } else {
                session = s;
                socket.emit('auth', session);
            }
        });*/
        session = {
            username: data.username,
            //password: data.password
        };
        socket.emit('auth', {});
    });
    socket.on('connect', function (data) {
        data.username = session.username;
        data.password = session.password;
        var client = mc.createClient(data);
        client.on('state', function (state) {
            if (state === mc.protocol.states.PLAY) {
                new Proxy(client, socket);
            }
        });
    });
});
httpServer.listen(process.env.PORT || 8080);

function hookServer(obj, cb) {
    var emit = obj.emit;
    obj.emit = function () {
        var args = [].slice.call(arguments);
        emit.apply(obj, args);
        cb.apply(null, args);
    };
}
function hookClient(obj, cb) {
    var $emit = obj.$emit;
    obj.$emit = function () {
        var args = [].slice.call(arguments);
        $emit.apply(obj, args);
        cb.apply(null, args);
    };
}

function Proxy(server, client) {
    //var log = require('fs').createWriteStream('log');
    //server.on('close')
    client.on('disconnect', function () {
        server.end();
    });
    server.on('end', function () {
        client.disconnect();
    });
    hookServer(server, function (e, data) {
        if (Array.isArray(e)) {
            //console.log('>>>', '0x' + e.toString(16));
            /*log.write(require('util').inspect({
                id: '0x' + e.toString(16),
                data: data
            }, {depth: null}) + '\n');*/
            client.emit(e, data);
        }
    });
    hookClient(client, function (e, data) {
        if (Array.isArray(e)) {
            //console.log('<<<', '0x' + e.toString(16));
            /*log.write(require('util').inspect({
                id: '0x' + e.toString(16),
                data: data
            }, {depth: null}) + '\n');*/
            server.write(e, data);
        }
    });
}
