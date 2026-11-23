import { createServer } from 'node:http';

// /api/users/alice exists, any other user is a 404. Everything else answers as before.
createServer((req, res) => {
  setTimeout(() => {
    const user = req.url.match(/^\/api\/users\/([^/?]+)/)?.[1];
    const found = !user || user === 'alice';
    res.writeHead(found ? 200 : 404, { 'content-type': 'application/json' });
    res.end(found ? '{"name":"Alice"}' : '{"error":"not found"}');
  }, 100);
}).listen(4400, () => console.log('api on 4400'));
