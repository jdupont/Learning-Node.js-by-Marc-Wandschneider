const http = require('http');
const fs = require('fs');

const headers = { 'Content-Type': 'application/json' };

function load_album_list(callback) {
  fs.readdir(
    'albums',
    function (err, files) {
      if (err) {
        callback(err);
        return;
      }

      let only_dirs = [];
      (function iterator(index) {
        if (index === files.length) {
          callback(null, only_dirs);
          return;
        }

        fs.stat(
          `albums/${files[index]}`,
          function (err, stats) {
            if (err) {
              callback(err);
              return;
            }

            if (stats.isDirectory()) {
              only_dirs.push(files[index]);
            }
            iterator(index + 1);
          }
        );
      })(0);
    }
  );
}

function handle_incoming_request(req, res) {
  console.log(`Incoming Request: ${req.method} ${req.url}`);
  load_album_list(function(err, albums){
    if (err) {
      res.writeHead(503, headers);
      res.end(JSON.stringify(err));
      return;
    }

    const out = {
      error: null,
      data: { albums: albums },
    };
    res.writeHead(200, headers);
    res.end(JSON.stringify(out));
  });
}

const server = http.createServer(handle_incoming_request);
server.listen(8080);
