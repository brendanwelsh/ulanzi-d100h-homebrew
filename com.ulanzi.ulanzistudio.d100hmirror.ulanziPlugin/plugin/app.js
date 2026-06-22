// D100H Mirror — UlanziDeck companion plugin main service (Node v20).
//
// Two jobs on every trigger, so nothing gets "tied up":
//   (a) BROADCAST the event on a localhost WebSocket so docs/dial-viewer.html
//       reacts live  ->  {type:'rotate',dir} / {type:'press'} / {type:'button',key}
//   (b) REPLAY the control's real function (the per-key/dial choice from the
//       Property Inspector): hotkey / media key / volume up-down / text.
//
// This process is BOTH the WS server (broadcaster) and the Studio action
// handler. The viewer is the WS client.
//
// SDK gotcha (see docs/plugin-sdk.md): decodeContext gives {uuid,key,actionid}
// where `uuid` is the action TYPE and `actionid` is a per-instance GUID. We key
// settings by the full `context` and never compare actionid to an action UUID.

import { WebSocketServer } from "ws";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

import { UlanziApi } from "../ulanzi-api/index.js";

const PLUGIN_UUID = "com.ulanzi.ulanzistudio.d100hmirror";
const VIEWER_PORT = Number(process.env.D100H_MIRROR_PORT) || 48907; // ws://127.0.0.1:48907
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PS1 = path.join(__dirname, "keysender.ps1");

const log = (...a) => console.log("[d100h-mirror]", ...a);

// ---------------------------------------------------------------------------
// (a) WebSocket broadcaster — the viewer connects here as a client
// ---------------------------------------------------------------------------
let wss = null;
try {
  wss = new WebSocketServer({ host: "127.0.0.1", port: VIEWER_PORT });
  wss.on("listening", () => log(`viewer bridge listening on ws://127.0.0.1:${VIEWER_PORT}`));
  wss.on("connection", () => log("viewer connected"));
  wss.on("error", (e) => log("viewer bridge error:", e.message));
} catch (e) {
  log("could not start viewer bridge:", e.message);
}

function broadcast(obj) {
  if (!wss) return;
  const s = JSON.stringify(obj);
  for (const c of wss.clients) {
    if (c.readyState === 1 /* OPEN */) {
      try { c.send(s); } catch { /* ignore a dead client */ }
    }
  }
}

// ---------------------------------------------------------------------------
// (b) Windows key/media replay — one long-lived PowerShell helper over stdin
// ---------------------------------------------------------------------------
const IS_WIN = process.platform === "win32";
let ks = null;

function ksSpawn() {
  if (!IS_WIN) return;
  try {
    ks = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", PS1],
      { windowsHide: true, stdio: ["pipe", "ignore", "ignore"] }
    );
    ks.on("exit", () => { ks = null; });
    ks.on("error", (e) => { log("keysender error:", e.message); ks = null; });
  } catch (e) {
    log("keysender spawn failed:", e.message);
    ks = null;
  }
}

function ksWrite(line) {
  if (!IS_WIN) return;
  if (!ks || ks.killed || !ks.stdin || !ks.stdin.writable) ksSpawn();
  try { ks && ks.stdin.write(line); } catch (e) { ks = null; }
}

function sendChord(vks) {
  if (!vks || !vks.length) return;
  ksWrite("chord|" + vks.map((v) => v.toString(16)).join(" ") + "\n");
}

function sendText(s) {
  if (!s) return;
  ksWrite("text|" + escapeSendKeys(s) + "\n");
}

// SendKeys treats + ^ % ~ ( ) { } [ ] specially — brace-escape them, and turn
// newlines/tabs into the SendKeys tokens.
function escapeSendKeys(s) {
  return String(s)
    .replace(/[+^%~(){}\[\]]/g, (m) => "{" + m + "}")
    .replace(/\r\n|\r|\n/g, "{ENTER}")
    .replace(/\t/g, "{TAB}");
}

// ---- virtual-key tables (Windows VK codes) ----
const MEDIA = { playpause: 0xb3, play: 0xb3, pause: 0xb3, next: 0xb0, prev: 0xb1, previous: 0xb1, stop: 0xb2, mute: 0xad };
const VOLUME = { up: 0xaf, down: 0xae, mute: 0xad };
const MODS = { ctrl: 0x11, control: 0x11, ctl: 0x11, shift: 0x10, alt: 0x12, option: 0x12, win: 0x5b, cmd: 0x5b, command: 0x5b, meta: 0x5b, super: 0x5b };
const NAMED = {
  enter: 0x0d, return: 0x0d, esc: 0x1b, escape: 0x1b, space: 0x20, spacebar: 0x20, tab: 0x09,
  backspace: 0x08, back: 0x08, delete: 0x2e, del: 0x2e, insert: 0x2d, ins: 0x2d,
  home: 0x24, end: 0x23, pageup: 0x21, pgup: 0x21, pagedown: 0x22, pgdn: 0x22,
  up: 0x26, down: 0x28, left: 0x25, right: 0x27, printscreen: 0x2c, prtsc: 0x2c, capslock: 0x14,
  ";": 0xba, "=": 0xbb, plus: 0xbb, ",": 0xbc, "-": 0xbd, minus: 0xbd, ".": 0xbe, "/": 0xbf,
  "`": 0xc0, "[": 0xdb, "\\": 0xdc, "]": 0xdd, "'": 0xde,
};

