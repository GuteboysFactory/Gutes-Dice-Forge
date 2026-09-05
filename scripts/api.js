import { validateRollPayload } from "./core/payload.js";
import { createSimulatedRollPayload, normalizePool } from "./core/roller.js";

const MODULE_ID = "genesys-dice-forge";

export class GenesysDiceForgeAPI {
  #renderer;
  #audioEngine;
  #systemBridge = null;

  constructor(renderer, audioEngine = null) {
    this.#renderer = renderer;
    this.#audioEngine = audioEngine;
  }

  get version() {
    return "0.7.9";
  }

  get capabilities() {
    return Object.freeze({
      deterministicFacePlayback: true,
      supportedDice: ["boost", "setback", "ability", "difficulty", "proficiency", "challenge"],
      shapes: ["d6", "d8", "d12"],
      themes: ["fantasy"],
      renderer3d: Boolean(this.#renderer?.capabilities?.renderer3d),
      renderer: this.#renderer?.capabilities?.renderer ?? "unknown",
      proceduralGeometry: Boolean(this.#renderer?.capabilities?.proceduralGeometry),
      physics: "rigid-body-table-roll",
      virtualTabletop: true,
      throwDirection: "left-to-right",
      motionProfiles: ["rail-rebound", "scatter-roll", "deep-bounce"],
      randomizedMotionProfileSelection: true,
      exactDiceCountPresentation: true,
      engravedSymbols: true,
      signatureEffects: true,
      signatureGlyphArtwork: true,
      premiumCleanDiceArtwork: true,
      authenticFaceComposition: true,
      resultFacePresentation: "natural-face-up-minimal-correction",
      systemRollPresentation: true,
      automaticSystemBridge: true,
      zeroConfigAutoCapture: true,
      sharedCaptureDeduplication: true,
      chatToolbarLauncher: true,
      alwaysOnTopPresentation: true,
      standaloneRollSimulator: true,
      audio: this.#audioEngine?.capabilities ?? null,
      foundry: ["13.351", "14.x"]
    });
  }

  registerSystemBridge(bridge) {
    if (!bridge || typeof bridge !== "object") {
      throw new Error("[Genesys Dice Forge] registerSystemBridge requires an object.");
    }
    this.#systemBridge = bridge;
    console.log("[Genesys Dice Forge] Genesys system bridge registered.");
    return this;
  }

  getSystemBridge() {
    return this.#systemBridge;
  }

  wantsSystemRollPresentation() {
    return Boolean(this.#renderer?.capabilities?.renderer3d);
  }

  async presentResolvedSystemRoll(payload) {
    if (!this.wantsSystemRollPresentation()) {
      return { rendered: false, reason: "system-presentation-disabled" };
    }
    return this.animateRoll(payload);
  }

  async animateRoll(payload) {
    validateRollPayload(payload);
    const selectedTheme = game.settings.get(MODULE_ID, "theme");
    if (selectedTheme && this.#renderer?.themeId !== selectedTheme) {
      await this.#renderer?.setTheme?.(selectedTheme);
    }
    if (game.settings.get(MODULE_ID, "soundEnabled")) {
      this.#audioEngine?.playRoll?.(payload, { volume: game.settings.get(MODULE_ID, "soundVolume") });
    }
    return this.#renderer.animate(payload);
  }

  createSimulatedRoll(pool, context = {}) {
    const normalized = normalizePool(pool);
    return createSimulatedRollPayload(normalized, context);
  }

  rollPool(pool, context = {}) {
    const payload = this.createSimulatedRoll(pool, context);
    const animation = this.animateRoll(payload);
    return { payload, animation };
  }

  async preview() {
    const payload = {
      rollId: `preview-audio-${Date.now()}`,
      dice: [
        { type: "boost", faceIndex: 2 },
        { type: "setback", faceIndex: 4 },
        { type: "ability", faceIndex: 6 },
        { type: "difficulty", faceIndex: 5 },
        { type: "proficiency", faceIndex: 11 },
        { type: "challenge", faceIndex: 11 }
      ],
      totals: {}, net: {}, context: { preview: true }
    };
    if (game.settings.get(MODULE_ID, "soundEnabled")) {
      this.#audioEngine?.playRoll?.(payload, { volume: game.settings.get(MODULE_ID, "soundVolume") });
    }
    return this.#renderer.animate(payload);
  }
}
