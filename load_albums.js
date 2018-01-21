const http = require('http');
const fs = require('fs');

const headers = { 'Content-Type': 'application/json' };

function load_album_list(callback) {
  fs.readdir('albums', (err, files) => {
    if (err) {
       callback(make_error('file_error',  JSON.stringify(err)));
       return;
    }

    let only_dirs = [];

    const iterator = (index) => {
       if (index === files.length) {
           callback(null, only_dirs);
           return;
       }

       fs.stat(`albums/${files[index]}`, (err, stats) => {
           if (err) {
               callback(make_error('file_error', JSON.stringify(err)));
               return;
           }
           if (stats.isDirectory()) {
               only_dirs.push({ name: files[index] });
           }
           iterator(index + 1)
       });

    }
    iterator(0);
  });
}

function load_album(album_name, callback) {
  fs.readdir(`albums/${album_name}`, (err, files) => {
    if (err) {
      if (err.code === 'ENOENT') {
        callback(no_such_album());
      } else {
        callback(make_error('file_error', JSON.stringify(err)));
      }
      return;
    }

    let only_files = [];
    const path = `albums/${album_name}/`;

    const iterator = (index) => {
      if (index === files.length) {
        const obj = { short_name: album_name, photos: only_files };
        callback(null, obj);
        return;
      }

      fs.stat(`${path}${files[index]}`, (err, stats) => {
        if (err) {
          callback(make_error('file_error', JSON.stringify(err)));
          return;
        }
        if (stats.isFile()) {
          const obj = { filename: files[index], desc: files[index] };
          only_files.push(obj);
        }
        iterator(index + 1)
      });
    };
    iterator(0);
  });
}

function handle_incoming_request(req, res) {
  console.log(`INCOMING REQUEST: ${req.method} ${req.url}`);
  if (req.url === '/albums.json') {
    handle_list_albums(req, res);
  } else if (req.url.substr(0, 7) === '/albums' && req.url.substr(req.url.length - 5) === '.json') {
    handle_get_album(req, res);
  } else {
    send_failure(res, 404, invalid_resource());
  }
}

function handle_list_albums(req, res) {
  load_album_list((err, albums) => {
    if (err) {
      send_failure(res, 500, err);
      return;
    }

    send_success(res, { albums: albums });
  });
}

function handle_get_album(req, res) {
  const album_name = req.url.substr(7, req.url.length - 12);
  load_album(album_name, (err, album_contents) => {
    if (err && err.error === 'no_such_album') {
      send_failure(res, 404, err);
    }  else if (err) {
      send_failure(res, 500, err);
    } else {
      send_success(res, { album_data: album_contents });
    }
  });
}

function make_error(err, msg) {
  let e = new Error(msg);
  e.code = err;
  return e;
}

function send_success(res, data) {
  res.writeHead(200, headers);
  let output = { error: null, data: data };
  res.end(JSON.stringify(output));
}

function send_failure(res, server_code, err) {
  const code = (err.code) ? err.code : err.name;
  res.writeHead(server_code, headers);
  res.end(JSON.stringify({ error: code, message: err.message }));
}

function invalid_resource() {
  return make_error('invalid_resource', 'The requested resource does not exist.');
}

function no_such_album() {
  return make_error('no_such_album', 'The specified album does not exist.');
}

const server = http.createServer(handle_incoming_request);
server.listen(8080);
