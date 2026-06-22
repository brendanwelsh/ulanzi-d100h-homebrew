# D100H Mirror — the companion plugin

A small UlanziDeck plugin that makes the on-screen [dial viewer](dial-viewer.html) work **while Ulanzi
Studio is running**. Over WebHID the page can only read the dial + 3 media keys, and only with Studio
closed (see the [README](../README.md) TL;DR). This plugin solves both: it runs *inside* Studio, so it
sees all 7 keys and the dial, and it forwards every event to the viewer over a localhost WebSocket.

It does **two things on every press/turn** so nothing is "tied up":

1. **Mirror** — broadcasts the event to the viewer (`ws://127.0.0.1:48907`) so the on-screen knob spins
   and the keys light up live.
2. **Replay** — still performs the control's *real* job: a per-key **Hotkey / Media key / Volume / Text**,
   and for the dial **volume on turn, mute on press** (all configurable in the Property Inspector).

Source: [`com.ulanzi.ulanzistudio.d100hmirror.ulanziPlugin/`](../com.ulanzi.ulanzistudio.d100hmirror.ulanziPlugin).

---

## Install

1. Copy the whole **`com.ulanzi.ulanzistudio.d100hmirror.ulanziPlugin`** folder into:
   ```
   %APPDATA%\Ulanzi\UlanziDeck\Plugins\
   ```
   (paste `%APPDATA%\Ulanzi\UlanziDeck\Plugins` into the Explorer address bar — it expands to your
   real AppData path.)
2. **Fully quit and reopen Ulanzi Studio.** The plugin's two actions then appear under a **D100H Mirror**
   category in the action list.

No `npm install` needed — the one runtime dependency (`ws`) is vendored inside the folder, and the
plugin runs on Studio's bundled **Node.js v20**.

> Windows is the target. The **mirror** half works anywhere Studio runs; the **replay** half (sending
> real keystrokes/media keys) is Windows-only — it shells out to a tiny PowerShell helper
> (`plugin/keysender.ps1`). On macOS the keys/dial still mirror to the viewer; they just don't re-emit
> the key.

## Bind the two actions

The D100H's **knob** and **keys** are configured on **separate tabs** in Studio.

- **Knob tab →** drag **D100H Mirror › Dial (mirror + replay)** onto the dial.
- **Buttons tab →** drag **D100H Mirror › Key (mirror + replay)** onto **each** of the 7 keys you want
  mirrored. (One action instance per key.)

Both actions declare `"Devices": []`, so they're offered for the D100H (and any other UlanziDeck device).

## Set the "also do this" per control

Click a bound action to open its **Property Inspector**:

**Key (mirror + replay)** — pick what the key should also do:

| Option | What it sends |
|--------|---------------|
| Nothing (mirror only) | only lights the on-screen key |
| Hotkey | a key combo, e.g. `Ctrl+C`, `Ctrl+Shift+Z`, `F13` |
| Media key | Play/Pause · Next · Previous · Stop |
| Volume | Up · Down · Mute |
| Type text | types the text (`{ENTER}` / `{TAB}` become real keypresses) |

**Dial (mirror + replay)** — defaults reproduce the factory dial, so it just works if you leave it:

| Setting | Default | Other choices |
|---------|---------|---------------|
| On rotate | **Volume up / down** | Media next/prev · Arrow keys right/left · Nothing |
| On press | **Mute** | Play/Pause · Hotkey · Nothing |

> Plugin action settings are **not** written to the profile JSON — they live in Studio's settings store
> and reach the plugin at runtime (see [ulanzi-studio.md](ulanzi-studio.md)). So configure them here in
> the Property Inspector, not by editing files.

## See it mirror

