# 🌟 Panduan Lengkap Mendapatkan & Menggunakan API Key LLM Gratis

Panduan ini disusun untuk membantu Anda mendapatkan akses **API Key gratis dari 14+ provider AI terkemuka di dunia** tanpa memerlukan kartu kredit, serta cara menggunakannya melalui **FreeLLM Hub & Gateway** yang baru saja dibangun di repository ini.

---

## 🚀 Fitur Baru yang Telah Dikembangkan di Repo Ini

Repository ini sekarang bukan hanya sekadar daftar statis, melainkan sebuah **Toolkit Lengkap & Proxy Gateway**:

1. **Web Dashboard Interaktif (`http://localhost:3000`)**:
   - Katalog terstruktur provider gratis lengkap dengan tombol pendaftaran 1-klik.
   - Input dan simpan API key lokal secara aman ke file `.env`.
   - Fitur **Live Ping Test & Monitor Kesehatan** untuk menguji latensi dan status setiap key.
   - **AI Chat Playground** terintegrasi untuk mencoba chat dan coding prompt langsung.
2. **Unified OpenAI-Compatible Reverse Proxy (`http://localhost:3000/v1`)**:
   - Satu endpoint tunggal untuk semua model AI gratis.
   - Bisa langsung dimasukkan ke **Cursor IDE, Claude Code, Cline / Roo Code, Aider, Open WebUI, atau script Python OpenAI SDK**.
   - Dilengkapi fallback otomatis (`model: "auto-free"`).
3. **Python CLI Companion (`python cli.py` & `python test_keys.py`)**:
   - Manajemen key dan benchmark latensi langsung dari terminal.

---

## 📋 Daftar Provider Terbaik & Cara Mendapatkan Kunci API (100% Gratis & Tanpa Kartu Kredit)

