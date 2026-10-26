#!/usr/bin/env bash
# Pairs a phone with adb over Wi-Fi by QR code, from the terminal (what Android Studio does).
#
# On the phone: Developer options -> Wireless debugging -> "Pair device with QR code", then scan
# the code this prints. The phone then advertises a pairing service on the network under the random
# name below; this waits for it and runs `adb pair` with the matching password.
#
# adb's default mDNS backend sometimes never sees the phone's pairing service even though the Mac
# does (dns-sd lists it). The server is restarted with the openscreen backend, which finds it.
#
# Needs `qrencode` (brew install qrencode). adb defaults to the SDK path this project uses; set
# ADB to use another one.
set -euo pipefail

ADB="${ADB:-/usr/local/share/android-commandlinetools/platform-tools/adb}"
TIMEOUT_S="${TIMEOUT_S:-120}"

command -v qrencode >/dev/null || { echo "qrencode not found — brew install qrencode" >&2; exit 1; }
[ -x "$ADB" ] || { echo "adb not found at $ADB — set ADB=/path/to/adb" >&2; exit 1; }

# Restarts the adb server, so any other adb session is dropped for a moment.
"$ADB" kill-server
ADB_MDNS_OPENSCREEN=1 "$ADB" start-server >/dev/null

NAME="adb-pair-$RANDOM"
PASSWORD="$RANDOM$RANDOM"

qrencode -t ANSIUTF8 "WIFI:T:ADB;S:${NAME};P:${PASSWORD};;"
echo
echo "Scan it on the phone (Wireless debugging -> Pair device with QR code). Waiting up to ${TIMEOUT_S}s..."

deadline=$((SECONDS + TIMEOUT_S))
while [ "$SECONDS" -lt "$deadline" ]; do
  # Line shape: "<name>  _adb-tls-pairing._tcp  <ip>:<port>"
  target=$("$ADB" mdns services 2>/dev/null | awk -v n="$NAME" '$1 == n && $2 == "_adb-tls-pairing._tcp" { print $3; exit }')
  if [ -n "${target:-}" ]; then
    echo "Pairing with $target"
    "$ADB" pair "$target" "$PASSWORD"
    echo "Paired. The phone shows up in 'adb devices' in a few seconds."
    exit 0
  fi
  sleep 1
done

echo "Timed out: the phone never announced the pairing service. Is it on the same Wi-Fi network?" >&2
exit 1
