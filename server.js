var mc = require('minecraft-protocol'),
  express = require('express'),
  http = require('http'),
  path = require('path'),
  WebSocket = require('ws'),
  BSON = new (require('bson').BSONPure.BSON)();

class Server {
  constructor(port) {
    this.app = express();
    this.app.use(express.static(path.resolve('.')));

    this.httpServer = http.createServer(this.app);

    this.wss = new WebSocket.Server({server: this.httpServer});
    this.wss.on('connection', ws => new ClientConnection(ws));
    this.httpServer.listen(port);
  }
}

class ClientConnection {
  constructor(ws) {
    this.ws = ws;
    this.session = null;
    this.mcserver = null;
    this.ws.on('message', data => {
      try {
        this.onmessage(data);
      } catch (e) {
        this.onerror(e);
      }
    });
  }
  onerror(err) {
    console.error(err);
    this.ws.end();
  }
  onmessage(data) {
    var message = BSON.deserialize(data);
    var packet = message.packet;
    var type = message.type;
    switch (type) {
      case 'authenticate':
        this.authenticate(packet);
        break;
      case 'refresh':
        this.refresh(packet);
        break;
      case 'connect':
        this.connect(packet);
        break;
      default:
        console.error('Unknown packet type ' + type);
    }
  }
  authenticate(packet) {
    mc.yggdrasil.getSession(packet.username, packet.password, mc.yggdrasil.generateUUID(), false, (err, session) => {
      this.session = session;
      ws.send(BSON.serialize({
        type: 'session',
        packet: {
          session: session,
          error: err
        }
      }));
    });
  }
  refresh(packet) {
    mc.yggdrasil.getSession(packet.username, packet.accessToken, packet.clientToken, true, (err, session) => {
      this.session = session;
      ws.send(BSON.serialize({
        type: 'session',
        packet: {
          session: session,
          error: err
        }
      }));
    });
  }
  connect(packet) {
    if (!this.session) {
      console.warn('Client has not authenticated');
    }
    packet.username = this.session ? this.session.selectedProfile.name : 'Player';
    packet.accessToken = this.session ? this.session.accessToken : '';
    packet.clientToken = this.session ? this.session.clientToken : '';
    this.mcserver = mc.createClient(packet);
    this.mcserver.on('end', () => {
      this.ws.close();
    });
    this.mcserver.on('error', err => {
      this.ws.close(); // TODO: Tell client that server doesn't exist
    });
    this.mcserver.on('packet', (packet, meta) => {
      if (this.ws.readyState !== this.ws.OPEN)
        return this.ws.close();
      var buffer = BSON.serialize({
        type: [meta.state, meta.name],
        packet: packet
      });
      this.ws.send(buffer);
    });
  }
}

new Server(process.env.PORT || 8080);
