// Property Inspector for the Key (Keypad) action.
// Connect with the EXACT manifest action UUID so the settings context matches
// what the main service cached on `add` (uuid___key___actionid).
let SETTINGS = {};
let form = "";

$UD.connect("com.ulanzi.ulanzistudio.d100hmirror.key");

$UD.onConnected(() => {
  form = document.querySelector("#property-inspector");
  document.querySelector(".udpi-wrapper").classList.remove("hidden");
  renderForm();

  form.addEventListener(
    "input",
    Utils.debounce(() => {
      SETTINGS = Utils.getFormValue(form);
      renderForm();
      $UD.sendParamFromPlugin(SETTINGS);
    })
  );
});

// Saved settings arrive on add / paramfromapp — load them into the form.
$UD.onAdd((jsn) => { if (jsn && jsn.param) loadSettings(jsn.param); });
$UD.onParamFromApp((jsn) => { if (jsn && jsn.param) loadSettings(jsn.param); });

function loadSettings(params) {
  SETTINGS = params || {};
  Utils.setFormValue(SETTINGS, form);
  renderForm();
}

// Show only the row for the chosen function.
function renderForm() {
  const v = (document.getElementById("keyDo") || {}).value || "none";
  show("row_hotkey", v === "hotkey");
  show("row_media", v === "media");
  show("row_volume", v === "volume");
  show("row_text", v === "text");
  show("hint_text", v === "text");
}

function show(id, on) {
  const el = document.getElementById(id);
  if (el) el.style.display = on ? "" : "none";
}
