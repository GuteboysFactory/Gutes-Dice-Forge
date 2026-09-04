# Genesys Dice Forge

> **v0.7.1 Result Presentation + Roll Simulator:** dice now finish with the authoritative result face physically upward and consistently oriented toward the player, without the old random final yaw twist. Dice Forge also includes a standalone pool builder/roller that can roll and resolve Genesys dice without the custom game system.

Dedicated 3D narrative dice presentation for the custom Genesys VTT system.

**Target:** Foundry VTT 13.351 and Version 14.

The Genesys rules engine remains authoritative. Dice Forge receives the exact die types and zero-based `faceIndex` values and only presents those outcomes visually.


## v0.7.1 - Result Presentation + Standalone Roll Simulator

- Removed the random final yaw used by deterministic settling. The chosen result face still rests physically upward, but its artwork orientation is now normalized toward the player.
- Replaced the visible last-moment twist with a very small decaying physical rock around a horizontal axis only. At the end of settle the die is exactly on its authoritative `faceIndex`.
- Extended the stationary result hold so the full top-face result can be read before fade-out.
- Added **Show Dice Forge Roller** client setting and a permanent **DICE FORGE** button when enabled.
- Added a standalone pool builder for Boost, Setback, Ability, Difficulty, Proficiency and Challenge dice.
- Standalone rolls randomly select real face indices from each die definition, animate the exact rolled dice, and resolve Success/Failure, Advantage/Threat, Triumph and Despair using the same audited face tables.
- Triumph contributes one Success and Despair contributes one Failure while remaining uncancelled special results.
- Added optional **POST RESULT TO CHAT** from the standalone simulator.
- The custom Genesys system remains authoritative when it supplies its own roll payloads; the simulator is an additional independent use mode.

## v0.7.0 - Premium Physical Dice Pass

- Rebuilt the face-artwork pass around the approved **premium physical dice** look instead of the older filigree-heavy fantasy treatment.
- Dice bodies now read as polished enamel/stone with restrained scuffs, hairline wear and clear-coat highlights.
- Face borders are clean forged metal trim with a recessed socket, cast-metal body, inner bevel and polished highlight.
- Removed decorative rosettes, corner filigree and studs so the dice read as real premium tabletop dice rather than ornament panels.
- The six user-approved narrative glyph silhouettes remain locked and are now rendered from their clean alpha masks.
- Symbol contrast policy is explicit: **black glyphs on Boost, Ability, Proficiency and Challenge; light glyphs on Setback and Difficulty**.
- Blank faces are actually blank.
- Multi-symbol faces use separate glyphs with compact physical-dice placement; no `x2` notation or merged decorative badge.
- Face distributions remain exactly the audited Genesys distributions for Boost/Setback/Ability/Difficulty/Proficiency/Challenge.
- Increased generated face atlas tiles to 512 px for better small-scale symbol clarity.
- Added a stronger polished-enamel clear-coat response in the WebGL shader while keeping the material palette readable under Foundry lighting.
- Triumph and Despair keep a separate subtle emissive accent without changing the face glyph color.
- v0.6.2 overhand drop/right-rail rebound physics and the GOLD adaptive audio remain unchanged.

## Visual target

The runtime design combines two locked requirements:

1. **Body/material appearance:** the approved premium render in `docs/reference/premium-dice-target.png`.
2. **Mechanical face composition:** the exact per-face Genesys result distributions in `scripts/core/dice-types.js`.

The runtime never copies a photographed die texture. It procedurally builds the premium material/trim and mounts the approved glyph masks according to the authoritative face definition.

## Runtime contract

A real system roll can pass any pool, for example:

```js
await game.modules.get("genesys-dice-forge")?.api?.animateRoll({
  rollId: "chat-message-or-roll-uuid",
  dice: [
    { type: "ability", faceIndex: 6 },
    { type: "ability", faceIndex: 2 },
    { type: "proficiency", faceIndex: 11 },
    { type: "difficulty", faceIndex: 5 },
    { type: "setback", faceIndex: 4 }
  ],
  totals: {},
  net: {},
  context: {}
});
```

Dice Forge shows **exactly five physical dice of those exact types**. The supplied face indices are the final upward results.


## Standalone roll simulator

Enable **Module Settings -> Genesys Dice Forge -> Show Dice Forge Roller**. The **DICE FORGE** button opens a pool builder that can be used in any Foundry world. Select the number and type of narrative dice and press **ROLL DICE**.

The public API also exposes simulator rolls:

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

The generated `payload` contains the exact random `faceIndex` for every die plus raw/resolved narrative results.

## QA

Enable **Module Settings -> Genesys Dice Forge -> QA / Debug Mode**, then press **TEST DICE** several times.

Check these points in Foundry:

1. Dice enter from the left as a loose handful, not a formation.
2. Each die has visibly independent trajectory and spin.
3. Gravity and first contact make the Foundry desktop read as a table surface.
4. Dice physically bounce, roll and lose energy rather than following a preset curve.
5. Dice can hit one another and exchange direction/spin.
6. Dice reaching the right/depth boundary rebound and remain on the visible table.
7. Final positions are organic and differ between rolls.
8. The final upward symbol on every die matches the requested authoritative `faceIndex`.
9. The full pool count/types are shown.
10. Adaptive audio remains unchanged and varies between rolls.
11. No Foundry canvas/PIXI interference occurs on v13.351 or v14.

## Architecture

Dice Forge remains presentation-only. The Genesys system owns pool construction, RNG, symbol totals and final face indices. Dice Forge owns WebGL rendering, artwork, audio and deterministic presentation physics.

The physical simulation is intentionally **not gameplay-authoritative**. Real-looking movement is allowed to evolve freely; only after kinetic energy is low does a short settle phase orient each die to the result already resolved by Genesys. This guarantees `Rules != Physics` while preserving the illusion of a real tabletop roll.


## v0.6.1 hotfix
Restores the WebGL mesh constructors accidentally removed in v0.6.0. If v0.6.0 produced dice audio but no visible dice, v0.6.1 is the corrective build. Physics, artwork and audio tuning are otherwise unchanged.


## v0.7.3 system presentation behavior
The WebGL dice layer is intentionally above normal Foundry application windows and remains pointer-transparent. The preferred system integration is still a direct call from the custom Genesys roll-presentation stage to `game.modules.get("genesys-dice-forge")?.api.presentResolvedSystemRoll(payload)`. An automatic chat/hook bridge is included as a compatibility fallback when the system exposes physical per-die results. If the system only publishes net symbols and not die type + face index, exact 3D reproduction cannot be reconstructed and the system must be patched at its central resolved-roll stage.

## GitHub / Foundry automatic updates

Repository: https://github.com/GuteboysFactory/Gutes-Dice-Forge

Foundry manifest URL:
`https://raw.githubusercontent.com/GuteboysFactory/Gutes-Dice-Forge/main/module.json`

The manifest points Foundry to the current packaged module at:
`https://raw.githubusercontent.com/GuteboysFactory/Gutes-Dice-Forge/main/dist/genesys-dice-forge.zip`

For each release, bump `version` in `module.json`, rebuild `dist/genesys-dice-forge.zip`, and push both source and package to `main`. Foundry installations using the manifest URL can then detect and install the newer version through normal package updates.
