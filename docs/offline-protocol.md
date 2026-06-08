# Offline (Standalone) mode — default codes

With Ulanzi Studio **not running**, the D100H sends a fixed set of standard HID codes. **These are not
customizable and do not change even if you remap things in Studio** — custom layouts don't persist to
the device (see [ulanzi-studio.md](ulanzi-studio.md)).

## Default map
| Control | Sends | HID page | Readable? |
|---|---|---|---|
| Dial rotate CW | Volume Up (`0xE9`) | Consumer | ✅ |
| Dial rotate CCW | Volume Down (`0xEA`) | Consumer | ✅ |
| Dial press | Mute (`0xE2`) | Consumer | ✅ |
| Button | Previous Track (`0xB6`) | Consumer | ✅ |
| Button | Play / Pause (`0xCD`) | Consumer | ✅ |
| Button | Next Track (`0xB5`) | Consumer | ✅ |
| Button | Copy = Ctrl+C | Keyboard | ❌ |
| Button | Paste = Ctrl+V | Keyboard | ❌ |
| Button | Undo = Ctrl+Z | Keyboard | ❌ |
| Button | Redo = Ctrl+Y | Keyboard | ❌ |

Per the official manual, the standalone presets are: *Previous, Play/Pause, Next, Knob, Paste, Copy,
Undo, Redo* — which matches the above (3 media buttons + 4 editing shortcuts + the volume knob).

## Consumer Control report format
Reports on the Consumer interface (`usagePage 0x0c`) are 3 bytes — a report id, then a little-endian
16-bit usage code:
```
[ 0x02, usageLow, usageHigh ]

02 E9 00   → Volume Up
02 EA 00   → Volume Down
02 E2 00   → Mute
02 B6 00   → Previous Track
02 CD 00   → Play / Pause
02 B5 00   → Next Track
02 00 00   → release (key up) — ignore
```
Note: `node-hid` may or may not prepend a leading report-id byte depending on the device/OS. Scan for
the start of the frame rather than hard-coding an offset.

## What this means for homebrew
- You **can** drive your own software from the dial + the 3 media buttons by reading the Consumer
  interface — **but** those are real volume/media keys, so the OS will *also* act on them (your volume
  moves, your media skips) unless you suppress the keys at the OS level (e.g. a low-level hook). Note a
  global media-key hook can't tell the dial apart from your keyboard's media keys.
- The 4 Ctrl-key buttons are effectively **unusable** for HID-only homebrew on Windows: you can't read
  them, and you can't safely repurpose Ctrl+C/V/Z/Y anyway.
- **Net:** a true "no Ulanzi app" build caps at **dial + 3 buttons, with volume/media side effects.**
  For all 7 buttons cleanly, you need Ulanzi Studio running (a plugin, or a hotkey remap + a listener).
