# Specifications & confirmed layout (from the official manual)

All values below are from the official **Ulanzi D100H** user manual (model D100H, "Dial Editing Assistant").

## Confirmed button layout
The manual's *Factory Default Function* page confirms the 7-key + dial layout (and the exact offline map):

![Official D100H default-function diagram](images/d100h-default-functions.png)

*Figure © Ulanzi, from the official D100H manual (linked in [resources.md](resources.md)) — included for reference.*

- **Top row (3 keys):** Previous Track · Play/Pause · Next Track — media transport (**Consumer** HID page, readable)
- **Left side:** Paste (Ctrl+V, top) · Copy (Ctrl+C, bottom)
- **Right side:** Redo (Ctrl+Y, top) · Undo (Ctrl+Z, bottom) — the 4 editing keys (**Keyboard** HID page, not readable on Windows)
- **Dial:** rotate = Volume Up / Volume Down · press = Mute/Unmute

There is also a separate **device-switch button** (not one of the 7 macro keys): short-press cycles the
up-to-3 paired Bluetooth devices; press-and-hold 3 s enters pairing mode (status LED 1/2/3 shows the active device).

## Specs
| | |
|---|---|
| Model | D100H ("Dial Editing Assistant") |
| Bluetooth | **BLE 5.1**, range ≥10 m; advertised name **"UlanziDial"** |
| Connection | Bluetooth only — **USB-C is charge-only (no data mode)** |
| Paired devices | up to 3 simultaneously |
| Battery | 3.7 V 1000 mAh Li-Po · standby 200 µA · ~2.5 h charge |
| Charging | Type-C, 5 V ⎓ 2 A |
| Weight | 260 g |
| Materials | ABS+PC body, aluminium-alloy knob, silicone anti-slip pad; built-in magnetic mount |
| OS support | Windows 10+ · macOS 11+ (Intel) / 10.13+ (Apple Silicon) |

## Factory reset
Power off → hold **Knob + device-switch button** together → power on → status LED [1] flashes = reset complete.

> Over HID the device enumerates as **"KEHWIN / Dial_Lite", VID `0xfff1` / PID `0x0082`** (the BLE-chipset
> identity), even though its advertised Bluetooth name is **"UlanziDial"**. See [hardware.md](hardware.md).
