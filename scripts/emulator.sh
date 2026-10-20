#!/usr/bin/env bash
# Boot (or stop) the emulator used for the docs screenshots.
#
#   scripts/emulator.sh start   create the AVD if it is missing, boot it, wait until Android is up
#   scripts/emulator.sh stop    shut it down (this emulator only, never other VMs)
#
# HEADLESS=1 boots without a window. The AVD matches the phone the screenshots were designed on:
# 1080x2640 at 480 dpi, so the layout is the same.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AVD="docs-screenshots"
SERIAL="emulator-5554"

SDK="${ANDROID_HOME:-}"
if [ -z "$SDK" ] && [ -f "$ROOT/android/local.properties" ]; then
  SDK="$(sed -n 's/^sdk\.dir=//p' "$ROOT/android/local.properties")"
fi
[ -d "$SDK" ] || { echo "Android SDK not found: set ANDROID_HOME or sdk.dir in android/local.properties" >&2; exit 1; }
ADB="$SDK/platform-tools/adb"
EMULATOR="$SDK/emulator/emulator"

case "$(uname -m)" in
  arm64) ABI="arm64-v8a" ;;
  *)     ABI="x86_64" ;;
esac
IMAGE="system-images;android-35;google_apis;$ABI"

ensure_installed() {
  if [ ! -x "$EMULATOR" ] || [ ! -d "$SDK/system-images/android-35/google_apis/$ABI" ]; then
    echo "→ installing the emulator and $IMAGE (several GB)..."
    # stdin closed: a license that still needs accepting fails here instead of being accepted for you
    "$SDK/cmdline-tools/latest/bin/sdkmanager" --install "emulator" "$IMAGE" < /dev/null
  fi
}

ensure_avd() {
  if "$EMULATOR" -list-avds | grep -qx "$AVD"; then return; fi
  echo "→ creating the AVD $AVD..."
  echo no | ANDROID_HOME="$SDK" "$SDK/cmdline-tools/latest/bin/avdmanager" create avd \
    -n "$AVD" -k "$IMAGE" -d pixel_6 --force >/dev/null 2>&1 || true   # it complains about devices.xml but writes the AVD
  local cfg="$HOME/.android/avd/$AVD.avd/config.ini"
  [ -f "$cfg" ] || { echo "AVD was not created" >&2; exit 1; }
  for kv in hw.lcd.width=1080 hw.lcd.height=2640 hw.lcd.density=480 hw.ramSize=4096 hw.keyboard=yes \
            disk.dataPartition.size=8G showDeviceFrame=no; do
    key="${kv%%=*}"
    if grep -q "^$key=" "$cfg"; then sed -i '' "s|^$key=.*|$kv|" "$cfg"; else echo "$kv" >> "$cfg"; fi
  done
}

# macOS Hypervisor.framework on 12th-gen+ Intel: the Android 35 kernel executes TPAUSE (WAITPKG) and the
# guest dies with "invalid opcode" a second into boot. The CPU model cannot mask it, so the kernel is told
# to ignore the feature. -append replaces the emulator's own command line, hence the full default below.
DEFAULT_CMDLINE='8250.nr_uarts=1 clocksource=pit no_timer_check console=ttyS0,38400 earlyprintk=ttyS0 ndns=2 loop.max_part=7 ramoops.mem_address=0xff018000 ramoops.mem_size=0x10000 memmap=0x10000$0xff018000 printk.devkmsg=on bootconfig'

needs_waitpkg_workaround() {
  [ "$ABI" = "x86_64" ] && sysctl -n machdep.cpu.leaf7_features 2>/dev/null | grep -qw WAITPKG
}

start() {
  if "$ADB" devices | grep -q "^$SERIAL"; then echo "$SERIAL is already running"; return; fi
  ensure_installed
  ensure_avd
  local window=() extra=()
  [ "${HEADLESS:-}" = "1" ] && window=(-no-window)
  needs_waitpkg_workaround && extra=(-qemu -append "$DEFAULT_CMDLINE clearcpuid=waitpkg")
  echo "→ booting $AVD (about 2 minutes)..."
  nohup "$EMULATOR" -avd "$AVD" -no-snapshot -no-boot-anim -no-audio -gpu swiftshader_indirect \
    ${window[@]+"${window[@]}"} ${extra[@]+"${extra[@]}"} > "${TMPDIR:-/tmp}/$AVD.log" 2>&1 &
  for _ in $(seq 1 120); do
    if [ "$("$ADB" -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; then
      echo "✓ $SERIAL is up"; return
    fi
    sleep 5
  done
  echo "the emulator did not finish booting; see ${TMPDIR:-/tmp}/$AVD.log" >&2
  exit 1
}

stop() {
  if "$ADB" devices | grep -q "^$SERIAL"; then
    "$ADB" -s "$SERIAL" emu kill >/dev/null 2>&1 || true
    echo "✓ $SERIAL stopped"
  else
    echo "$SERIAL is not running"
  fi
}

case "${1:-}" in
  start) start ;;
  stop)  stop ;;
  *) echo "usage: $0 start|stop" >&2; exit 2 ;;
esac