### 1. ⚡ Groq Cloud (Rekomendasi Utama #1)
- **Kelebihan**: Kecepatan paling tinggi di dunia (~500+ token/detik), 100% tanpa kartu kredit.
- **Model Unggulan**: `llama-3.3-70b-versatile`, `deepseek-r1-distill-llama-70b`, `mixtral-8x7b-32768`.
- **Limit Gratis**: 30 Request/Menit (RPM), 14,400 Request/Hari.
- **Cara Dapatkan Key**:
  1. Buka: [https://console.groq.com/keys](https://console.groq.com/keys)
  2. Login menggunakan akun **Google** atau **GitHub**.
  3. Klik tombol **Create API Key**.
  4. Beri nama key Anda (misal: `FreeLLM-Groq`), lalu klik **Submit**.
  5. Salin API Key (diawali dengan `gsk_...`) dan tempel ke dashboard atau `.env` (`GROQ_API_KEY=...`).

---

### 2. 🧠 Google Gemini (Google AI Studio)
- **Kelebihan**: Konteks jendela terbesar di dunia (1 Juta s.d 2 Juta token), multimodal (teks, gambar, audio, dokumen PDF).
- **Model Unggulan**: `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`.
- **Limit Gratis**: 15 RPM / 1,500 RPD gratis selamanya.
- **Cara Dapatkan Key**:
  1. Buka: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
  2. Login dengan akun Google Anda.
  3. Klik tombol biru **Create API key** / **Get API key**.
  4. Pilih **Create API key in new project**.
  5. Salin API Key dan simpan sebagai `GEMINI_API_KEY=...`.

---

### 3. 🌐 OpenRouter (Koleksi Model Free Terbesar)
- **Kelebihan**: Multi-provider gateway dengan 30+ model gratis (`:free`).
- **Model Unggulan**: `meta-llama/llama-3.3-70b-instruct:free`, `deepseek/deepseek-r1:free`, `qwen/qwen-2.5-coder-32b-instruct:free`.
- **Cara Dapatkan Key**:
  1. Buka: [https://openrouter.ai/keys](https://openrouter.ai/keys)
  2. Login dengan Google atau GitHub.
  3. Klik **Create Key**, beri nama kunci Anda.
  4. Salin string key (diawali `sk-or-v1-...`) dan simpan sebagai `OPENROUTER_API_KEY=...`.

---

### 4. ⚡ Cerebras Inference (Chip Tercepat)
- **Kelebihan**: Akselerasi hardware CS-3 dengan kecepatan ekstrim 2000+ token/detik.
- **Model Unggulan**: `llama3.1-70b`, `llama3.1-8b`.
- **Limit Gratis**: 30 RPM, 1.000.000 token per hari.
- **Cara Dapatkan Key**:
  1. Buka: [https://cloud.cerebras.ai/](https://cloud.cerebras.ai/)
  2. Sign up dengan email Anda.
  3. Masuk ke menu **API Keys** di sidebar kiri.
  4. Klik **Create New API Key** dan simpan sebagai `CEREBRAS_API_KEY=...`.

---

### 5. 🏢 SambaNova Cloud
- **Kelebihan**: Akselerator enterprise dengan model DeepSeek R1 dan Llama 3.3 70B full precision.
- **Model Unggulan**: `Meta-Llama-3.3-70B-Instruct`, `DeepSeek-R1-Distill-Llama-70B`, `Qwen2.5-72B-Instruct`.
- **Cara Dapatkan Key**:
  1. Buka: [https://cloud.sambanova.ai/apis](https://cloud.sambanova.ai/apis)
  2. Daftar akun gratis dengan email.
  3. Buka tab **API Keys** -> **Create API Key**.
  4. Salin dan simpan sebagai `SAMBANOVA_API_KEY=...`.

---

### 6. 🇫🇷 Mistral AI
- **Kelebihan**: Model reasoning dan coding Eropa terbaik.
- **Model Unggulan**: `mistral-small-latest`, `codestral-latest`, `open-mixtral-8x7b`.
- **Cara Dapatkan Key**:
  1. Buka: [https://console.mistral.ai/api-keys](https://console.mistral.ai/api-keys)
  2. Daftar akun gratis.
  3. Masuk ke menu **API Keys** dan buat kunci baru.
  4. Simpan sebagai `MISTRAL_API_KEY=...`.

---

### 7. 🤗 Hugging Face Inference
- **Kelebihan**: Ribuan model open-source langsung dari Hugging Face Hub.
- **Model Unggulan**: `meta-llama/Meta-Llama-3.1-8B-Instruct`, `Qwen/Qwen2.5-72B-Instruct`, `google/gemma-2-27b-it`.
- **Cara Dapatkan Key**:
  1. Buka: [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
  2. Buat token baru dengan role **Read**.
  3. Simpan sebagai `HUGGINGFACE_API_KEY=...`.

---

### 8. 🇨🇳 SiliconFlow (SiliconCloud)
- **Kelebihan**: Menyediakan model DeepSeek V3 dan DeepSeek R1 secara gratis.
- **Model Unggulan**: `deepseek-ai/DeepSeek-V3`, `deepseek-ai/DeepSeek-R1`, `Qwen/Qwen2.5-7B-Instruct`.
- **Cara Dapatkan Key**:
  1. Buka: [https://cloud.siliconflow.cn/account/ak](https://cloud.siliconflow.cn/account/ak)
  2. Daftar akun gratis.
  3. Buka menu API Keys dan buat key baru.
  4. Simpan sebagai `SILICONFLOW_API_KEY=...`.

---

### 9. ☁️ Cloudflare Workers AI
- **Kelebihan**: 10.000 neuron gratis setiap hari tanpa biaya berlangganan.
- **Model Unggulan**: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, `@cf/mistral/mistral-7b-instruct-v0.1`.
- **Cara Dapatkan Key**:
  1. Buka: [https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
  2. Buat API token dengan template **Workers AI Read/Write**.
  3. Dapatkan Account ID Anda dari URL dashboard Cloudflare.
  4. Simpan `CLOUDFLARE_API_KEY=...` dan `CLOUDFLARE_ACCOUNT_ID=...`.

---

### 10. 🎯 Cohere
- **Kelebihan**: Model Command R dengan kemampuan analisis dokumen dan RAG.
- **Model Unggulan**: `command-r-plus`, `command-r`.
- **Cara Dapatkan Key**:
  1. Buka: [https://dashboard.cohere.com/api-keys](https://dashboard.cohere.com/api-keys)
  2. Salin **Trial API Key** gratis yang langsung tersedia.
  3. Simpan sebagai `COHERE_API_KEY=...`.

---

## 🛠️ Cara Menjalankan FreeLLM Hub

### Cara 1: Menggunakan Node.js (Web Dashboard + Proxy Hub)

Jalankan perintah berikut di folder proyek:
```bash
npm start
# atau
node server.js
```
Akses di browser:
- 🌐 **Web Dashboard**: [http://localhost:3000](http://localhost:3000)
- 🔀 **OpenAI Proxy Endpoint**: `http://localhost:3000/v1`

---

### Cara 2: Menggunakan Python CLI

Jalankan menu interaktif di terminal:
```bash
python cli.py
```
Atau uji seluruh koneksi API key sekaligus:
```bash
python test_keys.py
```

---

## 🔌 Cara Menghubungkan ke Berbagai Tools AI

### 1. Cursor IDE
1. Buka Cursor -> **Settings** -> **Models**.
2. Di bagian **OpenAI API Key**, masukkan: `sk-freellm-hub` (isi bebas).
3. Klik **Override OpenAI Base URL**, masukkan:
   `http://localhost:3000/v1`
4. Tambahkan model yang ingin digunakan, misal:
   - `llama-3.3-70b-versatile`
   - `gemini-2.0-flash`
   - `auto-free`

### 2. Claude Code CLI
Gunakan OpenRouter atau proxy:
```powershell
$env:ANTHROPIC_BASE_URL="https://openrouter.ai/api"
$env:ANTHROPIC_AUTH_TOKEN="sk-or-v1-kunci-openrouter-anda"
$env:ANTHROPIC_API_KEY=""
claude
```

### 3. Skrip Python (OpenAI SDK)
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="sk-freellm-hub"  # Bebas
)

response = client.chat.completions.create(
    model="llama-3.3-70b-versatile", # Atau "auto-free"
    messages=[{"role": "user", "content": "Berikan 3 tips belajar AI secara gratis!"}]
)

print(response.choices[0].message.content)
```

---

## 💡 Tips & Trik Agar Tidak Terkena Rate Limit
1. **Daftarkan minimal 3 provider** (misalnya: Groq + Gemini + OpenRouter).
2. Gunakan model `auto-free` pada proxy agar jika satu provider mengalami antrean, permintaan dialihkan secara instan ke provider cadangan.
3. Untuk tugas coding berat, gunakan `llama-3.3-70b-versatile` (Groq/SambaNova) atau `qwen-2.5-coder-32b-instruct` (OpenRouter).
4. Untuk dokumen panjang (PDF / transkrip besar), gunakan `gemini-2.0-flash` (Google Gemini) yang mendukung hingga 1.000.000 token!
