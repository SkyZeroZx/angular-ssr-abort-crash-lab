import { createServer } from 'node:http';

createServer((req, res) => {
  setTimeout(() => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"name":"Alice"}');
  }, 100);
}).listen(4400, () => console.log('api on 4400'));
