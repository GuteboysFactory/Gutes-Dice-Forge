const MODULE_ID = "genesys-dice-forge";
const BUTTON_ID = "genesys-dice-forge-face-audit-button";
const PANEL_ID = "genesys-dice-forge-face-audit";
const STORAGE_KEY = `${MODULE_ID}.visual-face-audit.v1`;

const FACE_DEFINITIONS = Object.freeze([
  Object.freeze({ type: "boost", label: "Boost", code: "B", faces: Object.freeze([
    [], [], ["Success"], ["Success", "Advantage"], ["Advantage", "Advantage"], ["Advantage"]
  ]) }),
  Object.freeze({ type: "setback", label: "Setback", code: "S", faces: Object.freeze([
    [], [], ["Failure"], ["Failure"], ["Threat"], ["Threat"]
  ]) }),
  Object.freeze({ type: "ability", label: "Ability", code: "A", faces: Object.freeze([
    [], ["Success"], ["Success"], ["Success", "Success"], ["Advantage"], ["Advantage"], ["Success", "Advantage"], ["Advantage", "Advantage"]
  ]) }),
  Object.freeze({ type: "difficulty", label: "Difficulty", code: "D", faces: Object.freeze([
    [], ["Failure"], ["Failure", "Failure"], ["Threat"], ["Threat"], ["Threat"], ["Threat", "Threat"], ["Failure", "Threat"]
  ]) }),
  Object.freeze({ type: "proficiency", label: "Proficiency", code: "P", faces: Object.freeze([
    [], ["Success"], ["Success"], ["Success", "Success"], ["Success", "Success"], ["Advantage"],
    ["Success", "Advantage"], ["Success", "Advantage"], ["Success", "Advantage"],
    ["Advantage", "Advantage"], ["Advantage", "Advantage"], ["Triumph"]
  ]) }),
  Object.freeze({ type: "challenge", label: "Challenge", code: "C", faces: Object.freeze([
    [], ["Failure"], ["Failure"], ["Failure", "Failure"], ["Failure", "Failure"], ["Threat"], ["Threat"],
    ["Failure", "Threat"], ["Failure", "Threat"], ["Threat", "Threat"], ["Threat", "Threat"], ["Despair"]
  ]) })
]);

const FACE_LIST = Object.freeze(FACE_DEFINITIONS.flatMap((definition) =>
  definition.faces.map((symbols, faceIndex) => Object.freeze({
    type: definition.type,
    label: definition.label,
    code: definition.code,
    faceIndex,
    sides: definition.faces.length,
    symbols
  }))
));

let button = null;
let panel = null;
let currentIndex = 0;
let auditState = loadAuditState();

function debugEnabled() {
  try {
    return Boolean(game.settings.get(MODULE_ID, "debug"));
  } catch (_) {
    return false;
  }
}

function loadAuditState() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function saveAuditState() {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(auditState));
  } catch (_) {}
}

function faceKey(face) {
  return `${face.type}:${face.faceIndex}`;
}

function faceText(face) {
  return face.symbols.length ? face.symbols.join(" + ") : "Blank";
}

function reviewedStats() {
  let pass = 0;
  let fail = 0;
  for (const face of FACE_LIST) {
    const status = auditState[faceKey(face)];
    if (status === "pass") pass += 1;
    else if (status === "fail") fail += 1;
  }
  return { pass, fail, reviewed: pass + fail, remaining: FACE_LIST.length - pass - fail };
}

function dieReviewed(definition) {
  return definition.faces.reduce((count, _, faceIndex) =>
    count + (auditState[`${definition.type}:${faceIndex}`] ? 1 : 0), 0);
}

function currentFace() {
  return FACE_LIST[currentIndex] ?? FACE_LIST[0];
}

function indexFor(type, faceIndex = 0) {
  return FACE_LIST.findIndex((face) => face.type === type && face.faceIndex === faceIndex);
}

function createButton() {
  const el = document.createElement("button");
  el.id = BUTTON_ID;
  el.type = "button";
  el.className = "genesys-dice-forge-face-audit-button";
  el.title = "Genesys Dice Forge - 52-face visual QA";
  el.innerHTML = '<i class="fa-solid fa-list-check" aria-hidden="true"></i><span>FACE QA</span>';
  el.addEventListener("click", () => {
    ensurePanel();
    panel.hidden = !panel.hidden;
    if (!panel.hidden) renderPanel();
  });
  return el;
}

