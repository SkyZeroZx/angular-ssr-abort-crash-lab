// node tools/traffic.mjs <host> <port> <seconds> <visitors> <abort-every-ms> [host-header]
// <visitors> clients request GET / back to back for <seconds>. Meanwhile one attacker
// opens a request every <abort-every-ms> and closes it after 50 ms (0 = no attacker).
import { connect } from 'node:net';

const [host, port, seconds, visitors, abortEvery, hostHeader = `${process.argv[2]}:${process.argv[3]}`] =
  process.argv.slice(2);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const end = Date.now() + Number(seconds) * 1000;
const outcomes = new Map();
let attacks = 0;

function request() {
  return new Promise((resolve) => {
    const socket = connect(Number(port), host, () =>
      socket.write(`GET / HTTP/1.1\r\nHost: ${hostHeader}\r\nConnection: close\r\n\r\n`),
    );
    let answer = '';
    socket.setTimeout(10_000, () => socket.destroy(new Error('timeout')));
    socket.on('data', (chunk) => (answer += chunk));
    socket.on('end', () => resolve(answer.split(' ')[1] ?? 'empty'));
    socket.on('error', (error) => resolve(error.code ?? error.message));
  });
}

function abortedRequest() {
  const socket = connect(Number(port), host, () => {
    socket.write(`GET / HTTP/1.1\r\nHost: ${hostHeader}\r\n\r\n`);
    setTimeout(() => socket.destroy(), 50);
  });
  socket.on('error', () => {});
}

async function visitor() {
  while (Date.now() < end) {
    const outcome = await request();
    outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + 1);
    if (outcome !== '200') await sleep(100);
  }
}

async function attacker() {
  if (Number(abortEvery) <= 0) return;
  while (Date.now() < end) {
    abortedRequest();
    attacks++;
    await sleep(Number(abortEvery));
  }
}

await Promise.all([attacker(), ...Array.from({ length: Number(visitors) }, visitor)]);

const total = [...outcomes.values()].reduce((a, b) => a + b, 0);
const ok = outcomes.get('200') ?? 0;
console.log(`visitor requests   ${total}`);
console.log(`  answered 200     ${ok}  (${((100 * ok) / total).toFixed(1)} %)`);
for (const [outcome, count] of [...outcomes].filter(([o]) => o !== '200').sort((a, b) => b[1] - a[1])) {
  console.log(`  ${outcome.padEnd(16)} ${count}`);
}
console.log(`attacker requests  ${attacks}`);
