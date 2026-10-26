// IdeaBank - local server
// Serves the UI and proxies requests to the Anthropic API so the browser
// never deals with CORS and the key never lives in page source.

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = Number(process.env.PORT) || 4321;
const PUBLIC_DIR = path.join(__dirname, 'public');
const CONFIG_DIR = path.join(os.homedir(), '.ideabank');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const SESSIONS_DIR = path.join(CONFIG_DIR, 'sessions');
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig(cfg) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

function json(res, code, data) {
  const payload = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req, limitBytes = 40 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limitBytes) {
        reject(new Error('Request too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const file = path.join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}

// --- API key handling -------------------------------------------------------

async function verifyKey(key) {
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': API_VERSION,
    },
    body: JSON.stringify({
      model: 'claude-haiku-5-5',
      max_tokens: 4,
      messages: [{ role: 'user', content: 'hi' }],
    }),
  });
  if (r.ok) return { ok: true };
  const detail = await r.text();
  let message = 'The Anthropic API rejected that key.';
  try {
    message = JSON.parse(detail).error.message || message;
  } catch (e) {
    /* keep the default message */
  }
  return { ok: false, status: r.status, message };
}

async function handleKey(req, res) {
  if (req.method === 'GET') {
    const cfg = readConfig();
    const key = process.env.ANTHROPIC_API_KEY || cfg.apiKey;
    json(res, 200, {
      hasKey: Boolean(key),
      source: process.env.ANTHROPIC_API_KEY ? 'env' : cfg.apiKey ? 'saved' : 'none',
      hint: key ? key.slice(0, 7) + '...' + key.slice(-4) : null,
      model: cfg.model || 'claude-opus-5',
      configFile: CONFIG_FILE,
    });
    return;
  }

  if (req.method === 'POST') {
    const data = await readBody(req, 64 * 1024);
    if (data.forget) {
      const cfg = readConfig();
      delete cfg.apiKey;
      writeConfig(cfg);
      json(res, 200, { ok: true, forgotten: true });
      return;
    }
    const key = String(data.apiKey || '').trim();
    if (!key.startsWith('sk-ant-')) {
      json(res, 400, { ok: false, message: 'That does not look like an Anthropic key - it should start with sk-ant-.' });
      return;
    }
    const check = await verifyKey(key);
    if (!check.ok) {
      json(res, 400, { ok: false, message: check.message });
      return;
    }
    const cfg = readConfig();
    cfg.apiKey = key;
    writeConfig(cfg);
    json(res, 200, { ok: true, configFile: CONFIG_FILE });
    return;
  }

  json(res, 405, { message: 'Method not allowed' });
}

async function handleModel(req, res) {
  const data = await readBody(req, 8 * 1024);
  const cfg = readConfig();
  cfg.model = String(data.model || 'claude-opus-5');
  writeConfig(cfg);
  json(res, 200, { ok: true, model: cfg.model });
}

// --- Brand profile ----------------------------------------------------------

// brand.local.js holds real brand material and is kept out of version control.
// Without it the app still runs, on the placeholder that ships with the repo.
function serveBrand(res) {
  const local = path.join(PUBLIC_DIR, 'brand.local.js');
  const example = path.join(PUBLIC_DIR, 'brand.example.js');
  const file = fs.existsSync(local) ? local : example;
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(200, { 'Content-Type': MIME['.js'] });
      res.end('window.BRAND_PROFILE = [];');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME['.js'], 'Cache-Control': 'no-store' });
    res.end(data);
  });
}

// --- Sessions (saved script runs, listed in the sidebar) --------------------

// Ids come off the wire, so they are checked before they ever touch a path.
const ID_OK = /^[A-Za-z0-9_-]{1,64}$/;
const sessionFile = (id) => path.join(SESSIONS_DIR, id + '.json');

function listSessions() {
  let names;
  try {
    names = fs.readdirSync(SESSIONS_DIR);
  } catch {
    return [];
  }
  const out = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    try {
      const rec = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, name), 'utf8'));
      out.push({ id: rec.id, title: rec.title, meta: rec.meta, created: rec.created });
    } catch {
      /* skip anything unreadable rather than failing the whole list */
    }
  }
  out.sort((a, b) => (b.created || 0) - (a.created || 0));
  return out;
}

async function handleSessions(req, res, pathname) {
  const id = pathname === '/api/sessions' ? null : decodeURIComponent(pathname.slice('/api/sessions/'.length));
  if (id !== null && !ID_OK.test(id)) {
    json(res, 400, { message: 'Bad session id.' });
    return;
  }

  if (req.method === 'GET' && id === null) {
    json(res, 200, { sessions: listSessions() });
    return;
  }

  if (req.method === 'GET') {
    try {
      json(res, 200, JSON.parse(fs.readFileSync(sessionFile(id), 'utf8')));
    } catch {
      json(res, 404, { message: 'No such session.' });
    }
    return;
  }

  if (req.method === 'POST' && id === null) {
    const data = await readBody(req);
    if (!ID_OK.test(String(data.id || ''))) {
      json(res, 400, { message: 'Bad session id.' });
      return;
    }
    const rec = {
      id: data.id,
      title: String(data.title || 'Untitled').slice(0, 200),
      meta: data.meta || {},
      brief: data.brief || {},
      markdown: String(data.markdown || ''),
      created: data.created || Date.now(),
    };
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    fs.writeFileSync(sessionFile(rec.id), JSON.stringify(rec, null, 2));
    json(res, 200, { ok: true, id: rec.id });
    return;
  }

  if (req.method === 'DELETE' && id !== null) {
    try {
      fs.unlinkSync(sessionFile(id));
    } catch {
      /* already gone is a fine outcome for a delete */
    }
    json(res, 200, { ok: true });
    return;
  }

  json(res, 405, { message: 'Method not allowed' });
}

// --- Chat proxy (streams the model's reply straight back to the page) -------

async function handleChat(req, res) {
  const cfg = readConfig();
  const key = process.env.ANTHROPIC_API_KEY || cfg.apiKey;
  if (!key) {
    json(res, 401, { message: 'No API key set yet.' });
    return;
  }

  const data = await readBody(req);
  const payload = {
    model: data.model || cfg.model || 'claude-opus-5',
    max_tokens: data.max_tokens || 8000,
    stream: true,
    messages: data.messages,
  };
  if (data.system) payload.system = data.system;

  let upstream;
  try {
    upstream = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    json(res, 502, { message: 'Could not reach the Anthropic API: ' + e.message });
    return;
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    let message = text;
    try {
      message = JSON.parse(text).error.message;
    } catch (e) {
      /* fall back to the raw body */
    }
    json(res, upstream.status, { message });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const reader = upstream.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  } catch (e) {
    res.write('event: error\ndata: ' + JSON.stringify({ message: e.message }) + '\n\n');
  }
  res.end();
}

// --- Router -----------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  try {
    if (pathname === '/brand.js') return serveBrand(res);
    if (pathname === '/api/key') return await handleKey(req, res);
    if (pathname === '/api/model' && req.method === 'POST') return await handleModel(req, res);
    if (pathname === '/api/chat' && req.method === 'POST') return await handleChat(req, res);
    if (pathname === '/api/sessions' || pathname.startsWith('/api/sessions/')) return await handleSessions(req, res, pathname);
    return serveStatic(req, res);
  } catch (e) {
    if (!res.headersSent) json(res, 500, { message: e.message });
    else res.end();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  IdeaBank is running');
  console.log('  ->  http://localhost:' + PORT);
  console.log('');
  console.log('  Key file: ' + CONFIG_FILE);
  console.log('  Sessions: ' + SESSIONS_DIR);
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
