// `npm run doctor` - checks the things that most often stop the app from showing up. No dependencies.
const fs = require('fs');
const net = require('net');
const path = require('path');

const root = path.join(__dirname, '..');
const ok = (m) => console.log(`  [ OK ] ${m}`);
const bad = (m, fix) => { problems++; console.log(`  [FAIL] ${m}\n         -> ${fix}`); };
let problems = 0;

const env = {};
const envFile = path.join(root, 'server', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2];
  }
}
const PORT = Number(env.PORT || process.env.PORT || 5000);
const MONGO = env.MONGO_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/greenfield_cms';

const portFree = (port) => new Promise((res) => {
  const s = net.createServer();
  s.once('error', (e) => res(e.code));
  s.once('listening', () => s.close(() => res(null)));
  s.listen(port);
});
const tcp = (host, port) => new Promise((res) => {
  const s = net.connect({ host, port, timeout: 3000 });
  s.once('connect', () => { s.destroy(); res(true); });
  s.once('error', () => res(false));
  s.once('timeout', () => { s.destroy(); res(false); });
});

(async () => {
  console.log('\nGreenfield CMS - environment check\n');

  const major = Number(process.versions.node.split('.')[0]);
  major >= 18 ? ok(`Node ${process.versions.node}`) : bad(`Node ${process.versions.node} is too old`, 'Install the LTS version from https://nodejs.org (18 or newer), then run again');

  fs.existsSync(path.join(root, 'server', 'node_modules', 'express')) ? ok('Server packages installed') : bad('Server packages are missing', 'Run: npm run setup');
  fs.existsSync(path.join(root, 'client', 'dist', 'index.html')) ? ok('UI is built (client/dist)') : bad('UI is not built', 'Run: npm run setup   (or: npm run build)');

  const pe = await portFree(PORT);
  if (!pe) ok(`Port ${PORT} is free`);
  else bad(`Port ${PORT} is not available (${pe})`, `Close the program using it, or create server/.env with PORT=5050 and open http://localhost:5050`);

  if (/^mongodb\+srv:/.test(MONGO)) {
    ok('MongoDB Atlas URI configured (connection is tested when the server starts)');
  } else {
    const m = MONGO.match(/^mongodb:\/\/(?:[^@/]*@)?([^/:,]+)(?::(\d+))?/);
    const host = m ? m[1] : '127.0.0.1';
    const port = m && m[2] ? Number(m[2]) : 27017;
    (await tcp(host, port))
      ? ok(`MongoDB is reachable at ${host}:${port}`)
      : bad(`MongoDB is NOT reachable at ${host}:${port}`, 'Install MongoDB Community and start it (Windows: Services -> MongoDB Server -> Start), or put a free MongoDB Atlas connection string in server/.env as MONGO_URI=...');
  }

  console.log(problems ? `\n${problems} problem(s) found. Fix them, then run: npm start\n` : `\nAll good. Run: npm start   then open http://localhost:${PORT}\n`);
  process.exit(problems ? 1 : 0);
})();
