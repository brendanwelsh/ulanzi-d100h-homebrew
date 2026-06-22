// Property Inspector for the Dial (Encoder) action.
// Connect with the EXACT manifest action UUID so the settings context matches
// what the main service cached on `add` (uuid___key___actionid).
let SETTINGS = {};
let form = "";

$UD.connect("com.ulanzi.ulanzistudio.d100hmirror.dial");

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

$UD.onAdd((jsn) => { if (jsn && jsn.param) loadSettings(jsn.param); });
$UD.onParamFromApp((jsn) => { if (jsn && jsn.param) loadSettings(jsn.param); });

function loadSettings(params) {
  SETTINGS = params || {};
  Utils.setFormValue(SETTINGS, form);
  renderForm();
}

function renderForm() {
  const v = (document.getElementById("pressDo") || {}).value || "mute";
  const el = document.getElementById("row_presshotkey");
  if (el) el.style.display = v === "hotkey" ? "" : "none";
}
