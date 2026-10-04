#!/usr/bin/env python3
"""
Test All Configured API Keys concurrently and output latency + status
"""

import os
import sys
import json
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "providers.json")
ENV_FILE = os.path.join(os.path.dirname(__file__), ".env")

def load_data():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        providers = json.load(f)
    keys = {}
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    keys[k.strip()] = v.strip().strip('"').strip("'")
    return providers, keys

def ping(provider, api_key):
    url = f"{provider['baseUrl']}/chat/completions"
    payload = {
        "model": provider["defaultModel"],
        "messages": [{"role": "user", "content": "Reply with 'pong'"}],
        "max_tokens": 10
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "User-Agent": "FreeLLM-BatchTester/1.0"
    }
    if provider["id"] == "openrouter":
        headers["HTTP-Referer"] = "http://localhost:3000"
        headers["X-Title"] = "FreeLLM Hub"
        
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            lat = int((time.time() - t0) * 1000)
            return (True, provider["name"], provider["defaultModel"], lat, "OK")
    except Exception as e:
        return (False, provider["name"], provider["defaultModel"], 0, str(e)[:100])

def main():
    providers, keys = load_data()
    active = [(p, keys[p["envKey"]]) for p in providers if p["envKey"] in keys and keys[p["envKey"]]]
    
    if not active:
        print("\n[!] Belum ada API key yang terkonfigurasi di file .env")
        print("💡 Silakan isi .env atau jalankan 'python cli.py' atau 'node server.js'")
        sys.exit(0)

    print(f"\n🚀 Menguji {len(active)} Provider API Keys secara paralel...\n")
    print(f"{'Provider':<25} | {'Model':<30} | {'Status':<10} | {'Latency':<10}")
    print("-" * 85)

    with ThreadPoolExecutor(max_workers=10) as ex:
        futures = [ex.submit(ping, p, key) for p, key in active]
        for f in futures:
            ok, name, model, lat, msg = f.result()
            status_str = "\033[92mONLINE\033[0m" if ok else "\033[91mERROR\033[0m"
            lat_str = f"{lat}ms" if ok else "-"
            print(f"{name:<25} | {model[:28]:<30} | {status_str:<10} | {lat_str:<10}")
            if not ok:
                print(f"  └─ Error: {msg}")

    print("-" * 85)
    print("\n Selesai!\n")

if __name__ == "__main__":
    main()