1. Keep Ulanzi Studio running with the actions bound.
2. Open **[docs/dial-viewer.html](dial-viewer.html)** (or the
   [live page](https://brendanwelsh.github.io/ulanzi-d100h-homebrew/dial-viewer.html)).
3. Leave the box set to `ws://127.0.0.1:48907` and click **🔌 Connect plugin (WebSocket)**. The status
   pill turns green.
4. Turn the knob → the on-screen knob spins. Press a key → it flashes. Press the knob (over USB) → it pulses.

**If a key lights the wrong on-screen key**, click **🎯 Calibrate** in the viewer and press each key when
prompted. The viewer learns *your* unit's real key slot ids (it ships with a best-guess default map).
The mapping is saved in your browser.

## Use it as an OBS overlay

[`docs/dial-browser-source.html`](dial-browser-source.html) is a clean, chrome-free version of the dial —
no header, buttons, labels, or log, on a **transparent background** — meant to be a live on-stream
overlay. It **auto-connects** to the plugin bridge (and reconnects on its own), since an OBS Browser
source can't click a button.

1. In OBS: **Sources → + → Browser**, point **Local file** at `dial-browser-source.html` (or use the
   Pages URL), and set the width/height you want — the whole dial scales to fit inside it.
2. Keep Studio + the plugin running; the dial animates as you turn/press.

Query params (optional): `?ws=ws://127.0.0.1:48907` (bridge URL), `?w=420` (pin width in px),
`?bg=%230f1115` (page background for previewing). It reuses any Calibrate map saved by the tester
(same origin), so keys land in the right spot there too.

---

## How it works

```
 D100H ──BT──► Ulanzi Studio ──action events──► plugin/app.js
                                                   │
                          (a) broadcast ───────────┼──► ws://127.0.0.1:48907 ──► dial-viewer.html
                          (b) replay ──────────────┴──► keysender.ps1 ──► Windows input (hotkey/media/volume/text)
```

- `plugin/app.js` is **both** the WebSocket **server** (the broadcaster the viewer connects to) **and**
  the Studio action handler. The viewer is the client.
- Messages match what the viewer already listens for:
  `{type:'rotate',dir:1|-1}` · `{type:'press'}` · `{type:'button',key:'<row_col>'}`.
- Replay uses one long-lived PowerShell process fed over stdin (`chord|<vk codes>` / `text|<keys>`), so
  rapid dial turns stay low-latency instead of spawning a process per tick.
- Events handled: keys `onAdd` / `onKeyDown` / `onKeyUp` / `onRun` (run = the replay trigger); dial
  `onDialRotate` (left/right/hold-left/hold-right) / `onDialDown` / `onDialUp`. Settings are keyed by the
  full `context`; the plugin uses the action **`uuid`** (type), never `actionid` — the
  [decodeContext gotcha](plugin-sdk.md#the-gotcha-that-costs-everyone-an-afternoon).

## Layout

```
com.ulanzi.ulanzistudio.d100hmirror.ulanziPlugin/
├── manifest.json          # plugin UUID (4 segments) + Encoder & Keypad actions (5 segments), Devices:[]
├── plugin/
│   ├── app.js             # main service: WS broadcaster + replay
│   └── keysender.ps1      # long-lived Windows key/media injector
├── property-inspector/    # key.html/.js  +  dial.html/.js  (the "also do this" config)
├── ulanzi-api/            # vendored Node main-service SDK (plugin-common-node)
├── libs/                  # vendored common-html SDK for the Property Inspector
├── node_modules/ws/       # the only runtime dependency, vendored for drop-in install
└── package.json
```

Built against the official SDK shapes — see [resources.md](resources.md) for the
`UlanziDeckPlugin-SDK`, `plugin-common-node`, and `plugin-common-html` repos, and
[plugin-sdk.md](plugin-sdk.md) for the anatomy and pitfalls.

## Troubleshooting

- **Actions don't appear** — make sure you fully quit Studio before reopening, and that the folder name
  ends in `.ulanziPlugin` and sits directly in `…\UlanziDeck\Plugins\`.
- **Viewer won't connect** — the plugin only starts its bridge once Studio loads it; confirm Studio is
  running and an action is bound, then click Connect. The bridge is `127.0.0.1` only (no firewall prompt).
- **Keys mirror but don't do their job** — replay is Windows-only; check the Property Inspector isn't set
  to "Nothing", and that the hotkey string parses (letters, digits, `F1`–`F24`, `Ctrl/Shift/Alt/Win`,
  and common named keys are supported).
- **Knob press does nothing** — the D100H only sends the press over **USB** (see
  [hardware.md](hardware.md)); rotation works on Bluetooth alone.
