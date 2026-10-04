// State
let allProviders = [];
let activeFilter = 'all';
let searchQuery = '';

// DOM Elements
const providerGrid = document.getElementById('provider-grid');
const searchInput = document.getElementById('search-input');
const filterChips = document.querySelectorAll('.chip');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const btnTestAllTop = document.getElementById('btn-test-all-top');
const chatModelSelect = document.getElementById('chat-model-select');
const chatMessages = document.getElementById('chat-messages');
const chatUserInput = document.getElementById('chat-user-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatTemp = document.getElementById('chat-temp');
const tempVal = document.getElementById('temp-val');
const chatSystemPrompt = document.getElementById('chat-system-prompt');

// Init
document.addEventListener('DOMContentLoaded', () => {
  fetchProviders();
  setupEventListeners();
});

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Fetch Providers Data
async function fetchProviders() {
  try {
    const res = await fetch('/api/providers');
    const data = await res.json();
    if (data.success) {
      allProviders = data.providers;
      renderDirectory();
      populateChatModels();
    }
  } catch (err) {
    showToast('Gagal memuat data provider: ' + err.message, 'error');
  }
}

// Render Directory Cards
function renderDirectory() {
  if (!providerGrid) return;
  providerGrid.innerHTML = '';

  const filtered = allProviders.filter(p => {
    // Search query
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery) ||
      p.description.toLowerCase().includes(searchQuery) ||
      p.models.some(m => m.name.toLowerCase().includes(searchQuery) || m.id.toLowerCase().includes(searchQuery));
    
    if (!matchesSearch) return false;

    // Filter Chips
    if (activeFilter === 'no_cc') return p.creditCardRequired === false;
    if (activeFilter === 'configured') return p.isConfigured === true;
    if (activeFilter === 'unconfigured') return p.isConfigured === false;
    return true;
  });

  if (filtered.length === 0) {
    providerGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px 20px; background: rgba(255, 255, 255, 0.02); border: 1px dashed var(--border-color); border-radius: 16px;">
        <p style="font-size: 1.15rem; color: #fff; margin-bottom: 8px;">Tidak ada provider yang cocok dengan filter / pencarian.</p>
        <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 16px;">Teks pencarian: "<strong>${searchQuery || activeFilter}</strong>"</p>
        <button class="btn btn-primary" onclick="window.resetSearchFilter()">
          🔄 Tampilkan Kembali Semua Provider
        </button>
      </div>
    `;
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'provider-card';

    const statusBadge = p.isConfigured
      ? `<span class="status-badge configured"><span class="pulse-dot"></span> Key Aktif</span>`
      : `<span class="status-badge unconfigured">Key Belum Diisi</span>`;

    const guideSteps = p.guide.map(g => `<li>${g}</li>`).join('');

    card.innerHTML = `
      <div>
        <div class="card-top">
          <div class="card-title-group">
            <h3>${p.name}</h3>
            <span class="badge-tag">${p.badge}</span>
          </div>
          ${statusBadge}
        </div>

        <p class="card-desc">${p.description}</p>

        <div class="card-metrics">
          <div class="metric-item">
            <span>Rate Limit Free</span>
            <strong>${p.rateLimit}</strong>
          </div>
          <div class="metric-item">
            <span>Syarat Daftar</span>
            <strong>${p.creditCardRequired ? 'Verifikasi HP' : '❌ Tanpa Kartu Kredit'}</strong>
          </div>
        </div>

        <div class="guide-accordion">
          <div class="guide-header" onclick="toggleAccordion(this)">
            <span>📋 Cara Dapatkan API Key Gratis</span>
            <span>▾</span>
          </div>
          <div class="guide-content">
            <ol>${guideSteps}</ol>
          </div>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 4px;">
            Input Key (${p.envKey}):
          </label>
          <div class="key-input-group">
            <input type="password" id="input-${p.id}" class="key-input" placeholder="${p.isConfigured ? p.maskedKey : 'Tempel API Key di sini...'}" autocomplete="new-password" value="">
            <button class="btn btn-primary" onclick="saveKey('${p.id}', '${p.envKey}')">Simpan</button>
          </div>
        </div>
      </div>

      <div class="btn-action-row">
        <a href="${p.registerUrl}" target="_blank" rel="noopener" class="btn btn-get-key">
          Dapatkan Key ↗
        </a>
        <button class="btn btn-secondary" id="btn-ping-${p.id}" onclick="testSingleKey('${p.id}')">
          ⚡ Uji Ping
        </button>
      </div>
    `;

    providerGrid.appendChild(card);
  });
}

// Accordion toggle
window.toggleAccordion = function(el) {
  const content = el.nextElementSibling;
  content.classList.toggle('open');
};

// Save Key
window.saveKey = async function(providerId, envKey) {
  const input = document.getElementById(`input-${providerId}`);
  const val = input.value.trim();
  if (!val) {
    showToast('Silakan masukkan API key sebelum menyimpan.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ envKey, value: val })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      input.value = '';
      fetchProviders();
    } else {
      showToast('Gagal menyimpan: ' + data.message, 'error');
    }
  } catch (err) {
    showToast('Error koneksi: ' + err.message, 'error');
  }
};

// Single Provider Ping Test
window.testSingleKey = async function(providerId) {
  const pingBtn = document.getElementById(`btn-ping-${providerId}`);
  if (pingBtn) pingBtn.innerHTML = '<em>Menguji...</em>';
  showToast(`Menguji koneksi ke ${providerId}...`, 'info');

  try {
    const res = await fetch(`/api/test/${providerId}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(`[${data.providerName}] Sukses! Latensi: ${data.latencyMs}ms. Balasan: "${data.reply}"`, 'success');
      if (pingBtn) pingBtn.innerHTML = `✓ ${data.latencyMs}ms`;
    } else {
      showToast(`[${providerId}] Gagal: ${data.error}`, 'error');
      if (pingBtn) pingBtn.innerHTML = `✗ Gagal`;
    }
  } catch (err) {
    showToast('Error koneksi: ' + err.message, 'error');
    if (pingBtn) pingBtn.innerHTML = `⚡ Uji Ping`;
  }
};

