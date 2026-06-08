# Ulanzi Studio — online mode, saving & button binding

## Online mode
With Ulanzi Studio running, the device is in "online mode": Studio receives the input over Bluetooth and
executes whatever action you assigned, **in software**. All customization is online-only — there is no
user-customizable offline/standalone layout on the D100H.

### Tested: custom layouts do NOT persist offline
1. In Studio, remap the dial to `F13`–`F17`.
2. Fully quit Studio.
3. Turn the dial → it goes **straight back to volume**.

There is **no "Save to device" button** because the D100H can't store a custom profile. (A
`defProfile/Dial/dial.bin` exists for the *factory default* layout, but user customizations are not
flashed to the device.) This was the single biggest time-sink to confirm, so: **if your goal is a dial
that works without the Ulanzi app, the D100H can only ever be a volume/media remote.**

## Where bindings are stored
Profiles are plain JSON under:
```
%APPDATA%\Ulanzi\UlanziDeck\ProfilesV2\<guid>.ulanziProfile\Profiles\<guid>\manifest.json
```
Structure:
```jsonc
{
  "Controllers": [
    { "Type": "Encoder", "Actions": { "0_2": { /* dial action */ } } },
    { "Type": "Keypad",  "Actions": { "0_0": {}, "0_1": {}, /* ... slots keyed "row_col" */ } }
  ]
}
```
A built-in **Hotkey** binding on a key:
```json
"0_0": {
  "Action": "com.ulanzi.ulanzideck.system.hotkey",
  "ActionID": "<per-instance-guid>",
  "ActionParam": { "Hotkey": "F13" }
}
```
The **dial** Hotkey action has five sub-slots:
```json
"ActionParam": {
  "knob_press":        { "Hotkey": "F13" },
  "knob_rotate_right": { "Hotkey": "F14" },
  "knob_rotate_left":  { "Hotkey": "F15" },
  "knob_hold_right":   { "Hotkey": "F16" },   // press + rotate CW
  "knob_hold_left":    { "Hotkey": "F17" }    // press + rotate CCW
}
```

## Saving gotchas
- Studio **writes the manifest to disk on change** (built-in hotkey bindings show up in the file).
- **Editing the manifest while Studio is running does not take.** Studio holds the profile in memory and
  overwrites external edits. You'd have to quit Studio to edit the file — and even then, it can't push a
  custom layout to the device for offline use.
- **Plugin action settings are NOT stored in the manifest.** When you configure a third-party *plugin*
  action (e.g. choose an option in its Property Inspector), the manifest `ActionParam` stays `{}`. Those
  values live in Studio's internal settings store and are delivered to the plugin at runtime via the SDK
  (`message.param` on `onAdd` / `onRun`). So you **cannot** pre-seed plugin settings by editing profile
  JSON — it has to go through the plugin's Property Inspector.

## Assigning actions in the UI
Buttons and the Knob are configured on **separate tabs**. Built-in action categories include System
(Hotkey, Multimedia, Text, Open, Website, …), Pages (folders / switch profile), and any installed
**plugin** categories — which is how a custom plugin's actions become assignable to the dial and keys.
