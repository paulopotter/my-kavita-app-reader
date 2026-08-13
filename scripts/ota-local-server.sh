#!/usr/bin/env bash
# OTA local test server
# Usage: bash scripts/ota-local-server.sh
#
# What it does:
#   1. Builds a minimal JS bundle (one line) pretending to be a newer version
#   2. Computes its SHA-256
#   3. Writes latest.json pointing to localhost:8080
#   4. Starts an HTTP server on port 8080
#   5. Sets up adb reverse so the device reaches localhost:8080
#
# Stop with Ctrl+C — cleanup runs automatically.

set -euo pipefail

PORT=8080
SERVE_DIR="$(mktemp -d)"
FAKE_RN_VERSION="0.1.1-rc1"   # must be > current frontend version to trigger download

cleanup() {
    echo ""
    echo "→ Limpando..."
    adb reverse --remove tcp:$PORT 2>/dev/null || true
    rm -rf "$SERVE_DIR"
    echo "✓ Servidor encerrado."
}
trap cleanup EXIT

# ── 1. Build fake bundle ────────────────────────────────────────────────────
echo "→ Gerando bundle de teste (v$FAKE_RN_VERSION)..."
BUNDLE_FILE="$SERVE_DIR/bundle.js"
cat > "$BUNDLE_FILE" <<'BUNDLE'
// OTA test bundle — not a real React Native bundle
// The app will download and store this file, then load it on next boot.
// To verify: adb shell run-as com.mymangareader ls files/ota/
console.log("OTA bundle loaded: test version");
BUNDLE

# ── 2. Compute SHA-256 ──────────────────────────────────────────────────────
echo "→ Calculando SHA-256..."
if command -v sha256sum &>/dev/null; then
    HASH="sha256:$(sha256sum "$BUNDLE_FILE" | awk '{print $1}')"
else
    # macOS
    HASH="sha256:$(shasum -a 256 "$BUNDLE_FILE" | awk '{print $1}')"
fi
echo "   $HASH"

# ── 3. Write latest.json ────────────────────────────────────────────────────
echo "→ Gerando latest.json..."
cat > "$SERVE_DIR/latest.json" <<JSON
{
  "lastRNVersion": "$FAKE_RN_VERSION",
  "url": "http://localhost:$PORT/bundle.js",
  "bundleHash": "$HASH",
  "minKotlinVersion": "0.1.0",
  "lastAppVersion": "2026.01.01.0000",
  "policies": null,
  "bundleBuildTimeMs": $(date +%s000)
}
JSON

echo "   lastRNVersion : $FAKE_RN_VERSION"
echo "   bundleHash    : $HASH"

# ── 4. adb reverse ─────────────────────────────────────────────────────────
echo "→ Configurando adb reverse tcp:$PORT..."
adb reverse tcp:$PORT tcp:$PORT
echo "   ✓ Dispositivo vai alcançar localhost:$PORT"

# ── 5. Start HTTP server ────────────────────────────────────────────────────
echo ""
echo "✓ Servidor OTA rodando em http://localhost:$PORT"
echo "  latest.json : http://localhost:$PORT/latest.json"
echo "  bundle.js   : http://localhost:$PORT/bundle.js"
echo ""
echo "Próximos passos:"
echo "  1. Em outro terminal, adicione ao .env:"
echo "       OTA_MANIFEST_URL=http://localhost:$PORT/latest.json"
echo "     Depois rode: make build-android && make deploy"
echo "  2. Observe os logs: adb logcat -s OtaManager"
echo "  3. A splash vai baixar o bundle — ao terminar aparece 'Atualizar agora'"
echo "  4. Toque no botão — o app reinicia carregando o novo bundle"
echo "  5. Verifique o arquivo baixado:"
echo "       adb shell run-as com.mymangareader ls -la files/ota/"
echo ""
echo "Pressione Ctrl+C para encerrar."
echo ""

cd "$SERVE_DIR" && python3 -m http.server $PORT --bind 0.0.0.0