// Batch Test All
async function runBatchTestAll() {
  if (btnTestAllTop) {
    btnTestAllTop.disabled = true;
    btnTestAllTop.innerHTML = '<span>⏳</span> Sedang Menguji Semua...';
  }
  showToast('Memulai uji koneksi semua provider aktif...', 'info');

  try {
    const res = await fetch('/api/test-all', { method: 'POST' });
    const data = await res.json();
    if (data.success && data.results) {
      let successCount = 0;
      data.results.forEach(r => {
        const pingBtn = document.getElementById(`btn-ping-${r.providerId}`);
        if (pingBtn) {
          if (r.success) {
            successCount++;
            pingBtn.innerHTML = `<span style="color: #34d399;">✓ ${r.latencyMs}ms</span>`;
          } else {
            pingBtn.innerHTML = `<span style="color: #f43f5e;">✗ Gagal</span>`;
          }
        }
      });
      showToast(`Uji selesai: ${successCount} dari ${data.results.length} provider siap digunakan!`, 'success');
    } else {
      showToast(data.message || 'Belum ada API key yang disimpan.', 'error');
    }
  } catch (err) {
    showToast('Gagal menjalankan test all: ' + err.message, 'error');
  } finally {
    if (btnTestAllTop) {
      btnTestAllTop.disabled = false;
      btnTestAllTop.innerHTML = '<span>⚡</span> Uji Semua Key Aktif';
    }
  }
}

