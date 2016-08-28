var https = require('https');
var fs = require('fs');
var unzip = require('unzip2');
var archiver = require('archiver');

try {
  fs.mkdirSync('resourcepacks');
} catch (e) {}

var path = 'resourcepacks/resourcepack.zip';

var archive = archiver('zip', {store: true});
var output = fs.createWriteStream(path, {flags: 'w'});
archive.pipe(output);

https.get('https://launcher.mojang.com/mc/game/1.8.8/client/0983f08be6a4e624f5d85689d1aca869ed99c738/client.jar', response => {
  response.pipe(unzip.Parse()).on('entry', entry => {
    if (/^assets\/.*$/.test(entry.path)) {
      if (entry.type === 'Directory') {
        archive.directory();
      } else {
        archive.append(entry, {name: entry.path});
      }
    } else {
      entry.autodrain();
    }
  }).on('close', () => {
    archive.finalize();
  });
});
