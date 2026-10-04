#!/usr/bin/env python3
"""
FreeLLM CLI Tool - Manage, Obtain, and Test Free LLM API Keys
"""

import os
import sys
import json
import time
import urllib.request
import urllib.parse
import webbrowser

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "providers.json")
ENV_FILE = os.path.join(os.path.dirname(__file__), ".env")

def load_providers():
    if not os.path.exists(DATA_FILE):
        print("[!] File data/providers.json tidak ditemukan.")
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def load_env():
    keys = {}
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    keys[k.strip()] = v.strip().strip('"').strip("'")
    return keys

def save_env_key(key, val):
    lines = []
    found = False
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            lines = [l.rstrip("\n") for l in f]
    
    new_lines = []
    for line in lines:
        if line.strip().startswith(f"{key}="):
            new_lines.append(f"{key}={val}")
            found = True
        else:
            new_lines.append(line)
    if not found:
        new_lines.append(f"{key}={val}")
        
    with open(ENV_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(new_lines) + "\n")
    print(f"[OK] Key '{key}' berhasil disimpan ke .env!")

def test_single_provider(provider, api_key):
    print(f"[*] Menguji {provider['name']} ({provider['defaultModel']})... ", end="", flush=True)
    payload = {
        "model": provider["defaultModel"],
        "messages": [
            {"role": "system", "content": "You are a test ping agent. Answer in 1 short sentence."},
            {"role": "user", "content": "Ping test! Please reply 'OK: Connected successfully'"}
        ],
        "max_tokens": 40
    }
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "User-Agent": "FreeLLM-CLI/1.0"
    }
    if provider["id"] == "openrouter":
        headers["HTTP-Referer"] = "http://localhost:3000"
        headers["X-Title"] = "FreeLLM CLI"

    url = f"{provider['baseUrl']}/chat/completions"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")

    start_time = time.time()
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            elapsed = int((time.time() - start_time) * 1000)
            res_data = json.loads(resp.read().decode("utf-8"))
            reply = res_data.get("choices", [{}])[0].get("message", {}).get("content", "OK")
            print(f"\033[92m[SUKSES] ({elapsed}ms)\033[0m")
            print(f"    Balasan: {reply.strip()[:80]}")
            return True
    except Exception as e:
        print(f"\033[91m[GAGAL]\033[0m -> {str(e)[:120]}")
        return False

def list_providers_menu(providers, env_keys):
    print("\n" + "="*70)
    print("🔥 DAFTAR PROVIDER LLM GRATIS (PERMANEN / NO CREDIT CARD)")
    print("="*70)
    for idx, p in enumerate(providers, start=1):
        has_key = p["envKey"] in env_keys and bool(env_keys[p["envKey"]])
        status = "\033[92m[TERPASANG]\033[0m" if has_key else "\033[93m[BELUM DISI]\033[0m"
        cc_badge = "❌ No CC" if not p.get("creditCardRequired") else "⚠️ Needs Verification"
        print(f"{idx:2d}. {p['name']:<25} | {status:<15} | {cc_badge} | {p['badge']}")
    print("="*70)

def main():
    providers = load_providers()
    
    while True:
        env_keys = load_env()
        print("\n=== FreeLLM CLI Manager & Key Generator ===")
        print("1. Lihat semua Provider & Status Key")
        print("2. Dapatkan API Key Gratis (Buka Browser langsung)")
        print("3. Masukkan / Update API Key")
        print("4. Test Semua API Key yang Terpasang")
        print("5. Jalankan Web Dashboard & Proxy Hub (Node.js)")
        print("6. Keluar")
        
        choice = input("\nPilih opsi [1-6]: ").strip()
        
        if choice == "1":
            list_providers_menu(providers, env_keys)
        elif choice == "2":
            list_providers_menu(providers, env_keys)
            try:
                num = int(input("\nPilih nomor provider untuk buka link daftar API Key: "))
                if 1 <= num <= len(providers):
                    p = providers[num-1]
                    print(f"\n[>] Membuka pendaftaran {p['name']} di browser: {p['registerUrl']}")
                    print("\nPanduan Pendaftaran:")
                    for g in p["guide"]:
                        print(f"  • {g}")
                    webbrowser.open(p["registerUrl"])
                else:
                    print("[!] Pilihan tidak valid.")
            except ValueError:
                print("[!] Masukkan angka yang benar.")
        elif choice == "3":
            list_providers_menu(providers, env_keys)
            try:
                num = int(input("\nPilih nomor provider yang ingin diisi API Key-nya: "))
                if 1 <= num <= len(providers):
                    p = providers[num-1]
                    key_val = input(f"Masukkan {p['envKey']}: ").strip()
                    if key_val:
                        save_env_key(p["envKey"], key_val)
                else:
                    print("[!] Nomor tidak valid.")
            except ValueError:
                print("[!] Masukkan angka.")
        elif choice == "4":
            print("\n[*] Menguji koneksi ke semua provider aktif...")
            active_count = 0
            for p in providers:
                if p["envKey"] in env_keys and env_keys[p["envKey"]]:
                    active_count += 1
                    test_single_provider(p, env_keys[p["envKey"]])
            if active_count == 0:
                print("[!] Belum ada API key yang disimpan. Pilih opsi 2 atau 3 terlebih dahulu.")
        elif choice == "5":
            print("\n[>] Menjalankan Node server: node server.js")
            os.system("node server.js")
        elif choice == "6":
            print("Sampai jumpa!")
            break
        else:
            print("[!] Pilihan tidak valid.")

if __name__ == "__main__":
    main()
