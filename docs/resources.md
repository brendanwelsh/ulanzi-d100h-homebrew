# Resources

## Official (Ulanzi)
- **Product page:** https://www.ulanzi.com/products/d100h-dial-creative-controller-i003
- **User manual:** https://manuals.plus/ulanzi/d100h-dial-creative-controller-manual
- **Docs & user-guide hub:** https://www.ulanzi.com/pages/documentation
- **Downloads / firmware / Ulanzi Studio:** https://www.ulanzi.com/pages/downloads
- **Community forum** (Discuz; has a D100H FAQ thread): https://bbs.ulanzistudio.com/

## UlanziDeck plugin SDK
- **SDK** (manifest reference, demo plugins, browser simulator):
  https://github.com/UlanziTechnology/UlanziDeckPlugin-SDK
- **Node main-service library:** https://github.com/UlanziTechnology/plugin-common-node
- **HTML / Property-Inspector library:** https://github.com/UlanziTechnology/plugin-common-html
- Built on the "Ulanzi JS Plugin Development Protocol" (v2.1.x at time of writing). The `manifest.md`
  in the SDK repo is the authoritative field reference.

## Related reverse-engineering (other Ulanzi devices)
Most existing open-source work targets the **D200**, not the D100H — but it's a useful reference:
- **jcalado/companion-surface-d200** — a Bitfocus Companion *surface* for the Ulanzi **D200** (the wired
  5×3 deck, VID `0x2207`). Its wire protocol was reverse-engineered with USBPcap captures of Ulanzi
  Studio. https://github.com/jcalado/companion-surface-d200
  - Writeup: https://jcalado.com/posts/ulanzi-d200-companion/
- **redphx/strmdck** — referenced by the D200 work.
- **Companion module request** thread for the Ulanzi deck:
  https://github.com/bitfocus/companion-module-requests/issues/1669

> ⚠️ The **D100H differs from the D200**: it's Bluetooth-only, uses the generic VID `0xfff1`, and — as
> far as I can tell — has **no community driver yet**. The D200 work won't drop in unchanged. If you
> build a D100H driver, please open a PR linking it here.

## Handy tools
- **node-hid** — read the HID interfaces from Node.js: https://github.com/node-hid/node-hid
- **keyboardchecker.com** / **keycode.info** — confirm what a Studio hotkey remap (e.g. `F13`) actually
  emits, since the function-key channel isn't readable via `node-hid` on Windows.
- **USBPcap + Wireshark** — capture raw USB/BLE-HID traffic if you need to go deeper than input reports.
