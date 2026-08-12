#!/usr/bin/env bash
# OTA local test server — serves a real RN bundle with a configurable policy.
#
# Usage: bash scripts/ota-serve.sh [--policy none|required|highly_recommended|recommended]
#        bash scripts/ota-serve.sh --help
#
# What it does:
#   1. Builds the RN bundle (frontend/index.android.bundle) if not already built
#   2. Computes SHA-256 of the bundle
#   3. Writes latest.json with lastRNVersion = <current>-ota-test (always triggers download)
#   4. Optionally injects a policies block to test different update dialogs
#   5. Starts an HTTP server on port 8080 + sets up adb reverse
#
# Safe to run repeatedly — never requires app uninstall.
# Stop with Ctrl+C — cleanup runs automatically.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$ROOT_DIR/frontend"
ANDROID_DIR="$ROOT_DIR/android"

PORT=8080
POLICY="${1:-none}"

# ── Parse args ───────────────────────────────────────────────────────────────

usage() {
    echo "Usage: $0 [--policy none|required|highly_recommended|recommended]"
    echo ""
    echo "  none              — download bundle only, no dialog (default)"
    echo "  recommended       — advisory dialog + download proceeds"
    echo "  highly_recommended — blocking dialog, download skipped, app opens"
    echo "  required          — full block, app cannot open"
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --policy) POLICY="$2"; shift 2 ;;
        --help|-h) usage ;;
        *) echo "Unknown argument: $1" >&2; exit 1 ;;
    esac
done

case "$POLICY" in
    none|required|highly_recommended|recommended) ;;
    *) echo "❌ Invalid policy: $POLICY. Must be none, required, highly_recommended or recommended." >&2; exit 1 ;;
esac

# ── Read current RN version from package.json ─────────────────────────────────

CURRENT_VERSION=$(python3 -c "
import json
with open('$FRONTEND_DIR/package.json') as f:
    d = json.load(f)
print(d['version'])
")
# Suffix includes policy name so each test variant is distinguishable in logs
OTA_VERSION="${CURRENT_VERSION}-ota-test-${POLICY}"

# ── Build bundle if not present ───────────────────────────────────────────────

BUNDLE_SRC="$ANDROID_DIR/app/src/main/assets/index.android.bundle"
if [ ! -f "$BUNDLE_SRC" ]; then
    echo "→ Bundle não encontrado — gerando bundle RN..."
    (cd "$FRONTEND_DIR" && yarn bundle:android)
    echo "✓ Bundle gerado"
else
    echo "✓ Bundle RN já existe ($(du -sh "$BUNDLE_SRC" | cut -f1)). Use 'make build-bundle' para regenerar."
fi

# ── Create serve dir ──────────────────────────────────────────────────────────

SERVE_DIR="$(mktemp -d)"

cleanup() {
    echo ""
    echo "→ Limpando..."
    adb reverse --remove tcp:$PORT 2>/dev/null || true
    rm -rf "$SERVE_DIR"
    echo "✓ Servidor encerrado."
    echo ""
    echo "O bundle baixado permanece no device em files/ota/bundle.js"
    echo "O app continua funcionando normalmente."
}
trap cleanup EXIT

cp "$BUNDLE_SRC" "$SERVE_DIR/bundle.js"

# ── Compute SHA-256 ───────────────────────────────────────────────────────────

echo "→ Calculando SHA-256..."
if command -v sha256sum &>/dev/null; then
    HASH="sha256:$(sha256sum "$SERVE_DIR/bundle.js" | awk '{print $1}')"
else
    HASH="sha256:$(shasum -a 256 "$SERVE_DIR/bundle.js" | awk '{print $1}')"
fi
echo "   $HASH"

# ── Read kotlin version ───────────────────────────────────────────────────────

KOTLIN_VERSION=$(grep 'versionName\s*=' "$ANDROID_DIR/app/build.gradle.kts" | head -1 | sed 's/.*"\(.*\)".*/\1/' || echo "0.0.0")

# ── Build policies block ──────────────────────────────────────────────────────

RELEASE_PAGE="https://github.com/paulopotter/my-kavita-app-reader/releases/latest"

build_policy_entry() {
    local level="$1"
    # minVersion "9999.99.99" never matches any real install → policy always applies
    echo "{\"type\": \"rn\", \"minVersion\": \"9999.99.99\", \"releaseNotesUrl\": \"$RELEASE_PAGE\"}"
}

case "$POLICY" in
    none)
        POLICIES_JSON="null"
        ;;
    required)
        ENTRY=$(build_policy_entry required)
        POLICIES_JSON="{\"required\": [$ENTRY], \"highly_recommended\": [], \"recommended\": []}"
        ;;
    highly_recommended)
        ENTRY=$(build_policy_entry highly_recommended)
        POLICIES_JSON="{\"required\": [], \"highly_recommended\": [$ENTRY], \"recommended\": []}"
        ;;
    recommended)
        ENTRY=$(build_policy_entry recommended)
        POLICIES_JSON="{\"required\": [], \"highly_recommended\": [], \"recommended\": [$ENTRY]}"
        ;;
esac

# ── Write latest.json ─────────────────────────────────────────────────────────

echo "→ Gerando latest.json..."
cat > "$SERVE_DIR/latest.json" <<JSON
{
  "lastRNVersion": "$OTA_VERSION",
  "url": "http://localhost:$PORT/bundle.js",
  "bundleHash": "$HASH",
  "minKotlinVersion": "0.0.0",
  "lastAppVersion": "2000.01.01.0000",
  "policies": $POLICIES_JSON
}
JSON

echo "   lastRNVersion : $OTA_VERSION"
echo "   policy        : $POLICY"
echo "   bundleHash    : $HASH"

# ── adb reverse ───────────────────────────────────────────────────────────────

echo "→ Configurando adb reverse tcp:$PORT..."
adb reverse tcp:$PORT tcp:$PORT
echo "   ✓ Dispositivo alcança localhost:$PORT"

# ── Start HTTP server ─────────────────────────────────────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Servidor OTA rodando em http://localhost:$PORT"
echo "  latest.json : http://localhost:$PORT/latest.json"
echo "  bundle.js   : http://localhost:$PORT/bundle.js"
echo ""
echo "  Versão servida : $OTA_VERSION"
echo "  Policy         : $POLICY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Próximo passo: abra o app (ou feche e reabra se já estiver rodando)"
echo "O OTA verifica o manifest na splash — o download inicia automaticamente."
echo ""
echo "Para verificar o bundle baixado no device:"
echo "  adb shell run-as com.mymangareader ls -la files/ota/"
echo ""
echo "Para acompanhar os logs:"
echo "  adb logcat -s OtaManager"
echo ""
echo "Pressione Ctrl+C para encerrar."
echo ""

cd "$SERVE_DIR" && python3 -m http.server $PORT --bind 0.0.0.0
