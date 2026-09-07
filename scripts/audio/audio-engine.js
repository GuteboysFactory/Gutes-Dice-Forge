import { getModuleAssetUrl } from "../compat/foundry.js";

const BANK = Object.freeze({
  // light-02.ogg intentionally excluded: audio audit found an abnormally loud
  // background-noise floor (~-22 dB) and almost no quiet-to-transient gap.
  light: ["light-01.ogg", "light-03.ogg"],
  medium: ["medium-01.ogg", "medium-02.ogg"],
  heavy: ["heavy-01.ogg", "heavy-02.ogg"]
});

function pick(list, avoid = null) {
  const candidates = avoid && list.length > 1 ? list.filter((item) => item !== avoid) : list;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

export class DiceAudioEngine {
  constructor({ moduleId, debug = false } = {}) {
    this.moduleId = moduleId;
    this.debug = debug;
    this.active = new Set();
    this.pending = new Set();
    this.destroyed = false;
  }

  get capabilities() {
    return Object.freeze({
      layeredRollAudio: true,
      adaptiveDiceCountMix: true,
      randomizedSamplePlayback: true,
      polishedNaturalMix: true,
      pitchStablePlayback: true,
      clickFreeTailFade: true,
      noisySampleQuarantine: true,
      source: "approved-user-supplied-sample-pack"
    });
  }

  #asset(file) {
    return getModuleAssetUrl(`assets/audio/dice/${file}`);
  }

  #fadeAndStop(audio, duration = 85) {
    if (!audio || audio.paused) return;
    const startVolume = Number(audio.volume || 0);
    const started = performance.now();
    const tick = () => {
      if (this.destroyed || audio.paused) return;
      const t = clamp((performance.now() - started) / duration);
      audio.volume = Math.max(0, startVolume * (1 - t));
      if (t >= 1) {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (_) {}
        this.active.delete(audio);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  stopAll({ fade = true } = {}) {
    for (const timer of this.pending) window.clearTimeout(timer);
    this.pending.clear();
    for (const audio of this.active) {
      if (fade) this.#fadeAndStop(audio);
      else {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (_) {}
        this.active.delete(audio);
      }
    }
  }

  #play(file, { delay = 0, volume = 1, rate = 1 } = {}) {
    if (this.destroyed) return;
    const launch = () => {
      if (this.destroyed) return;
      const audio = new Audio(this.#asset(file));
      audio.preload = "auto";
      audio.volume = clamp(volume);
      audio.playbackRate = clamp(rate, 0.985, 1.015);
      audio.preservesPitch = true;
      this.active.add(audio);
      const cleanup = () => this.active.delete(audio);
      audio.addEventListener("ended", cleanup, { once: true });
      audio.addEventListener("error", cleanup, { once: true });
      const promise = audio.play();
      if (promise?.catch) {
        promise.catch((error) => {
          cleanup();
          if (this.debug) console.debug("[Genesys Dice Forge] Dice audio playback was blocked or failed.", error);
        });
      }
    };
    if (delay > 0) {
      const timer = window.setTimeout(() => {
        this.pending.delete(timer);
        launch();
      }, delay);
      this.pending.add(timer);
    } else launch();
  }

  playRoll(payload, { volume = 0.72 } = {}) {
    if (this.destroyed) return;
    const count = Math.max(1, Number(payload?.dice?.length ?? 1));

    this.stopAll({ fade: true });

    const master = clamp(volume);
    const microRate = () => 0.994 + Math.random() * 0.012;

    if (count <= 2) {
      const main = pick(BANK.light);
      this.#play(main, { volume: master * 0.92, rate: microRate() });
      if (count === 2) {
        this.#play(pick(BANK.light, main), {
          delay: 72 + Math.random() * 34,
          volume: master * 0.24,
          rate: microRate()
        });
      }
      return;
    }

    if (count <= 5) {
      this.#play(pick(BANK.medium), { volume: master * 0.91, rate: microRate() });
      this.#play(pick(BANK.light), {
        delay: 88 + Math.random() * 42,
        volume: master * 0.20,
        rate: microRate()
      });
      return;
    }

    if (count <= 9) {
      this.#play(pick(BANK.heavy), { volume: master * 0.88, rate: microRate() });
      this.#play(pick(BANK.medium), {
        delay: 102 + Math.random() * 48,
        volume: master * 0.18,
        rate: microRate()
      });
      return;
    }

    this.#play(pick(BANK.heavy), { volume: master * 0.86, rate: microRate() });
    this.#play(pick(BANK.medium), {
      delay: 118 + Math.random() * 55,
      volume: master * 0.20,
      rate: microRate()
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopAll({ fade: false });
  }
}
