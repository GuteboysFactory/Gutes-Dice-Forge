import { GenesysDiceForgeAPI } from "./api.js";
import { assertSupportedFoundry, MODULE_ID } from "./compat/foundry.js";
import { NullRenderer } from "./render/null-renderer.js";
import { WebGLDiceRenderer } from "./render/webgl/webgl-renderer.js";
import { DiceAudioEngine } from "./audio/audio-engine.js";
import { installGenesysAutoBridge } from "./integration/genesys-auto-bridge.js";

let renderer;
let api;
let qaButton;
let audioEngine;
let simulatorButton;
let simulatorPanel;
let simulatorResult;
let simulatorLastPayload = null;

const SIMULATOR_TYPES = Object.freeze([
  ["boost", "Boost", "B", "#67c8ee"],
  ["setback", "Setback", "S", "#17191c"],
  ["ability", "Ability", "A", "#68b342"],
  ["difficulty", "Difficulty", "D", "#8f50bd"],
  ["proficiency", "Proficiency", "P", "#efb91f"],
  ["challenge", "Challenge", "C", "#b93a35"]
]);

const simulatorCounts = Object.fromEntries(SIMULATOR_TYPES.map(([type]) => [type, 0]));

function registerSettings() {
  game.settings.register(MODULE_ID, "enabled", {
    name: "Legacy Enable Genesys Dice Forge",
    hint: "Legacy setting retained for migration. An active module now presents supported Genesys rolls automatically.",
    scope: "client",
    config: false,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "theme", {
    name: "Dice Theme",
    hint: "Visual dice theme used by the renderer.",
    scope: "client",
    config: true,
    type: String,
    choices: { fantasy: "Fantasy" },
    default: "fantasy"
  });

  game.settings.register(MODULE_ID, "soundEnabled", {
    name: "Enable Dice Sounds",
    hint: "Play adaptive layered dice-roll audio with 3D Genesys rolls.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "soundVolume", {
    name: "Dice Sound Volume",
    hint: "Local volume for Genesys Dice Forge roll sounds.",
    scope: "client",
    config: true,
    type: Number,
    default: 0.72,
    range: { min: 0, max: 1, step: 0.05 }
  });

  game.settings.register(MODULE_ID, "systemRollPresentation", {
    name: "Legacy System Roll Presentation",
    hint: "Legacy setting retained for migration. When the module is active in a Genesys world, supported rolls are presented automatically.",
    scope: "client",
    config: false,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "autoSystemBridge", {
    name: "Legacy Automatic Genesys System Bridge",
    hint: "Legacy setting retained for migration. Zero-config auto-capture is always installed when this module is active in a Genesys world.",
    scope: "client",
    config: false,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "showSimulator", {
    name: "Show Dice Forge Roller",
    hint: "Show the standalone Genesys dice-pool simulator button. This works even without the custom Genesys game system.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => syncSimulatorButton()
  });

  game.settings.register(MODULE_ID, "debug", {
    name: "QA / Debug Mode",
    hint: "Shows a local TEST DICE button and writes renderer diagnostics to the browser console.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => syncQaButton()
  });
}

async function createRenderer() {
  const debug = game.settings.get(MODULE_ID, "debug");
  const themeId = game.settings.get(MODULE_ID, "theme");
  try {
    const candidate = new WebGLDiceRenderer({ debug, themeId });
    await candidate.initialize();
    return candidate;
  } catch (error) {
    console.error("[Genesys Dice Forge] Native WebGL renderer failed; using safe fallback.", error);
    const fallback = new NullRenderer({ debug, reason: "webgl-unavailable" });
    await fallback.initialize();
    return fallback;
  }
}

function syncQaButton() {
  const debug = game.settings.get(MODULE_ID, "debug");
  if (!debug) {
    qaButton?.remove();
    qaButton = null;
    return;
  }
  if (qaButton) return;
  qaButton = document.createElement("button");
  qaButton.type = "button";
  qaButton.className = "genesys-dice-forge-qa-button";
  qaButton.innerHTML = '<i class="fa-solid fa-dice-d20"></i><span>TEST DICE</span>';
  qaButton.title = "Genesys Dice Forge v0.7.4 zero-config auto-capture QA";
  qaButton.addEventListener("click", () => api?.preview());
  document.body.appendChild(qaButton);
}

function formatSignedResult(value, positiveLabel, negativeLabel) {
  if (value > 0) return `<strong>${value}</strong> ${positiveLabel}`;
  if (value < 0) return `<strong>${Math.abs(value)}</strong> ${negativeLabel}`;
  return `<strong>0</strong> ${positiveLabel}/${negativeLabel}`;
}

function updateSimulatorResult(payload) {
  if (!simulatorResult) return;
  const net = payload?.net ?? {};
  const success = formatSignedResult(net.netSuccess ?? 0, "Success", "Failure");
  const advantage = formatSignedResult(net.netAdvantage ?? 0, "Advantage", "Threat");
  const specials = [
    (net.triumph ?? 0) > 0 ? `<span><strong>${net.triumph}</strong> Triumph</span>` : "",
    (net.despair ?? 0) > 0 ? `<span><strong>${net.despair}</strong> Despair</span>` : ""
  ].filter(Boolean).join("");
  simulatorResult.innerHTML = `<div>${success}</div><div>${advantage}</div>${specials || '<span class="gdf-no-special">No Triumph/Despair</span>'}`;
}

async function postSimulatorResultToChat() {
  const payload = simulatorLastPayload;
  if (!payload || !globalThis.ChatMessage?.create) return;
  const net = payload.net ?? {};
  const poolText = SIMULATOR_TYPES
    .map(([type, label]) => [label, payload.dice.filter((die) => die.type === type).length])
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${count} ${label}`)
    .join(" + ");
  const resultA = net.netSuccess > 0 ? `${net.netSuccess} Success` : net.netSuccess < 0 ? `${Math.abs(net.netSuccess)} Failure` : "0 Success / Failure";
  const resultB = net.netAdvantage > 0 ? `${net.netAdvantage} Advantage` : net.netAdvantage < 0 ? `${Math.abs(net.netAdvantage)} Threat` : "0 Advantage / Threat";
  const special = [
    net.triumph ? `${net.triumph} Triumph` : "",
    net.despair ? `${net.despair} Despair` : ""
  ].filter(Boolean).join(" | ");
  const content = `<div class="gdf-chat-result"><strong>Genesys Dice Forge</strong><div>${poolText || "Empty pool"}</div><hr><div>${resultA}</div><div>${resultB}</div>${special ? `<div>${special}</div>` : ""}</div>`;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker?.() ?? {},
    content,
    flags: { [MODULE_ID]: { simulator: true } }
  });
}

function buildSimulatorPanel() {
  const panel = document.createElement("section");
  panel.className = "genesys-dice-forge-simulator";
  panel.innerHTML = `
    <header class="gdf-sim-header">
      <div><strong>GENESYS DICE FORGE</strong><span>Roll Simulator</span></div>
      <button type="button" class="gdf-sim-close" aria-label="Close">&times;</button>
    </header>
    <div class="gdf-sim-grid"></div>
    <div class="gdf-sim-actions">
      <button type="button" class="gdf-sim-clear">CLEAR</button>
      <button type="button" class="gdf-sim-roll">ROLL DICE</button>
    </div>
    <div class="gdf-sim-result"><span>Select dice and roll.</span></div>
    <button type="button" class="gdf-sim-chat" disabled>POST RESULT TO CHAT</button>
  `;

  const grid = panel.querySelector(".gdf-sim-grid");
  for (const [type, label, code, color] of SIMULATOR_TYPES) {
    const row = document.createElement("div");
    row.className = `gdf-sim-die gdf-${type}`;
    row.innerHTML = `
      <span class="gdf-die-chip" style="--gdf-die-color:${color}">${code}</span>
      <span class="gdf-die-label">${label}</span>
      <button type="button" data-action="minus" data-type="${type}">-</button>
      <span class="gdf-die-count" data-count="${type}">0</span>
      <button type="button" data-action="plus" data-type="${type}">+</button>
    `;
    grid.appendChild(row);
  }

  panel.hidden = true;
  simulatorResult = panel.querySelector(".gdf-sim-result");
  const chatButton = panel.querySelector(".gdf-sim-chat");

  panel.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const action = button.dataset.action;
    const type = button.dataset.type;
    if (action && type) {
      const delta = action === "plus" ? 1 : -1;
      simulatorCounts[type] = Math.max(0, Math.min(30, simulatorCounts[type] + delta));
      const count = panel.querySelector(`[data-count="${type}"]`);
      if (count) count.textContent = String(simulatorCounts[type]);
      return;
    }
    if (button.classList.contains("gdf-sim-close")) {
      panel.hidden = true;
      return;
    }
    if (button.classList.contains("gdf-sim-clear")) {
      for (const [type] of SIMULATOR_TYPES) simulatorCounts[type] = 0;
      panel.querySelectorAll("[data-count]").forEach((el) => { el.textContent = "0"; });
      simulatorLastPayload = null;
      chatButton.disabled = true;
      simulatorResult.innerHTML = "<span>Select dice and roll.</span>";
      return;
    }
    if (button.classList.contains("gdf-sim-roll")) {
      const total = Object.values(simulatorCounts).reduce((sum, value) => sum + value, 0);
      if (total <= 0) {
        ui?.notifications?.warn?.("Add at least one die to the pool.");
        return;
      }
      const { payload, animation } = api.rollPool(simulatorCounts, { source: "standalone-simulator" });
      simulatorLastPayload = payload;
      updateSimulatorResult(payload);
      chatButton.disabled = false;
      animation?.catch?.((error) => console.error("[Genesys Dice Forge] Simulator animation failed.", error));
      return;
    }
    if (button.classList.contains("gdf-sim-chat")) {
      postSimulatorResultToChat().catch((error) => console.error("[Genesys Dice Forge] Could not post simulator result.", error));
    }
  });

  return panel;
}

function syncSimulatorButton() {
  const show = game.settings.get(MODULE_ID, "showSimulator");
  if (!show) {
    simulatorButton?.remove();
    simulatorButton = null;
    simulatorPanel?.remove();
    simulatorPanel = null;
    simulatorResult = null;
    return;
  }
  if (!simulatorButton) {
    simulatorButton = document.createElement("button");
    simulatorButton.type = "button";
    simulatorButton.className = "genesys-dice-forge-simulator-button";
    simulatorButton.innerHTML = '<i class="fa-solid fa-dice"></i><span>DICE FORGE</span>';
    simulatorButton.title = "Open the standalone Genesys Dice Forge roll simulator";
    simulatorButton.addEventListener("click", () => {
      if (!simulatorPanel) {
        simulatorPanel = buildSimulatorPanel();
        document.body.appendChild(simulatorPanel);
      }
      simulatorPanel.hidden = !simulatorPanel.hidden;
    });
    document.body.appendChild(simulatorButton);
  }
}

Hooks.once("init", async () => {
  assertSupportedFoundry();
  registerSettings();
  renderer = await createRenderer();
  audioEngine = new DiceAudioEngine({ moduleId: MODULE_ID, debug: game.settings.get(MODULE_ID, "debug") });
  api = new GenesysDiceForgeAPI(renderer, audioEngine);

  const module = game.modules.get(MODULE_ID);
  if (module) module.api = api;

  globalThis.GenesysDiceForge = api;
  Hooks.callAll("genesysDiceForgeInit", api);
  Hooks.on("genesysDiceForgePresentRoll", (payload) => {
    api?.presentResolvedSystemRoll?.(payload).catch((error) => {
      console.error("[Genesys Dice Forge] System roll presentation failed.", error);
    });
  });
  console.log(`[Genesys Dice Forge] v${api.version} initialized (${api.capabilities.renderer}).`);
});

Hooks.once("ready", () => {
  syncSimulatorButton();
  syncQaButton();
  installGenesysAutoBridge(api, { moduleId: MODULE_ID });
  Hooks.callAll("genesysDiceForgeReady", api);
  if (!api?.getSystemBridge()) {
    console.info("[Genesys Dice Forge] Direct system bridge not registered; automatic roll bridge is active when supported roll data is available.");
  }
});

Hooks.once("shutdown", () => {
  qaButton?.remove();
  simulatorButton?.remove();
  simulatorPanel?.remove();
  renderer?.destroy?.();
  audioEngine?.destroy?.();
});
