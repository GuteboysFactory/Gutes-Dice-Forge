# Genesys Dice Forge

> **v1.0.0 Stable Release:** Genesys Dice Forge is feature-complete and approved for the Foundry VTT 13.351 baseline. Version 14 compatibility is declared and statically guarded; runtime verification is deferred until a real v14 environment is available.

Dedicated 3D narrative dice presentation for Genesys.

**Verified runtime:** Foundry VTT 13.351.  
**Declared compatibility:** Foundry VTT 14.x, runtime QA deferred.

The Genesys rules engine remains authoritative. Dice Forge receives or recovers the exact die types and zero-based `faceIndex` values and only presents those outcomes visually.

## Stable baseline

- Zero-config automatic Genesys roll capture.
- Rendered-chat fallback using Foundry's modern `renderChatMessageHTML` hook.
- Shared deduplication so the same resolved roll is not animated twice.
- Integrated chat-toolbar Dice Forge launcher positioned before Foundry chat utilities when available.
- Three randomized physical roll profiles: Rail Rebound, Scatter Roll and Deep Bounce.
- Natural rigid-body landing with authoritative top-face artwork remapping.
- Premium d6/d8/d12 narrative dice with all 52 audited physical face definitions.
- GOLD adaptive dice audio.
- Standalone Genesys pool simulator.
- Deterministic 52-face visual QA cycler in Debug Mode.
- Always-on-top, click-through presentation layer.

## Result presentation architecture

Dice Forge does not force the rigid body toward a predetermined physical polygon. Each die completes its physical roll naturally. Once the die has settled, Dice Forge identifies the polygon that naturally ended up on top and maps the authoritative Genesys result artwork to that visible top face.

This keeps the important separation intact:

- **Genesys owns:** pool construction, RNG, symbol totals, cancellation and rules resolution.
- **Dice Forge owns:** visual presentation, physical motion, artwork, audio and capture.

**Rules != Physics.** The game result is authoritative; the physical simulation is presentation-only.

## Premium dice target

- Boost d6: light blue body, black glyphs.
- Setback d6: black body, light glyphs.
- Ability d8: green body, black glyphs.
- Difficulty d8: purple body, light glyphs.
- Proficiency d12: yellow body, black glyphs.
- Challenge d12: red body, high-contrast glyphs.
- Blank, single, double and mixed-result faces follow the audited narrative-dice distribution.
- The six locked glyph silhouettes are Success, Advantage, Triumph, Failure, Threat and Despair.

## Standalone roll simulator

Enable **Module Settings -> Genesys Dice Forge -> Show Dice Forge Roller**. The integrated Dice Forge chat icon opens a pool builder that works independently of the game system.

```js
const forge = game.modules.get("genesys-dice-forge")?.api;
const { payload, animation } = forge.rollPool({
  ability: 2,
  proficiency: 1,
  difficulty: 2,
  setback: 1
});
await animation;
console.log(payload.net);
```

## Direct API contract

Systems that expose authoritative physical results can still call Dice Forge directly:

```js
await game.modules.get("genesys-dice-forge")?.api?.presentResolvedSystemRoll({
  rollId: "chat-message-or-roll-uuid",
  dice: [
    { type: "ability", faceIndex: 6 },
    { type: "proficiency", faceIndex: 11 },
    { type: "difficulty", faceIndex: 5 }
  ],
  totals: {},
  net: {},
  context: {}
});
```

Dice Forge presents exactly those authoritative die results; it does not reroll them.

## QA

Enable **Module Settings -> Genesys Dice Forge -> QA / Debug Mode** for the local **TEST DICE** control, deterministic **FACE QA** cycler and console diagnostics.

Current stable checks cover:

1. Exact 52-face narrative inventory.
2. JavaScript syntax for all packaged module scripts.
3. Manifest/API version consistency.
4. Manifest-referenced modules and styles exist.
5. Deprecated `renderChatMessage` is rejected; `renderChatMessageHTML` is required.
6. Approved natural-landing architecture remains present.
7. Old target-face guidance and final `targetRotation` snap are rejected if reintroduced.
8. Stable ZIP integrity is validated after packaging.

Foundry v14 remains a deferred runtime smoke test. When a v14 environment is available, the intended pass is: install/load -> launcher -> simulator -> Genesys auto-capture -> 3D rendering -> audio -> console regression.

## GitHub / Foundry automatic updates

Repository: https://github.com/GuteboysFactory/Gutes-Dice-Forge

Foundry manifest URL:  
`https://raw.githubusercontent.com/GuteboysFactory/Gutes-Dice-Forge/main/module.json`

Stable package URL:  
`https://raw.githubusercontent.com/GuteboysFactory/Gutes-Dice-Forge/main/genesys-dice-forge.zip`

Versioned v1.0.0 package:  
`https://raw.githubusercontent.com/GuteboysFactory/Gutes-Dice-Forge/main/dist/genesys-dice-forge-v1.0.0.zip`

The repository's stable package workflow rebuilds from the approved packaged runtime, overlays first-class repository sources, runs hardening checks, verifies the archive and publishes the current stable ZIP.

**Current stable target:** v1.0.0.
