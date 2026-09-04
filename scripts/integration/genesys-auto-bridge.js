const TYPE_ALIASES = new Map([
  ["b", "boost"], ["boost", "boost"], ["boostdie", "boost"], ["boostdice", "boost"],
  ["s", "setback"], ["setback", "setback"], ["setbackdie", "setback"], ["setbackdice", "setback"],
  ["a", "ability"], ["ability", "ability"], ["abilitydie", "ability"], ["abilitydice", "ability"],
  ["d", "difficulty"], ["difficulty", "difficulty"], ["difficultydie", "difficulty"], ["difficultydice", "difficulty"],
  ["p", "proficiency"], ["proficiency", "proficiency"], ["proficiencydie", "proficiency"], ["proficiencydice", "proficiency"],
  ["c", "challenge"], ["challenge", "challenge"], ["challengedie", "challenge"], ["challengedice", "challenge"]
]);

const SIDES = Object.freeze({ boost: 6, setback: 6, ability: 8, difficulty: 8, proficiency: 12, challenge: 12 });
const COMMON_HOOKS = Object.freeze([
  "genesysRollResolved",
  "genesysCheckResolved",
  "genesysRollComplete",
  "genesysDiceRolled",
  "genesysResolvedRoll"
]);
const TYPE_LABEL_PATTERN = "(Boost|Setback|Ability|Difficulty|Proficiency|Challenge)";
const FACE_TEXT_PATTERNS = Object.freeze([
  new RegExp(`\\b${TYPE_LABEL_PATTERN}\\s*(?:Die\\s*)?#\\s*(\\d{1,2})\\b`, "gi"),
  new RegExp(`\\b${TYPE_LABEL_PATTERN}\\s*(?:Die\\s*)?(?:Face|Result)\\s*#?\\s*(\\d{1,2})\\b`, "gi")
]);

function compact(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z]/g, "");
}

function normalizeType(value) {
  const key = compact(value);
  if (!key) return null;
  if (TYPE_ALIASES.has(key)) return TYPE_ALIASES.get(key);
  for (const [alias, type] of TYPE_ALIASES) {
    if (alias.length > 1 && key.includes(alias)) return type;
  }
  return null;
}

function isGenesysGameSystem() {
  const id = String(game?.system?.id ?? "").toLowerCase();
  const title = String(game?.system?.title ?? "").toLowerCase();
  return id.includes("genesys") || title.includes("genesys");
}

