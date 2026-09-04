# Genesys Dice Forge

> **v0.7.4 Zero-Config Auto Capture:** when the module is active in a Genesys world, Dice Forge automatically looks for the already-resolved physical dice in Foundry chat data, roll terms, common Genesys hooks, data attributes, and rolled-face text such as `Ability #7`. No Genesys VTT patch or bridge registration is required when the system publishes per-die face information.

Dedicated 3D narrative dice presentation for Genesys.

**Target:** Foundry VTT 13.351 and Version 14.

The Genesys rules engine remains authoritative. Dice Forge receives or recovers the exact die types and zero-based `faceIndex` values and only presents those outcomes visually.

## v0.7.4 - Zero-Config Auto Capture

- Module activation is the only required integration step in a Genesys world.
- Automatic capture inspects Foundry ChatMessage flags, native roll terms, common Genesys resolved-roll hooks, `data-die-type` / `data-face-index` markup, and semantic rolled-face text.
- Existing Genesys chat-card forms such as `Ability #7` and `Difficulty #3` can be converted back to exact physical die type + face index without re-rolling.
- Adds `updateChatMessage` fallback for systems that attach roll details immediately after message creation.
- Adds duplicate suppression across hooks/chat updates without suppressing later legitimate rolls.
- Legacy system-presentation and auto-bridge toggles are hidden and no longer gate presentation.
- Dice Forge remains presentation-only and never re-rolls a captured system result.
- GOLD adaptive audio, premium dice artwork, face distributions and table-roll physics are unchanged.

## Premium dice target

- Boost d6: light blue body, black glyphs.
- Setback d6: black body, light glyphs.
- Ability d8: green body, black glyphs.
- Difficulty d8: purple body, light glyphs.
- Proficiency d12: yellow body, black glyphs.
- Challenge d12: red body, high-contrast glyphs.
- Blank, single, double and mixed-result faces follow the authentic narrative-dice distribution.
- The six locked glyph silhouettes remain Success, Advantage, Triumph, Failure, Threat and Despair.

## Standalone roll simulator

Enable **Module Settings -> Genesys Dice Forge -> Show Dice Forge Roller**. The **DICE FORGE** button opens a pool builder that works independently of the game system.

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

Dice Forge displays exactly those dice and settles them on exactly those faces.

## QA

Enable **Module Settings -> Genesys Dice Forge -> QA / Debug Mode** for the local **TEST DICE** button and console diagnostics.

Check that:

1. Dice appear above Foundry application windows.
2. Dice enter from the left as a loose handful and use the desktop as a virtual tabletop.
3. Dice bounce, collide, lose energy and rebound from the right boundary.
4. Final result faces are physically upward and readable.
5. The full pool count and exact die types are shown.
6. Adaptive audio varies naturally between rolls.
7. A normal Genesys chat roll automatically triggers Dice Forge when exact physical faces can be recovered.
8. No Foundry canvas/PIXI interference occurs on v13.351 or v14.

## Architecture

Dice Forge is presentation-only. The game system owns pool construction, RNG, symbol totals and rules resolution. Dice Forge owns WebGL rendering, premium artwork, adaptive audio, deterministic final-face presentation and zero-config capture.

The physical simulation is not gameplay-authoritative. Real-looking movement evolves freely; only after kinetic energy is low does a short settle phase orient each die to the already-resolved result. **Rules != Physics.**

## GitHub / Foundry automatic updates

Repository: https://github.com/GuteboysFactory/Gutes-Dice-Forge

Foundry manifest URL:
`https://raw.githubusercontent.com/GuteboysFactory/Gutes-Dice-Forge/main/module.json`

Stable package URL:
`https://raw.githubusercontent.com/GuteboysFactory/Gutes-Dice-Forge/main/genesys-dice-forge.zip`

The repository includes an automated package workflow. Source-overlay changes on `main` rebuild the stable `genesys-dice-forge.zip`, so Foundry installations using the manifest URL can detect newer module versions through normal package updates.
