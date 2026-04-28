const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');

const root = process.cwd();
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'viniplay-smoke-'));
const dataDir = path.join(tmpRoot, 'data');
const dvrDir = path.join(tmpRoot, 'dvr');

let child;
let done = false;
let logs = '';

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

function cleanupTempDirs() {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch (error) {
    console.error(`Failed to remove smoke temp directory ${tmpRoot}: ${error.message}`);
  }
}

function finish(code, message) {
  if (done) return;
  done = true;
  clearTimeout(timeout);
  if (child && !child.killed) child.kill('SIGTERM');
  cleanupTempDirs();
  if (message) (code === 0 ? console.log : console.error)(message);
  setTimeout(() => process.exit(code), 100);
}

function requestNeedsSetup(port) {
  http.get(`http://127.0.0.1:${port}/api/auth/needs-setup`, (res) => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', chunk => { body += chunk; });
    res.on('end', () => {
      if (res.statusCode !== 200) return finish(1, `Expected 200 from needs-setup, got ${res.statusCode}: ${body}`);
      try {
        const parsed = JSON.parse(body);
        if (typeof parsed.needsSetup !== 'boolean') return finish(1, `Invalid needs-setup JSON: ${body}`);
      } catch (error) {
        return finish(1, `Invalid JSON from needs-setup: ${body}`);
      }
      if (!fs.existsSync(dataDir) || !fs.existsSync(dvrDir)) return finish(1, 'Temp data/dvr directories were not created');
      if (/FATAL|Initialization failed|SQLITE_ERROR/.test(logs)) return finish(1, `Startup logs contain errors:\n${logs}`);
      finish(0, 'Local startup smoke passed.');
    });
  }).on('error', error => finish(1, `HTTP smoke request failed: ${error.message}\n${logs}`));
}

const timeout = setTimeout(() => finish(1, `Timed out waiting for server startup. Logs:\n${logs}`), 25000);

getFreePort().then(port => {
  child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: {
      ...process.env,
      DATA_DIR: dataDir,
      DVR_DIR: dvrDir,
      PORT: String(port),
      SESSION_SECRET: 'smoke-test-secret'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', chunk => {
    const text = chunk.toString();
    logs += text;
    const match = text.match(/server listening at http:\/\/localhost:(\d+)/);
    if (match) requestNeedsSetup(Number(match[1]));
  });
  child.stderr.on('data', chunk => { logs += chunk.toString(); });
  child.on('exit', code => {
    if (!done) finish(1, `Server exited before smoke completed with code ${code}. Logs:\n${logs}`);
  });
}).catch(error => finish(1, `Could not allocate smoke test port: ${error.message}`));

process.on('SIGINT', () => finish(130));
process.on('SIGTERM', () => finish(143));