function integerValue(value) {
  if (Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function faceIndexFromIndex(value, type) {
  if (!type) return null;
  const n = integerValue(value);
  return n != null && n >= 0 && n < SIDES[type] ? n : null;
}

function faceIndexFromFaceNumber(value, type) {
  if (!type) return null;
  const n = integerValue(value);
  if (n == null) return null;
  if (n >= 1 && n <= SIDES[type]) return n - 1;
  if (n === 0) return 0;
  return null;
}

function readDieObject(obj) {
  if (!obj || typeof obj !== "object") return null;
  const type = normalizeType(
    obj.type ?? obj.dieType ?? obj.diceType ?? obj.kind ?? obj.name ?? obj.code ?? obj.denomination ?? obj.flavor
  );
  if (!type) return null;

  const explicitIndex = obj.faceIndex ?? obj.face_index ?? obj.index ?? obj.resultIndex ?? obj.result_index;
  let faceIndex = faceIndexFromIndex(explicitIndex, type);
  if (faceIndex == null) faceIndex = faceIndexFromIndex(obj.result?.faceIndex ?? obj.result?.index, type);
  if (faceIndex == null) faceIndex = faceIndexFromFaceNumber(
    obj.face ?? obj.faceNumber ?? obj.value ?? obj.result?.result ?? (typeof obj.result === "number" ? obj.result : null),
    type
  );
  if (faceIndex == null) return null;
  const die = { type, faceIndex };
  if (obj.rawSymbols && typeof obj.rawSymbols === "object") die.rawSymbols = obj.rawSymbols;
  else if (obj.symbols && typeof obj.symbols === "object") die.rawSymbols = obj.symbols;
  return die;
}

function findDiceArray(root, maxDepth = 7) {
  const seen = new Set();
  function walk(value, depth) {
    if (depth > maxDepth || value == null || typeof value !== "object" || seen.has(value)) return null;
    seen.add(value);
    if (Array.isArray(value)) {
      const objects = value.filter((item) => item && typeof item === "object");
      const parsed = objects.map(readDieObject).filter(Boolean);
      if (parsed.length && parsed.length === objects.length) return parsed;
      for (const item of value) {
        const nested = walk(item, depth + 1);
        if (nested?.length) return nested;
      }
      return null;
    }
    const priorityKeys = ["dice", "rolledDice", "rollDice", "physicalDice", "dieResults", "diceResults", "results"];
    for (const key of priorityKeys) {
      if (!Array.isArray(value[key])) continue;
      const parsed = value[key].map(readDieObject).filter(Boolean);
      if (parsed.length) return parsed;
    }
    for (const child of Object.values(value)) {
      const nested = walk(child, depth + 1);
      if (nested?.length) return nested;
    }
    return null;
  }
  return walk(root, 0);
}

function typeFromTerm(term) {
  const candidates = [
    term?.options?.type,
    term?.options?.dieType,
    term?.options?.flavor,
    term?.denomination,
    term?.constructor?.DENOMINATION,
    term?.constructor?.name
  ];
  for (const candidate of candidates) {
    const type = normalizeType(candidate);
    if (type) return type;
  }
  return null;
}

function diceFromRollTerms(rolls) {
  const dice = [];
  const queue = Array.isArray(rolls) ? [...rolls] : rolls ? [rolls] : [];
  for (const roll of queue) {
    const terms = Array.isArray(roll?.terms) ? roll.terms : [];
    for (const term of terms) {
      const type = typeFromTerm(term);
      if (!type || !Array.isArray(term?.results)) continue;
      for (const result of term.results) {
        if (result?.active === false) continue;
        let faceIndex = faceIndexFromIndex(result?.faceIndex ?? result?.index, type);
        if (faceIndex == null) faceIndex = faceIndexFromFaceNumber(result?.result, type);
        if (faceIndex != null) dice.push({ type, faceIndex });
      }
    }
  }
  return dice;
}

function diceFromDataAttributes(fragment) {
  const out = [];
  for (const el of fragment.querySelectorAll("[data-die-type], [data-dice-type]")) {
    const type = normalizeType(el.dataset.dieType ?? el.dataset.diceType);
    if (!type) continue;
    let faceIndex = faceIndexFromIndex(el.dataset.faceIndex ?? el.dataset.resultIndex, type);
    if (faceIndex == null) faceIndex = faceIndexFromFaceNumber(el.dataset.face ?? el.dataset.faceNumber ?? el.dataset.result, type);
    if (faceIndex != null) out.push({ type, faceIndex });
  }
  return out;
}

function diceFromFaceText(text) {
  const source = String(text ?? "");
  if (!source) return [];
  for (const pattern of FACE_TEXT_PATTERNS) {
    pattern.lastIndex = 0;
    const out = [];
    let match;
    while ((match = pattern.exec(source))) {
      const type = normalizeType(match[1]);
      const faceIndex = faceIndexFromFaceNumber(match[2], type);
      if (type && faceIndex != null) out.push({ type, faceIndex });
    }
    if (out.length) return out;
  }
  return [];
}

function diceFromSemanticContent(fragment) {
  const preferred = fragment.querySelectorAll(
    ".genesys-chat-roll li, .genesys-chat-roll [class*='die'], details li, li, tr, [data-face-index], [data-face]"
  );
  const collected = [];
  for (const el of preferred) {
    const dice = diceFromFaceText(el.textContent);
    if (dice.length) collected.push(...dice);
  }
  if (collected.length) return collected;
  return diceFromFaceText(fragment.textContent);
}

function diceFromContent(content) {
  if (typeof content !== "string" || !content.trim()) return [];
  try {
    const template = document.createElement("template");
    template.innerHTML = content;
    const attrDice = diceFromDataAttributes(template.content);
    if (attrDice.length) return attrDice;
    const semanticDice = diceFromSemanticContent(template.content);
    if (semanticDice.length) return semanticDice;
  } catch (_) {
  }
  return diceFromFaceText(content.replace(/<[^>]+>/g, " "));
}

function buildPayload(source, dice, origin) {
  if (!dice?.length) return null;
  const id = source?.id ?? source?._id ?? source?.rollId ?? source?.checkId ?? `${origin}-${Date.now()}`;
  return {
    rollId: `auto-${id}`,
    dice,
    totals: source?.totals ?? source?.result?.totals ?? source?.raw ?? source?.result?.raw ?? {},
    net: source?.net ?? source?.result?.net ?? {},
    context: {
      source: "genesys-auto-bridge",
      origin,
      actorId: source?.actorId ?? source?.actor?.id ?? source?.speaker?.actor ?? null,
      messageId: source?.id ?? source?._id ?? null,
      systemId: String(game?.system?.id ?? "")
    }
  };
}

function extractFromMessage(message) {
  const plain = typeof message?.toObject === "function" ? message.toObject(false) : message;
  const flagDice = findDiceArray(plain?.flags ?? plain);
  if (flagDice?.length) return buildPayload(plain, flagDice, "chat-flags");

  const rollDice = diceFromRollTerms(message?.rolls ?? plain?.rolls ?? message?.roll ?? plain?.roll);
  if (rollDice.length) return buildPayload(plain, rollDice, "chat-roll-terms");

  const contentDice = diceFromContent(message?.content ?? plain?.content);
  if (contentDice.length) return buildPayload(plain, contentDice, "chat-content");
  return null;
}

function extractFromHook(args) {
  for (const arg of args) {
    if (!arg || typeof arg !== "object") continue;
    const dice = findDiceArray(arg);
    if (dice?.length) return buildPayload(arg, dice, "system-hook");
  }
  return null;
}

function payloadFingerprint(payload) {
  const dice = payload?.dice?.map((die) => `${die.type}:${die.faceIndex}`).join("|") ?? "";
  const messageId = payload?.context?.messageId ?? "";
  return `${messageId}::${dice}`;
}

export function installGenesysAutoBridge(api, { moduleId = "genesys-dice-forge" } = {}) {
  if (!api || !isGenesysGameSystem()) return { installed: false, reason: "not-genesys-system" };

  const seenRollIds = new Set();
  const recentFingerprints = new Map();
  const presentedMessages = new Set();

  const remember = (payload) => {
    if (payload?.rollId) {
      seenRollIds.add(payload.rollId);
      if (seenRollIds.size > 300) seenRollIds.delete(seenRollIds.values().next().value);
    }
    const fingerprint = payloadFingerprint(payload);
    recentFingerprints.set(fingerprint, Date.now());
    if (recentFingerprints.size > 300) recentFingerprints.delete(recentFingerprints.keys().next().value);
    const messageId = payload?.context?.messageId;
    if (messageId) {
      presentedMessages.add(messageId);
      if (presentedMessages.size > 300) presentedMessages.delete(presentedMessages.values().next().value);
    }
  };

  const alreadySeen = (payload) => {
    if (payload?.rollId && seenRollIds.has(payload.rollId)) return true;
    const messageId = payload?.context?.messageId;
    if (messageId && presentedMessages.has(messageId)) return true;
    const fingerprint = payloadFingerprint(payload);
    const timestamp = recentFingerprints.get(fingerprint);
    return Boolean(timestamp && Date.now() - timestamp < 1200);
  };

  const present = async (payload) => {
    if (!payload?.dice?.length || !api.wantsSystemRollPresentation?.()) return false;
    if (alreadySeen(payload)) return false;
    remember(payload);
    try {
      const result = await api.presentResolvedSystemRoll(payload);
      if (game.settings.get(moduleId, "debug")) {
        console.debug(`[Genesys Dice Forge] Auto-captured ${payload.dice.length} physical dice from ${payload.context?.origin}.`, payload);
      }
      return Boolean(result?.rendered);
    } catch (error) {
      console.warn("[Genesys Dice Forge] Automatic Genesys roll presentation failed.", error, payload);
      return false;
    }
  };

  const inspectMessage = (message) => {
    if (message?.flags?.[moduleId]?.simulator) return;
    const payload = extractFromMessage(message);
    if (payload) void present(payload);
    else if (game.settings.get(moduleId, "debug")) {
      console.debug("[Genesys Dice Forge] Genesys chat message had no recoverable physical die faces.", message);
    }
  };

  Hooks.on("createChatMessage", inspectMessage);
  Hooks.on("updateChatMessage", (message) => {
    if (!presentedMessages.has(message?.id)) inspectMessage(message);
  });

  for (const hookName of COMMON_HOOKS) {
    Hooks.on(hookName, (...args) => {
      const payload = extractFromHook(args);
      if (payload) void present(payload);
    });
  }

  console.info("[Genesys Dice Forge] Zero-config Genesys auto-capture installed (flags + roll terms + chat face list + resolved-roll hooks).");
  return { installed: true, mode: "zero-config" };
}
