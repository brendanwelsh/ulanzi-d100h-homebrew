# Hardware & HID enumeration

## Device
- **Ulanzi D100H Dial Creative Controller** — Bluetooth Low Energy **5.1** (advertised name "UlanziDial"), 1000 mAh battery. Full specs + official diagram: **[specs.md](specs.md)**.
- 1 stepless dial (rotate + press, with haptics) + 7 RGB keys.
  - **Haptic feedback only fires while the dial is connected to a host over Bluetooth.** With no active
    Bluetooth connection, the dial still rotates and presses but gives **no haptic buzz** — the motorised
    feedback is gated on the BLE link being up. *(Observed first-hand. The haptic linear motor is also the
    device's biggest power draw — see the battery-life note in [specs.md](specs.md).)*
- Pairs to up to 3 hosts at once; a switch on the underside cycles the paired device.
- **USB-C is charge-only — there is no wired data mode.** It talks to the host purely as a Bluetooth
  HID peripheral. The OS surfaces it through the normal HID stack, so `node-hid` / `hidapi` can open the
  readable interfaces just like a USB HID device.

## USB / HID identity
| Field | Value |
|-------|-------|
| Manufacturer string | `KEHWIN` |
| Product string | `Dial_Lite` |
| Vendor ID | `0xfff1` |
| Product ID | `0x0082` |

`0xfff1` is a generic / unregistered vendor ID that comes from the BLE controller chipset — which is
why the device doesn't look like "Ulanzi" at a glance. (Ulanzi's *wired* decks, e.g. the D200, use VID
`0x2207`. The D100H does **not**.)

**These IDs are the *device's* identity, not your machine's** — the same `KEHWIN` / `Dial_Lite` /
`0xfff1` / `0x0082` on every D100H and every host OS. So you can **hardcode them** to find the unit; you
don't have to enumerate or sniff to discover them (that's the point of writing them down here). They'd
only change if Ulanzi shipped firmware with a different USB descriptor.

## HID interfaces it exposes
The D100H is a composite device with 5 top-level HID collections:

| usagePage / usage | What it is | Readable on Windows? |
|---|---|---|
| `0x01 / 0x06` | **Keyboard** — keystrokes (the Ctrl+C/V/Z/Y buttons) | ❌ Windows reserves the system keyboard collection |
| `0x0c / 0x01` | **Consumer Control** — media + volume (dial + 3 media buttons) | ✅ yes |
| `0x01 / 0x02` | **Mouse** — unused by the default layout | ❌ reserved |
| `0xfff1 / 0x01` | Vendor-defined — only a periodic heartbeat observed | ✅ openable |
| `0xfffd / 0x01` | Vendor-defined — heartbeat roughly every 20 s | ✅ openable |

### Key consequences
- The **useful default input** (dial + the 3 media buttons) arrives on the **Consumer Control**
  interface, which you *can* read with `node-hid`.
- The **4 Ctrl-key buttons** arrive on the **Keyboard** interface, which Windows will not let an app
  read (opening it succeeds, but reads fail with "could not read from HID device"). So those 4 buttons
  are invisible to raw HID tooling — no amount of re-sniffing will reveal them.
- The vendor interfaces (`0xfff1`, `0xfffd`) only emitted a recurring heartbeat in testing — no
  per-button events were seen there. (If someone decodes a richer vendor protocol, please contribute.)

> To capture this on your own unit, run [`tools/sniff.js`](../tools/sniff.js).
