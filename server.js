/**
 * FreeLLM Hub & Unified OpenAI-Compatible Proxy Server
 * With Intelligent Auto-Failover, Key Rotation & Master API Key Routing
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ENV_PATH = path.join(__dirname, '.env');
const DATA_PATH = path.join(__dirname, 'data', 'providers.json');

// Master API Key for IDEs (Cursor, OpenCode, VS Code, Cline)
const MASTER_API_KEY = process.env.MASTER_API_KEY || 'sk-freellm-master';

// Load Providers
let providers = [];
try {
  providers = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
} catch (e) {
  console.error('Failed to load providers.json:', e.message);
}

// In-Memory Key Store & Rotation Indices
const keyStore = {};
const keyIndices = {};

// Failover Statistics
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failoverSwitches: 0,
  recentLogs: []
};

function addLog(msg, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const logItem = { timestamp, message: msg, type };
  stats.recentLogs.unshift(logItem);
  if (stats.recentLogs.length > 50) stats.recentLogs.pop();
  console.log(`[${timestamp}] [FreeLLM-${type.toUpperCase()}] ${msg}`);
}

function loadEnvKeys() {
  if (fs.existsSync(ENV_PATH)) {
    const lines = fs.readFileSync(ENV_PATH, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (k && v) {
          keyStore[k] = v;
        }
      }
    }
  }
}

function getProviderKeys(envKey) {
  const raw = keyStore[envKey] || process.env[envKey] || '';
  if (!raw) return [];
  // Support comma-separated multiple keys for the same provider
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function getNextKey(envKey) {
  const keys = getProviderKeys(envKey);
  if (keys.length === 0) return null;
  if (!keyIndices[envKey]) keyIndices[envKey] = 0;
  const key = keys[keyIndices[envKey] % keys.length];
  keyIndices[envKey] = (keyIndices[envKey] + 1) % keys.length;
  return key;
}

function saveEnvKey(envKey, val) {
  keyStore[envKey] = val;
  let existingContent = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : '';
  const lines = existingContent ? existingContent.split('\n') : [];
  let found = false;
  const newLines = lines.map(line => {
    if (line.trim().startsWith(`${envKey}=`)) {
      found = true;
      return `${envKey}=${val}`;
    }
    return line;
  });
  if (!found) {
    newLines.push(`${envKey}=${val}`);
  }
  fs.writeFileSync(ENV_PATH, newLines.filter(Boolean).join('\n') + '\n', 'utf-8');
}

loadEnvKeys();

// Helper: HTTP Request Forwarder
function makeRequest(targetUrl, options, bodyData) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const lib = parsed.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', err => reject(err));
    req.setTimeout(25000, () => {
      req.destroy();
      reject(new Error('Request timeout after 25s'));
    });

    if (bodyData) {
      req.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
    }
    req.end();
  });
}

// Test a single provider key
async function testProvider(providerId) {
  const provider = providers.find(p => p.id === providerId);
  if (!provider) throw new Error('Provider tidak ditemukan');
  
  const apiKey = getNextKey(provider.envKey);
  if (!apiKey) throw new Error(`API Key untuk ${provider.name} (${provider.envKey}) belum disetel.`);

  const startTime = Date.now();
  const testPayload = {
    model: provider.defaultModel,
    messages: [
      { role: "system", content: "You are a test ping agent. Answer in 1 short sentence." },
      { role: "user", content: "Ping test. Please reply 'FreeLLM Connected successfully!'" }
    ],
    max_tokens: 40,
    temperature: 0.1
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'User-Agent': 'FreeLLM-Tester/1.0'
  };

  let endpoint = `${provider.baseUrl}/chat/completions`;
  if (provider.id === 'openrouter') {
    headers['HTTP-Referer'] = 'http://localhost:3000';
    headers['X-Title'] = 'FreeLLM Hub';
  } else if (provider.id === 'cloudflare') {
    const accountId = keyStore['CLOUDFLARE_ACCOUNT_ID'] || 'default';
    endpoint = provider.baseUrl.replace('{ACCOUNT_ID}', accountId) + '/chat/completions';
  }

  const response = await makeRequest(endpoint, { method: 'POST', headers }, testPayload);
  const latency = Date.now() - startTime;

  if (response.statusCode >= 200 && response.statusCode < 300) {
    let parsed;
    try {
      parsed = JSON.parse(response.data);
    } catch {
      parsed = { raw: response.data };
    }
    const message = parsed?.choices?.[0]?.message?.content || 'Sukses terkoneksi!';
    return {
      success: true,
      providerId: provider.id,
      providerName: provider.name,
      modelUsed: provider.defaultModel,
      latencyMs: latency,
      reply: message
    };
  } else {
    let errMsg = response.data;
    try {
      const errObj = JSON.parse(response.data);
      errMsg = errObj.error?.message || errObj.message || response.data;
    } catch {}
    throw new Error(`[HTTP ${response.statusCode}] ${errMsg}`);
  }
}

// Build candidate list for Auto-Failover
function getCandidateProviders(requestedModel) {
  const activeProviders = providers.filter(p => getProviderKeys(p.envKey).length > 0);
  if (activeProviders.length === 0) return [];

  // Priority order for auto-fallback
  const priorityOrder = ['groq', 'cerebras', 'sambanova', 'gemini', 'openrouter', 'mistral', 'siliconflow', 'cohere', 'cloudflare', 'huggingface'];
  
  // Sort active providers by priority
  const sorted = [...activeProviders].sort((a, b) => {
    let idxA = priorityOrder.indexOf(a.id);
    let idxB = priorityOrder.indexOf(b.id);
    if (idxA === -1) idxA = 999;
    if (idxB === -1) idxB = 999;
    return idxA - idxB;
  });

  if (!requestedModel || requestedModel === 'auto' || requestedModel === 'auto-free') {
    return sorted.map(p => ({ provider: p, model: p.defaultModel }));
  }

  // Exact model match prioritized first
  const candidates = [];
  for (const p of sorted) {
    const m = p.models.find(mod => mod.id === requestedModel);
    if (m) {
      candidates.push({ provider: p, model: m.id });
    }
  }

  // Prefix matching
  for (const p of sorted) {
    if (requestedModel.startsWith(p.id + '/')) {
      const clean = requestedModel.replace(`${p.id}/`, '');
      candidates.push({ provider: p, model: clean });
    }
  }

  // Add the remaining active providers with their default models as fallback
  for (const p of sorted) {
    if (!candidates.some(c => c.provider.id === p.id)) {
      candidates.push({ provider: p, model: p.defaultModel });
    }
  }

  return candidates;
}

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS Headers for API & local proxy clients
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, HTTP-Referer, X-Title');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // JSON helper
  const sendJson = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  // Body reader
  const readBody = () => new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({ raw: body });
      }
    });
    req.on('error', reject);
  });

  // --- API Endpoints ---
  
  // 1. GET /api/providers
  if (req.method === 'GET' && pathname === '/api/providers') {
    const list = providers.map(p => {
      const keys = getProviderKeys(p.envKey);
      const isConfig = keys.length > 0;
      return {
        ...p,
        isConfigured: isConfig,
        keyCount: keys.length,
        maskedKey: isConfig ? `${keys[0].substring(0, 6)}...${keys[0].slice(-4)} (${keys.length} key)` : ''
      };
    });
    return sendJson(200, { success: true, masterKey: MASTER_API_KEY, providers: list, stats });
  }

  // 2. GET /api/stats
  if (req.method === 'GET' && pathname === '/api/stats') {
    return sendJson(200, { success: true, stats, masterKey: MASTER_API_KEY });
  }

  // 3. POST /api/keys
  if (req.method === 'POST' && pathname === '/api/keys') {
    const body = await readBody();
    if (body.envKey && typeof body.value === 'string') {
      saveEnvKey(body.envKey, body.value.trim());
      addLog(`API Key untuk ${body.envKey} diperbarui (${getProviderKeys(body.envKey).length} key tersimpan)`);
      return sendJson(200, { success: true, message: `Key ${body.envKey} berhasil disimpan!` });
    }
    return sendJson(400, { success: false, message: 'Invalid payload' });
  }

  // 4. POST /api/test/:id
  if (req.method === 'POST' && pathname.startsWith('/api/test/')) {
    const providerId = pathname.replace('/api/test/', '');
    try {
      const result = await testProvider(providerId);
      return sendJson(200, result);
    } catch (err) {
      return sendJson(400, { success: false, error: err.message });
    }
  }

  // 5. POST /api/test-all
  if (req.method === 'POST' && pathname === '/api/test-all') {
    const configured = providers.filter(p => getProviderKeys(p.envKey).length > 0);
    if (configured.length === 0) {
      return sendJson(200, { success: false, message: 'Belum ada API key yang dikonfigurasi.' });
    }
    const results = await Promise.allSettled(configured.map(p => testProvider(p.id)));
    const summary = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return {
        success: false,
        providerId: configured[i].id,
        providerName: configured[i].name,
        error: r.reason?.message || 'Gagal terhubung'
      };
    });
    return sendJson(200, { success: true, results: summary });
  }

  // 6. GET /v1/models (OpenAI Standard Format)
  if (req.method === 'GET' && (pathname === '/v1/models' || pathname === '/models')) {
    const modelList = [];
    modelList.push({
      id: "auto-free",
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: "freellm-hub",
      description: "Auto-Failover Smart Router (Auto Switch on Rate Limit)"
    });

    for (const p of providers) {
      const isConfig = getProviderKeys(p.envKey).length > 0;
      for (const m of p.models) {
        modelList.push({
          id: m.id,
          object: "model",
          created: 1700000000,
          owned_by: p.id,
          provider: p.name,
          isConfigured: isConfig
        });
      }
    }
    return sendJson(200, { object: "list", data: modelList });
  }

  // 7. POST /v1/chat/completions (Intelligent Auto-Failover Proxy)
  if (req.method === 'POST' && (pathname === '/v1/chat/completions' || pathname === '/chat/completions')) {
    stats.totalRequests++;
    const body = await readBody();
    const candidates = getCandidateProviders(body.model);

    if (candidates.length === 0) {
      return sendJson(400, {
        error: {
          message: `Tidak ada provider aktif. Silakan masukkan minimal 1 API Key di http://localhost:${PORT}`,
          type: "no_active_providers"
        }
      });
    }

    addLog(`Incoming completion request untuk model '${body.model || 'auto-free'}'. Kandidat rute: ${candidates.map(c => c.provider.name).join(' ➔ ')}`);

    let lastError = null;
    let attempted = 0;

    // Cascade Fallback Loop
    for (const candidate of candidates) {
      const { provider, model } = candidate;
      const apiKey = getNextKey(provider.envKey);
      if (!apiKey) continue;

      attempted++;
      if (attempted > 1) {
        stats.failoverSwitches++;
        addLog(`⚡ [Auto-Failover] Mengalihkan permintaan secara otomatis ke ${provider.name} (${model})...`, 'warn');
      }

      const forwardPayload = {
        ...body,
        model: model
      };

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'FreeLLM-Gateway/1.0'
      };

      if (provider.id === 'openrouter') {
        headers['HTTP-Referer'] = 'http://localhost:3000';
        headers['X-Title'] = 'FreeLLM Hub';
      }

      let targetEndpoint = `${provider.baseUrl}/chat/completions`;
      if (provider.id === 'cloudflare') {
        const accountId = keyStore['CLOUDFLARE_ACCOUNT_ID'] || 'default';
        targetEndpoint = provider.baseUrl.replace('{ACCOUNT_ID}', accountId) + '/chat/completions';
      }

      // Handle Streaming
      if (body.stream) {
        try {
          const streamSuccess = await new Promise((resolveStream) => {
            const parsed = new URL(targetEndpoint);
            const lib = parsed.protocol === 'https:' ? https : http;
            
            const proxyReq = lib.request({
              protocol: parsed.protocol,
              hostname: parsed.hostname,
              port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
              path: parsed.pathname + parsed.search,
              method: 'POST',
              headers: headers
            }, (proxyRes) => {
              if (proxyRes.statusCode >= 200 && proxyRes.statusCode < 300) {
                res.writeHead(proxyRes.statusCode, {
                  'Content-Type': 'text/event-stream',
                  'Cache-Control': 'no-cache',
                  'Connection': 'keep-alive',
                  'Access-Control-Allow-Origin': '*'
                });
                proxyRes.pipe(res);
                stats.successfulRequests++;
                addLog(`✓ Stream berhasil dilayani oleh ${provider.name} (${model})`, 'success');
                resolveStream(true);
              } else {
                let errData = '';
                proxyRes.on('data', chunk => { errData += chunk; });
                proxyRes.on('end', () => {
                  lastError = `[HTTP ${proxyRes.statusCode} from ${provider.name}]: ${errData}`;
                  addLog(`⚠️ ${provider.name} gagal (HTTP ${proxyRes.statusCode}). Mencoba provider berikutnya...`, 'warn');
                  resolveStream(false);
                });
              }
            });

            proxyReq.on('error', (err) => {
              lastError = `[Network error on ${provider.name}]: ${err.message}`;
              resolveStream(false);
            });

            proxyReq.write(JSON.stringify(forwardPayload));
            proxyReq.end();
          });

          if (streamSuccess) {
            return; // Streaming delivered
          }
        } catch (err) {
          lastError = err.message;
        }
      } else {
        // Non-Streaming
        try {
          const response = await makeRequest(targetEndpoint, { method: 'POST', headers }, forwardPayload);
          if (response.statusCode >= 200 && response.statusCode < 300) {
            stats.successfulRequests++;
            addLog(`✓ Sukses dilayani oleh ${provider.name} (${model})`, 'success');
            res.writeHead(response.statusCode, { 'Content-Type': 'application/json' });
            res.end(response.data);
            return;
          } else {
            lastError = `[HTTP ${response.statusCode} from ${provider.name}]: ${response.data}`;
            addLog(`⚠️ ${provider.name} rate-limit/gagal (HTTP ${response.statusCode}). Auto-switching...`, 'warn');
          }
        } catch (err) {
          lastError = `[Error ${provider.name}]: ${err.message}`;
        }
      }
    }

    // If all providers failed
    addLog(`❌ Semua ${candidates.length} provider cadangan gagal melayani request.`, 'error');
    sendJson(429, {
      error: {
        message: `Semua provider aktif mengalami rate-limit atau error. Terakhir: ${lastError}`,
        type: "all_providers_exhausted"
      }
    });
    return;
  }

  // --- Static File Serving (Web Dashboard) ---
  let safePath = pathname === '/' ? '/index.html' : pathname;
  let filePath = path.join(__dirname, 'public', safePath);

  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'public', 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n================================================================`);
  console.log(`🚀 FreeLLM Gateway & Smart Auto-Failover Hub Berjalan!`);
  console.log(`🌐 Web Dashboard   : http://localhost:${PORT}`);
  console.log(`🔀 OpenAI Proxy URL : http://localhost:${PORT}/v1`);
  console.log(`🔑 Master API Key  : ${MASTER_API_KEY}`);
  console.log(`⚡ Auto-Failover   : AKTIF (Auto switch saat token/rate-limit habis)`);
  console.log(`================================================================\n`);
});