function createPanel() {
  const el = document.createElement("section");
  el.id = PANEL_ID;
  el.className = "genesys-dice-forge-face-audit";
  el.hidden = true;
  el.innerHTML = `
    <header class="gdf-face-header">
      <div><strong>52-FACE VISUAL QA</strong><span>Deterministic Genesys face cycler</span></div>
      <button type="button" class="gdf-face-close" aria-label="Close">&times;</button>
    </header>
    <div class="gdf-face-dice-tabs"></div>
    <div class="gdf-face-card">
      <div class="gdf-face-position"></div>
      <div class="gdf-face-name"></div>
      <div class="gdf-face-symbols"></div>
      <div class="gdf-face-status"></div>
    </div>
    <div class="gdf-face-nav">
      <button type="button" data-face-action="prev"><i class="fa-solid fa-chevron-left"></i> PREV</button>
      <button type="button" class="gdf-face-play" data-face-action="play"><i class="fa-solid fa-dice-d20"></i> PLAY FACE</button>
      <button type="button" data-face-action="next">NEXT <i class="fa-solid fa-chevron-right"></i></button>
    </div>
    <div class="gdf-face-review">
      <button type="button" class="gdf-face-pass" data-face-action="pass"><i class="fa-solid fa-check"></i> PASS & NEXT</button>
      <button type="button" class="gdf-face-fail" data-face-action="fail"><i class="fa-solid fa-xmark"></i> FAIL & NEXT</button>
    </div>
    <div class="gdf-face-summary"></div>
    <button type="button" class="gdf-face-reset" data-face-action="reset">RESET AUDIT</button>
  `;

  el.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    if (target.classList.contains("gdf-face-close")) {
      el.hidden = true;
      return;
    }

    const dieType = target.dataset.dieType;
    if (dieType) {
      const index = indexFor(dieType, 0);
      if (index >= 0) currentIndex = index;
      renderPanel();
      return;
    }

    const action = target.dataset.faceAction;
    if (!action) return;
    if (action === "prev") {
      currentIndex = (currentIndex - 1 + FACE_LIST.length) % FACE_LIST.length;
      renderPanel();
      return;
    }
    if (action === "next") {
      currentIndex = (currentIndex + 1) % FACE_LIST.length;
      renderPanel();
      return;
    }
    if (action === "play") {
      playCurrentFace();
      return;
    }
    if (action === "pass" || action === "fail") {
      auditState[faceKey(currentFace())] = action;
      saveAuditState();
      currentIndex = (currentIndex + 1) % FACE_LIST.length;
      renderPanel();
      return;
    }
    if (action === "reset") {
      auditState = {};
      saveAuditState();
      currentIndex = 0;
      renderPanel();
    }
  });

  return el;
}

function ensurePanel() {
  if (!panel?.isConnected) {
    panel = createPanel();
    document.body.appendChild(panel);
  }
  return panel;
}

function renderPanel() {
  if (!panel) return;
  const face = currentFace();
  const stats = reviewedStats();
  const status = auditState[faceKey(face)] ?? "unchecked";

  const tabs = panel.querySelector(".gdf-face-dice-tabs");
  tabs.innerHTML = FACE_DEFINITIONS.map((definition) => {
    const active = definition.type === face.type ? " is-active" : "";
    return `<button type="button" class="${active}" data-die-type="${definition.type}">${definition.code}<small>${dieReviewed(definition)}/${definition.faces.length}</small></button>`;
  }).join("");

  panel.querySelector(".gdf-face-position").textContent = `FACE ${currentIndex + 1} / ${FACE_LIST.length}`;
  panel.querySelector(".gdf-face-name").textContent = `${face.label} ${face.faceIndex + 1}/${face.sides}`;
  panel.querySelector(".gdf-face-symbols").textContent = faceText(face);
  const statusEl = panel.querySelector(".gdf-face-status");
  statusEl.className = `gdf-face-status is-${status}`;
  statusEl.textContent = status.toUpperCase();
  panel.querySelector(".gdf-face-summary").innerHTML = `Reviewed <strong>${stats.reviewed}/52</strong> &nbsp; PASS <strong>${stats.pass}</strong> &nbsp; FAIL <strong>${stats.fail}</strong> &nbsp; Remaining <strong>${stats.remaining}</strong>`;
}

function playCurrentFace() {
  const face = currentFace();
  const api = globalThis.GenesysDiceForge;
  if (!api?.animateRoll) {
    ui?.notifications?.warn?.("Genesys Dice Forge renderer is not ready.");
    return;
  }

  const payload = {
    rollId: `face-audit-${face.type}-${face.faceIndex}-${Date.now()}`,
    dice: [{ type: face.type, faceIndex: face.faceIndex }],
    totals: {},
    net: {},
    context: {
      source: "visual-52-face-audit",
      faceAudit: true,
      expected: faceText(face)
    }
  };

  api.animateRoll(payload).catch((error) => {
    console.error("[Genesys Dice Forge] Face QA animation failed.", error, payload);
    ui?.notifications?.error?.("Dice Forge Face QA animation failed. Check console.");
  });
}

export function syncFaceAudit() {
  if (!debugEnabled()) {
    button?.remove();
    button = null;
    panel?.remove();
    panel = null;
    return;
  }

  if (!button?.isConnected) {
    button = createButton();
    document.body.appendChild(button);
  }
}

globalThis.GenesysDiceForgeFaceAudit = Object.freeze({
  sync: syncFaceAudit,
  get progress() { return reviewedStats(); }
});

Hooks.once("ready", () => {
  syncFaceAudit();
  console.info("[Genesys Dice Forge] v0.7.13 deterministic 52-face visual QA cycler ready in Debug Mode.");
});

Hooks.once("shutdown", () => {
  button?.remove();
  panel?.remove();
  button = null;
  panel = null;
});
