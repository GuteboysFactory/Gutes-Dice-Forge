const MODULE_ID = "genesys-dice-forge";
const SIDES = { boost: 6, setback: 6, ability: 8, difficulty: 8, proficiency: 12, challenge: 12 };
const TYPES = Object.keys(SIDES);
const LABELS = "(Boost|Setback|Ability|Difficulty|Proficiency|Challenge)";
const FACE_PATTERNS = [
  new RegExp(`\\b${LABELS}\\s*(?:Die\\s*)?#\\s*(\\d{1,2})\\b`, "gi"),
  new RegExp(`\\b${LABELS}\\s*(?:Die\\s*)?(?:Face|Result)\\s*#?\\s*(\\d{1,2})\\b`, "gi")
];

function sharedCaptureState() {
  const key = "__GENESYS_DICE_FORGE_CAPTURE_STATE__";
  if (!globalThis[key]) {
    globalThis[key] = { messageIds: new Set(), fingerprints: new Map() };
  }
  return globalThis[key];
}

function normalizeType(value) {
  const text = String(value ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return TYPES.find((type) => text === type || text.includes(type)) ?? null;
}

function faceIndex(value, type, alreadyIndex = false) {
  const n = Number(value);
  if (!Number.isInteger(n) || !type) return null;
  if (alreadyIndex) return n >= 0 && n < SIDES[type] ? n : null;
  return n >= 1 && n <= SIDES[type] ? n - 1 : null;
}

function parseFaceText(text) {
  const source = String(text ?? "");
  for (const pattern of FACE_PATTERNS) {
    pattern.lastIndex = 0;
    const dice = [];
    let match;
    while ((match = pattern.exec(source))) {
      const type = normalizeType(match[1]);
      const index = faceIndex(match[2], type, false);
      if (type && index != null) dice.push({ type, faceIndex: index });
    }
    if (dice.length) return dice;
  }
  return [];
}

function parseDataAttributes(root) {
  const dice = [];
  const descendants = root.querySelectorAll ? Array.from(root.querySelectorAll("*")) : [];
  const nodes = [root, ...descendants];
  for (const el of nodes) {
    if (!el?.getAttribute) continue;
    const type = normalizeType(
      el.getAttribute("data-die-type") ??
      el.getAttribute("data-dice-type") ??
      el.getAttribute("data-type") ??
      el.getAttribute("aria-label") ??
      el.getAttribute("title") ??
      el.getAttribute("alt") ??
      el.className
    );
    if (!type) continue;
    let index = faceIndex(el.getAttribute("data-face-index") ?? el.getAttribute("data-result-index"), type, true);
    if (index == null) index = faceIndex(
      el.getAttribute("data-face") ?? el.getAttribute("data-face-number") ?? el.getAttribute("data-result"),
      type,
      false
    );
    if (index != null) dice.push({ type, faceIndex: index });
  }
  return dice;
}

function parseRenderedHtml(root) {
  if (!(root instanceof HTMLElement)) return [];
  const attrDice = parseDataAttributes(root);
  if (attrDice.length) return attrDice;

  const preferred = root.querySelectorAll(".genesys-chat-roll li, details li, li, tr, [class*='die'], [class*='dice']");
  const collected = [];
  for (const el of preferred) collected.push(...parseFaceText(el.textContent));
  if (collected.length) return collected;

  const textDice = parseFaceText(root.textContent);
  if (textDice.length) return textDice;

  const markup = root.outerHTML ?? "";
  return parseFaceText(markup.replace(/<[^>]+>/g, " "));
}

function isGenesysWorld() {
  const id = String(game?.system?.id ?? "").toLowerCase();
  const title = String(game?.system?.title ?? "").toLowerCase();
  return id.includes("genesys") || title.includes("genesys");
}

async function inspectRenderedMessage(message, html, phase = "renderChatMessageHTML") {
  if (!isGenesysWorld() || message?.flags?.[MODULE_ID]?.simulator) return;
  const api = globalThis.GenesysDiceForge;
  if (!api?.presentResolvedSystemRoll || !api?.wantsSystemRollPresentation?.()) return;

  const dice = parseRenderedHtml(html);
  const messageId = String(message?.id ?? message?._id ?? "unknown");
  const fingerprint = `${messageId}::${dice.map((die) => `${die.type}:${die.faceIndex}`).join("|")}`;
  const shared = sharedCaptureState();

  if (!dice.length) {
    if (game.settings.get(MODULE_ID, "debug")) {
      console.log("[Genesys Dice Forge] renderChatMessageHTML seen but no physical faces recovered.", {
        messageId,
        text: String(html?.textContent ?? "").slice(0, 1200),
        html: String(html?.outerHTML ?? "").slice(0, 2500)
      });
    }
    return;
  }

  // If the raw ChatMessage path already captured this message, or this rendered
  // path has already handled the same physical result, do not replay it.
  if (shared.messageIds.has(messageId)) return;
  const recent = shared.fingerprints.get(fingerprint);
  if (recent && Date.now() - recent < 2000) return;

  // Mark before awaiting animation so the deferred second render inspection and
  // other capture paths cannot start a duplicate roll concurrently.
  shared.messageIds.add(messageId);
  shared.fingerprints.set(fingerprint, Date.now());
  if (shared.messageIds.size > 300) shared.messageIds.delete(shared.messageIds.values().next().value);
  if (shared.fingerprints.size > 300) shared.fingerprints.delete(shared.fingerprints.keys().next().value);

  const payload = {
    rollId: `render-${messageId}`,
    dice,
    totals: {},
    net: {},
    context: {
      source: "genesys-rendered-chat-capture",
      origin: phase,
      messageId,
      systemId: String(game?.system?.id ?? "")
    }
  };

  if (game.settings.get(MODULE_ID, "debug")) {
    console.log(`[Genesys Dice Forge] Captured ${dice.length} dice from final rendered chat HTML.`, payload);
  }
  try {
    await api.presentResolvedSystemRoll(payload);
  } catch (error) {
    console.warn("[Genesys Dice Forge] Rendered chat capture failed.", error, payload);
  }
}

Hooks.once("ready", () => {
  if (!isGenesysWorld()) return;

  // Foundry v13+ / v14 supported hook. We deliberately do NOT use the deprecated
  // renderChatMessage hook that Foundry warns will be removed in v15.
  Hooks.on("renderChatMessageHTML", (message, html) => {
    void inspectRenderedMessage(message, html, "renderChatMessageHTML");
    globalThis.setTimeout(() => void inspectRenderedMessage(message, html, "renderChatMessageHTML+deferred"), 0);
  });

  console.info("[Genesys Dice Forge] v0.7.5 rendered-chat capture installed using renderChatMessageHTML (Foundry v13/v14, shared dedupe active).");
});