function tokenToVk(tok) {
  tok = tok.toLowerCase();
  if (tok in MODS) return { mod: true, vk: MODS[tok] };
  if (/^[a-z]$/.test(tok)) return { mod: false, vk: tok.toUpperCase().charCodeAt(0) };
  if (/^[0-9]$/.test(tok)) return { mod: false, vk: 0x30 + Number(tok) };
  const f = tok.match(/^f([1-9]|1[0-9]|2[0-4])$/);
  if (f) return { mod: false, vk: 0x6f + Number(f[1]) };
  const np = tok.match(/^numpad([0-9])$/);
  if (np) return { mod: false, vk: 0x60 + Number(np[1]) };
  if (tok in NAMED) return { mod: false, vk: NAMED[tok] };
  return null;
}

// "Ctrl+Shift+K" -> [0x10, 0x11, 0x4B] (modifiers first, one main key). null if unparseable.
function parseHotkey(str) {
  if (!str) return null;
  const toks = String(str).split("+").map((t) => t.trim()).filter(Boolean);
  const mods = [];
  let main = null;
  for (const t of toks) {
    const v = tokenToVk(t);
    if (!v) continue;
    if (v.mod) { if (!mods.includes(v.vk)) mods.push(v.vk); }
    else main = v.vk;
  }
  if (main == null) return null;
  return [...mods, main];
}

// ---- the per-control "also do this" replay ----
function replayKey(s) {
  switch (s.keyDo || "none") {
    case "hotkey": { const v = parseHotkey(s.keyHotkey); if (v) sendChord(v); break; }
    case "media":  { const v = MEDIA[s.keyMedia || "playpause"]; if (v) sendChord([v]); break; }
    case "volume": { const v = VOLUME[s.keyVolume || "up"]; if (v) sendChord([v]); break; }
    case "text":   sendText(s.keyText); break;
    default: break; // none
  }
}

function replayDialRotate(s, dir /* 'right' | 'left' */) {
  switch (s.rotateDo || "volume") {
    case "volume": sendChord([dir === "right" ? 0xaf : 0xae]); break;
    case "media":  sendChord([dir === "right" ? 0xb0 : 0xb1]); break;
    case "arrows": sendChord([dir === "right" ? 0x27 : 0x25]); break;
    default: break; // none
  }
}

function replayDialPress(s) {
  switch (s.pressDo || "mute") {
    case "mute":      sendChord([0xad]); break;
    case "playpause": sendChord([0xb3]); break;
    case "hotkey":    { const v = parseHotkey(s.pressHotkey); if (v) sendChord(v); break; }
    default: break; // none
  }
}

// ---------------------------------------------------------------------------
// Studio connection + per-instance settings cache
// ---------------------------------------------------------------------------
const SETTINGS = {}; // context -> saved Property-Inspector settings
const getSettings = (ctx) => SETTINGS[ctx] || {};

function cache(jsn) {
  if (jsn && jsn.context && jsn.param && typeof jsn.param === "object" && !Array.isArray(jsn.param)) {
    SETTINGS[jsn.context] = jsn.param;
  }
}

const $UD = new UlanziApi();
$UD.connect(PLUGIN_UUID);
$UD.onConnected(() => log("connected to Ulanzi Studio"));
// The SDK emits 'error' on the EventEmitter; without a listener Node would throw.
$UD.onError((e) => log("studio socket error:", typeof e === "string" ? e : (e && e.message) || e));
$UD.onClose(() => log("studio socket closed"));

// Settings lifecycle (both actions share these).
$UD.onAdd((jsn) => cache(jsn));
$UD.onParamFromApp((jsn) => cache(jsn));
$UD.onParamFromPlugin((jsn) => cache(jsn));
$UD.onClear((jsn) => {
  if (Array.isArray(jsn.param)) {
    for (const p of jsn.param) if (p && p.context) delete SETTINGS[p.context];
  }
});

// ---- Keys (Keypad action) ----
// onRun is the confirmed single-press trigger: light the viewer + replay.
$UD.onRun((jsn) => {
  broadcast({ type: "button", key: jsn.key });
  replayKey(getSettings(jsn.context));
});
// onKeyDown gives an immediate light (harmless if it also fires alongside run);
// replay stays on onRun only so the function never double-fires.
$UD.onKeyDown((jsn) => broadcast({ type: "button", key: jsn.key }));
$UD.onKeyUp(() => { /* nothing to mirror on release */ });

// ---- Dial (Encoder action) ----
$UD.onDialRotate((jsn) => {
  const right = String(jsn.rotateEvent || "").includes("right");
  broadcast({ type: "rotate", dir: right ? 1 : -1 });
  replayDialRotate(getSettings(jsn.context), right ? "right" : "left");
});
$UD.onDialDown((jsn) => {
  broadcast({ type: "press" });
  replayDialPress(getSettings(jsn.context));
});
$UD.onDialUp(() => { /* nothing to mirror on release */ });

// ---------------------------------------------------------------------------
if (IS_WIN) ksSpawn();
else log("non-Windows: viewer mirroring works, native key/media replay is Windows-only");

function shutdown() { try { ks && ks.kill(); } catch {} try { wss && wss.close(); } catch {} process.exit(0); }
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
