var mc = require('minecraft-protocol'),
  express = require('express'),
  http = require('http'),
  path = require('path'),
  WebSocket = require('ws'),
  BSON = new (require('bson').BSONPure.BSON)();

var app = express();
app.use(express.static(path.resolve('.')));

var httpServer = http.createServer(app);

var wss = new WebSocket.Server({server: httpServer});
wss.on('connection', ws => {
  var session = null;
  ws.on('message', data => {
    try {
      var message = BSON.deserialize(data);
      var packet = message.packet;
      var type = message.type;
      if (type === 'authenticate') {
        mc.yggdrasil.getSession(packet.username, packet.password, mc.yggdrasil.generateUUID(), false, (err, ses) => {
          if (err) throw err;
          session = ses;
          ws.send(BSON.serialize({
            type: 'session',
            packet: {
              session: session,
              error: err
            }
          }));
        });
      } else if (type === 'refresh') {
        mc.yggdrasil.getSession(packet.username, packet.accessToken, packet.clientToken, true, (err, ses) => {
          if (err) throw err;
          session = ses;
          ws.send(BSON.serialize({
            type: 'session',
            packet: {
              session: session,
              error: err
            }
          }));
        });
      } else if (type === 'connect') {
        if (!session) {
          console.warn('Client has not authenticated');
        }
        packet.username = session ? session.selectedProfile.name : 'Player';
        packet.accessToken = session ? session.accessToken : '';
        packet.clientToken = session ? session.clientToken : '';
        var client = mc.createClient(packet);
        client.on('error', err => {
          ws.close(); // TODO: Tell client that server doesn't exist
        });
        client.on('state', state => {
          if (state === mc.states.PLAY) {
            new Proxy(client, ws);
          }
        });
      }
    } catch (e) {
      ws.close();
    }
  });
});
httpServer.listen(process.env.PORT || 8080);

class Proxy {
  constructor(server, client) {
    server.on('end', () => {
      client.close();
    });
    server.on('error', () => {
      client.close();
    });
    server.on('packet', (packet, meta) => {
      if (client.readyState !== client.OPEN)
        return client.close();
      var buffer = BSON.serialize({
        type: [meta.state, meta.name],
        packet: packet
      });
      client.send(buffer);
    });
  }
}
