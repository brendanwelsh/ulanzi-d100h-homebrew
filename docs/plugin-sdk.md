# Writing a UlanziDeck plugin (the clean path for custom behavior)

Because custom layouts don't persist offline, the realistic way to make the D100H do something custom is
to consume it *while Ulanzi Studio runs* — either a plugin, or a Studio "Hotkey" remap that a separate
listener picks up. A plugin is the tidier option: its actions appear in Studio's action list and **bind
to the D100H's dial + keys fine** (verified with a custom Encoder action on the dial and Keypad actions
on the keys).

## Plugin anatomy
```
com.ulanzi.<name>.ulanziPlugin/
├── manifest.json            # UUID (4 segments), CodePath, Actions[]
├── plugin/app.js            # main service (Node)  — or app.html (webview)
├── property-inspector/*.html
├── ulanzi-api/              # vendored common-node SDK (needs the `ws` package)
└── libs/                    # vendored common-html SDK (for the Property Inspector)
```
- A `.js` `CodePath` runs under the host's **Node.js v20** (can spawn processes / do file I/O). A
  `.html` `CodePath` runs in a webview.
- Plugin UUID = exactly **4** dot-segments (`com.ulanzi.ulanzistudio.<name>`); action UUIDs = **5+**.
- **Encoder** actions attach to the dial; **Keypad** actions attach to the keys. `"Devices": []` = all
  devices (the D100H included).
- Install by dropping the folder in `%APPDATA%\Ulanzi\UlanziDeck\Plugins\` and restarting Studio.

## Connection handshake
The host launches the Node main service with argv:
```
argv[2] = address   (default 127.0.0.1)
argv[3] = port      (default 3906)
argv[4] = language
```
```js
import UlanziApi from "./ulanzi-api/index.js";
const $UD = new UlanziApi();
$UD.connect("com.ulanzi.ulanzistudio.myplugin");   // sends { cmd: 'connected', uuid }
```
The only runtime dependency is `ws`.

## Events you care about
- **Keys:** `onRun` (confirmed single press — main trigger), `onKeyDown`, `onKeyUp`, `onAdd` (delivers
  the saved per-key settings in `message.param`), `onClear`.
- **Dial:** `onDialRotate` (`message.rotateEvent` = `'left' | 'right' | 'hold-left' | 'hold-right'`),
  `onDialDown`, `onDialUp`.
- **Config UI:** `onSendToPlugin` ↔ `sendToPropertyInspector`; persist settings with
  `sendParamFromPlugin` / `setSettings`.
- **Feedback:** `setStateIcon(context, stateIndex, text)` to set a key/dial icon + label.

## The gotcha that costs everyone an afternoon
`$UD.decodeContext(context)` returns `{ uuid, key, actionid }`, where:
- **`uuid` = the action TYPE** (e.g. `com.ulanzi.ulanzistudio.myplugin.jump`)
- **`actionid` = a per-instance GUID** (unique per placement) — **NOT** the action type.

If you check `actionid === <yourActionUUID>` it **never matches**, and your handler silently bails on
every press (the symptom: "the plugin loads, the action assigns, but nothing happens when I press it").
Use **`uuid`** for the action type. Simpler still: each controller type maps to one action, so `onRun`
is always your keypad action and `onDialRotate` / `onDialDown` are always your encoder action — you
often don't need to branch on the action type at all.

## Reference SDK
- `UlanziTechnology/UlanziDeckPlugin-SDK` (manifest reference, demo plugins, a browser simulator)
- `UlanziTechnology/plugin-common-node` (Node main-service SDK) and `plugin-common-html` (PI SDK)
- See [resources.md](resources.md) for links.
