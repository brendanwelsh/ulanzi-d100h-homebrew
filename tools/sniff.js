// Tiny HID dumper for the Ulanzi D100H (or any HID device).
//
//   npm i node-hid
//   node sniff.js                 # list connected HID devices
//   node sniff.js 0xfff1 0x0082   # open every interface of that VID[:PID] and print raw reports
//
// On Windows the Keyboard (usage 0x01/0x06) and Mouse (0x01/0x02) collections won't read — that's
// the OS reserving them, expected. The dial + media buttons come through Consumer Control (0x0c/0x01).

import HID from "node-hid";

const hex = (n) => (n || 0).toString(16).padStart(4, "0");
const ts = () => new Date().toLocaleTimeString();
const parseId = (s) => {
  if (!s) return null;
  s = String(s).trim();
  return s.toLowerCase().startsWith("0x") ? parseInt(s, 16) : parseInt(s, 10);
};
const usageName = (up, u) => {
  if (up === 0x1 && u === 0x6) return "Keyboard";
  if (up === 0x1 && u === 0x2) return "Mouse";
  if (up === 0xc && u === 0x1) return "ConsumerControl(media)";
  if (up >= 0xff00) return "Vendor";
  return "";
};

const vid = parseId(process.argv[2]);
const pid = parseId(process.argv[3]);

if (vid == null) {
  const seen = new Set();
  console.log("Connected HID devices:");
  for (const d of HID.devices()) {
    const k = d.vendorId + ":" + d.productId;
    if (seen.has(k)) continue;
    seen.add(k);
    console.log(`  0x${hex(d.vendorId)}:0x${hex(d.productId)}  ${d.manufacturer || "?"} / ${d.product || "?"}`);
  }
  console.log("\nThen run:  node sniff.js 0x<vid> 0x<pid>");
  process.exit(0);
}

const targets = HID.devices().filter((d) => d.vendorId === vid && (pid == null || d.productId === pid));
if (!targets.length) {
  console.error(`No HID device matched 0x${hex(vid)}${pid != null ? ":0x" + hex(pid) : ""}. Is it connected?`);
  process.exit(1);
}

console.log(`Opening ${targets.length} interface(s) of 0x${hex(vid)}${pid != null ? ":0x" + hex(pid) : ""}`);
console.log("Now operate the device. Ctrl+C to stop. (It may change your volume / type keys — expected.)\n");

const opened = [];
targets.forEach((info, i) => {
  const up = info.usagePage || 0, u = info.usage || 0;
  const tag = `if${i} ${hex(up)}/${hex(u)} ${usageName(up, u)}`.padEnd(34);
  let dev;
  try { dev = new HID.HID(info.path); }
  catch (e) { console.log(`  [skip] ${tag} could not open (${e.message})`); return; }
  opened.push(dev);
  console.log(`  [open] ${tag}`);
  dev.on("data", (buf) => console.log(`${ts()} ${tag} ${buf.toString("hex").match(/.{1,2}/g).join(" ")}`));
  dev.on("error", (e) => console.log(`${tag} error: ${e.message}`));
});

if (!opened.length) {
  console.error("\nCould not open any interface. Try running the terminal as Administrator,");
  console.error("or make sure the device's own config app isn't holding it.");
  process.exit(1);
}

console.log("\nlistening... (Ctrl+C to stop)\n");
process.on("SIGINT", () => { for (const d of opened) { try { d.close(); } catch (e) {} } process.exit(0); });
