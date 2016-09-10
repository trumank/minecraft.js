var mc = require('minecraft-protocol'),
  yggdrasil = require('yggdrasil')({}),
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
    this.ws.close();
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
    yggdrasil.auth({
      user: packet.username,
      pass: packet.password
    }, (err, session) => {
      this.ws.send(BSON.serialize({
        type: 'session',
        packet: {
          session: session,
          error: err
        }
      }));
    });
  }
  refresh(packet) {
    yggdrasil.refresh(packet.accessToken, packet.clientToken, (err, accessToken, session) => {
      this.ws.send(BSON.serialize({
        type: 'session',
        packet: {
          session: session,
          error: err
        }
      }));
    });
  }
  connect(packet) {
    if (!packet.session) {
      console.warn('Client has not authenticated');
    }
    this.mcserver = mc.createClient({
      host: packet.host,
      port: packet.port,
      session: packet.session,
      username: packet.username
    });
    this.ws.on('close', () => {
      this.mcserver.end();
    });
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
