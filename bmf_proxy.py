#!/usr/bin/env python3
"""
GMVCU SENS BOT — BMF Proxy Server
API key is read from BMF_API_KEY environment variable.
Set it before starting:
    $env:BMF_API_KEY = "your_key_here"; python bmf_proxy.py   # PowerShell
    export BMF_API_KEY="your_key_here" && python bmf_proxy.py  # bash/zsh
"""
from flask import Flask, request, jsonify, Response, send_from_directory
from flask_cors import CORS
import requests
import json
import os
import sys
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── API KEY from environment ──────────────────────────────────────────────────
BMF_API_KEY = os.environ.get("BMF_API_KEY", "").strip()

if not BMF_API_KEY:
    print("\n❌  ERROR: BMF_API_KEY environment variable is not set.")
    print("    Set it before starting the proxy:")
    print()
    print("    PowerShell:")
    print('        $env:BMF_API_KEY = "your_key_here"; python bmf_proxy.py')
    print()
    print("    Anaconda / bash:")
    print('        export BMF_API_KEY="your_key_here" && python bmf_proxy.py')
    print()
    sys.exit(1)

# ── BMF endpoint config ───────────────────────────────────────────────────────
DEFAULT_DEPLOYMENT = "gpt-4o-2024-11-20"
API_VERSION        = "2025-04-01-preview"
BMF_BASE_URL       = "https://aoai-farm.bosch-temp.com/api/openai/deployments"

# Models that don't support temperature / top_p
NO_TEMPERATURE_MODELS = {
    "gpt-5-nano-2025-08-07",
    "gpt-5",
    "o3-mini-2025-01-31",
    "o1-mini",
    "o1",
    "o3",
}

def get_bmf_url(deployment: str) -> str:
    return f"{BMF_BASE_URL}/{deployment}/chat/completions?api-version={API_VERSION}"

print(f"\n{'='*60}")
print(f"  GMVCU SENS BOT — BMF Proxy")
print(f"{'='*60}")
print(f"  API Key : {'*' * (len(BMF_API_KEY) - 4)}{BMF_API_KEY[-4:]}")
print(f"  Default : {DEFAULT_DEPLOYMENT}")
print(f"  API Ver : {API_VERSION}")
print(f"  URL     : http://localhost:5000/")
print(f"{'='*60}\n")


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/")
def home():
    return send_from_directory(BASE_DIR, "gmvcu_chatbot.html")

@app.route("/gmvcu_chatbot.html")
def chatbot():
    return send_from_directory(BASE_DIR, "gmvcu_chatbot.html")

@app.route("/swcdd_db.js")
def swcdd_db():
    return send_from_directory(BASE_DIR, "swcdd_db.js")

@app.route("/health")
def health():
    return jsonify({
        "status":     "ok",
        "deployment": DEFAULT_DEPLOYMENT,
        "api_version": API_VERSION,
        "key_set":    bool(BMF_API_KEY),
    })

@app.route("/proxy/chat", methods=["POST"])
def proxy_chat():
    try:
        data = request.get_json(force=True)

        # Ignore any client-sent key (key is always from env)
        data.pop("bmf_api_key", None)

        messages = data.get("messages", [])
        if not messages:
            return jsonify({"error": {"message": "No messages provided"}}), 400

        # Use model requested by client, fall back to default
        deployment = data.get("model", DEFAULT_DEPLOYMENT).strip()
        bmf_url    = get_bmf_url(deployment)

        headers = {
            "Content-Type":  "application/json",
            "Authorization": f"Bearer {BMF_API_KEY}",
        }

        # Build payload
        payload = {
            "model":    deployment,
            "messages": messages,
        }

        # Token limit — prefer max_completion_tokens (newer API)
        if "max_completion_tokens" in data:
            payload["max_completion_tokens"] = data["max_completion_tokens"]
        elif "max_tokens" in data:
            payload["max_completion_tokens"] = data["max_tokens"]
        else:
            payload["max_completion_tokens"] = 4000

        # Temperature — skip for reasoning models
        supports_temp = not any(m in deployment for m in NO_TEMPERATURE_MODELS)
        if supports_temp:
            payload["temperature"] = data.get("temperature", 0.7)
            if "top_p" in data:
                payload["top_p"] = data["top_p"]
        else:
            print(f"  ℹ️  Skipping temperature/top_p for {deployment}")

        for opt in ("frequency_penalty", "presence_penalty", "stop"):
            if opt in data:
                payload[opt] = data[opt]

        print(f"\n── REQUEST ──────────────────────────────")
        print(f"  Model : {deployment}")
        print(f"  URL   : {bmf_url}")
        print(f"  Msgs  : {len(messages)} message(s)")
        print(f"  Tokens: {payload.get('max_completion_tokens')}")
        print(f"────────────────────────────────────────\n")

        response = requests.post(
            bmf_url,
            headers=headers,
            json=payload,
            timeout=90,
            verify=False,
        )

        print(f"── RESPONSE ─────────────────────────────")
        print(f"  Status: {response.status_code}")
        try:
            rj = response.json()
            usage = rj.get("usage", {})
            if usage:
                print(f"  Tokens used: prompt={usage.get('prompt_tokens','?')} completion={usage.get('completion_tokens','?')}")
            if response.status_code != 200:
                print(json.dumps(rj, indent=2)[:600])
        except Exception:
            print(response.text[:300])
        print(f"────────────────────────────────────────\n")

        # Surface errors clearly
        if response.status_code == 400:
            return Response(response.content, status=400, content_type="application/json")
        elif response.status_code == 401:
            return Response(json.dumps({"error": {"message": "Authentication failed. Check BMF_API_KEY env var."}}),
                            status=401, content_type="application/json")
        elif response.status_code == 404:
            return Response(json.dumps({"error": {"message": f"Deployment '{deployment}' not found on BMF."}}),
                            status=404, content_type="application/json")

        return Response(
            response.content,
            status=response.status_code,
            content_type=response.headers.get("Content-Type", "application/json"),
        )

    except requests.Timeout:
        return jsonify({"error": {"message": "BMF request timed out (90s). Try a shorter prompt."}}), 504
    except requests.ConnectionError as e:
        return jsonify({"error": {"message": f"Connection error — check Bosch VPN. Detail: {str(e)[:200]}"}}), 502
    except Exception as e:
        return jsonify({"error": {"message": str(e)}}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