// Populate Chat Models Dropdown
function populateChatModels() {
  if (!chatModelSelect) return;
  chatModelSelect.innerHTML = `
    <optgroup label="Auto Fallback Hub (Rekomendasi)">
      <option value="auto-free">⚡ auto-free (Pilih Otomatis Provider Aktif)</option>
    </optgroup>
  `;

  allProviders.forEach(p => {
    const optGroup = document.createElement('optgroup');
    optGroup.label = `${p.name} ${p.isConfigured ? '✓ (Aktif)' : '(Belum Diisi)'}`;
    
    p.models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.name} (${m.context})`;
      optGroup.appendChild(opt);
    });

    chatModelSelect.appendChild(optGroup);
  });
}

// Chat Playground Handler
let chatHistory = [];

async function handleSendMessage() {
  const text = chatUserInput.value.trim();
  if (!text) return;

  const model = chatModelSelect.value;
  const temp = parseFloat(chatTemp.value);
  const sysPrompt = chatSystemPrompt.value.trim();

  // Append user bubble
  appendChatBubble('user', text);
  chatUserInput.value = '';

  // Append thinking bubble
  const assistantBubble = appendChatBubble('assistant', 'Mengetik...');
  chatSendBtn.disabled = true;

  const messagesPayload = [];
  if (sysPrompt) {
    messagesPayload.push({ role: 'system', content: sysPrompt });
  }
  chatHistory.forEach(msg => messagesPayload.push(msg));
  messagesPayload.push({ role: 'user', content: text });

  try {
    const res = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: messagesPayload,
        temperature: temp
      })
    });

    const data = await res.json();

    if (data.choices && data.choices[0]?.message) {
      const reply = data.choices[0].message.content;
      assistantBubble.textContent = reply;
      chatHistory.push({ role: 'user', content: text });
      chatHistory.push({ role: 'assistant', content: reply });
    } else if (data.error) {
      assistantBubble.innerHTML = `<span style="color: #f43f5e;">Error: ${data.error.message}</span>`;
    } else {
      assistantBubble.textContent = JSON.stringify(data);
    }
  } catch (err) {
    assistantBubble.innerHTML = `<span style="color: #f43f5e;">Gagal menghubungi server proxy: ${err.message}</span>`;
  } finally {
    chatSendBtn.disabled = false;
  }
}

function appendChatBubble(role, text) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return bubble;
}

// Copy Snippet Helper
window.copySnippet = function(btn) {
  const codeBlock = btn.nextElementSibling.textContent;
  navigator.clipboard.writeText(codeBlock);
  const original = btn.textContent;
  btn.textContent = 'Tersalin! ✓';
  btn.style.background = '#059669';
  btn.style.color = '#fff';
  setTimeout(() => {
    btn.textContent = original;
    btn.style.background = '';
    btn.style.color = '';
  }, 2000);
};

// Reset Search
window.resetSearchFilter = function() {
  const clearBtn = document.getElementById('clear-search-btn');
  if (searchInput) searchInput.value = '';
  if (clearBtn) clearBtn.style.display = 'none';
  searchQuery = '';
  activeFilter = 'all';
  filterChips.forEach(c => {
    if (c.dataset.filter === 'all') c.classList.add('active');
    else c.classList.remove('active');
  });
  renderDirectory();
};

// Event Listeners Setup
function setupEventListeners() {
  const clearBtn = document.getElementById('clear-search-btn');

  // Tabs Switching - Clean & Robust
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTabId = btn.dataset.tab;
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      const targetPane = document.getElementById(targetTabId);
      if (targetPane) {
        targetPane.classList.add('active');
      }
    });
  });

  // Filter chips
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      renderDirectory();
    });
  });

  // Search
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      if (clearBtn) {
        clearBtn.style.display = searchQuery ? 'flex' : 'none';
      }
      renderDirectory();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      window.resetSearchFilter();
    });
  }

  if (btnTestAllTop) {
    btnTestAllTop.addEventListener('click', runBatchTestAll);
  }

  // Clear any browser autofill on page load
  setTimeout(() => {
    if (searchInput && searchInput.value && !searchQuery) {
      searchInput.value = '';
      searchQuery = '';
      renderDirectory();
    }
  }, 100);

  // Temperature slider
  if (chatTemp && tempVal) {
    chatTemp.addEventListener('input', (e) => {
      tempVal.textContent = e.target.value;
    });
  }

  // Chat send
  if (chatSendBtn) {
    chatSendBtn.addEventListener('click', handleSendMessage);
  }
  if (chatUserInput) {
    chatUserInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }
}
