# Genesys Dice Forge Changelog

## 0.7.8 - Randomized Motion Profiles

- Adds three distinct physical roll profiles selected independently for each roll.
- All three profiles preserve the same familiar upper-left overhand release; the motion only diverges after first tabletop impact.
- **Rail Rebound** keeps the established signature path toward the right rail and rebounds back into the play area.
- **Scatter Roll** fans the handful laterally after first impact, encourages more crossing trajectories/die collisions, and does not require every die to reach the right rail before sleeping.
- **Deep Bounce** retains more vertical energy after first impact, adds a livelier mid-roll phase, and settles naturally without requiring the rail path.
- Weighted random selection is 40% Rail Rebound, 35% Scatter Roll, 25% Deep Bounce.
- Motion-profile RNG uses a separate deterministic stream so profile selection does not alter the existing release/spawn randomness for a given roll.
- The selected motion profile is presentation-only and never affects authoritative Genesys `faceIndex` results.
- Debug mode logs the selected motion profile for QA.
- Keeps deterministic minimal-correction face-up settling, GOLD adaptive audio, premium dice artwork, zero-config Genesys capture, shared capture dedupe, and the chat-toolbar launcher unchanged.
- Foundry VTT 13.351 remains the verified baseline with Version 14 compatibility target.

## 0.7.7 - Integrated Chat Launcher

- Replaces the persistent floating Dice Forge launcher with a compact dice icon mounted alongside the Foundry chat roll-mode controls.
- Clicking the chat icon opens the existing standalone Dice Forge roller near the chat controls.
- The legacy floating launcher remains internally available as the simulator toggle source but is hidden when the integrated launcher is present.
- Uses DOM discovery instead of Foundry private internals for v13.351 / v14 resilience.

## 0.7.6 - Shared Capture Deduplication

- Shares captured ChatMessage IDs/fingerprints across the raw ChatMessage and rendered-chat fallback paths.
- Claims a roll before asynchronous animation begins, preventing the same Genesys result from spawning multiple 3D roll waves.
- Keeps all automatic capture paths while enforcing one physical presentation per captured message.

## 0.7.5 - Foundry v13/v14 Rendered Chat Capture

- Adds a final-DOM fallback using Foundry's modern `renderChatMessageHTML` hook.
- Explicitly avoids the deprecated `renderChatMessage` hook so the Dice Forge path remains suitable for Foundry v13.351 and Version 14.
- Inspects the fully rendered chat card after system/module decoration for exact Genesys die type + physical face information.
- Adds a zero-delay deferred second inspection for cards decorated during the same render cycle.
- Debug mode now reports whether the final rendered chat card was seen and whether physical faces could be recovered.
- Keeps the existing flags, roll-term, chat-content, data-attribute and resolved-hook auto-capture paths.
- Uses a version-specific package URL (`dist/genesys-dice-forge-v0.7.5.zip`) to avoid stale Foundry package caching between integration patches.
- No changes to GOLD adaptive audio, premium dice artwork, face distributions or tabletop physics.

## 0.7.4 - Zero-Config Genesys Auto Capture

- Makes module activation the only required integration step in a Genesys world.
- Automatic capture inspects Foundry ChatMessage flags, native roll terms, common Genesys resolved-roll hooks, `data-die-type` / `data-face-index` markup, and semantic rolled-face text.
- Supports semantic recovery of chat-card face lines such as `Ability #7`, `Difficulty #3`, and equivalent result forms.
- Adds an `updateChatMessage` fallback for systems that attach roll details immediately after message creation.
- Adds duplicate suppression across hooks/chat updates without suppressing legitimate later rolls.
- Legacy system-presentation/auto-bridge enable toggles are hidden and no longer gate presentation.
- Dice Forge remains presentation-only and never re-rolls a captured system result.
- Maintains Foundry VTT 13.351 as the current verified target with Version 14 forward-compatibility target.
- No changes to GOLD adaptive audio, premium dice artwork, face distributions or tabletop physics.

## 0.7.3 - Top Layer + Automatic Genesys Bridge

- 3D dice canvas stays above normal Foundry application windows while remaining pointer-transparent.
- Added automatic inspection of common Genesys hooks and chat data as a compatibility bridge.
- Preserved direct `presentResolvedSystemRoll()` API for systems that explicitly expose exact per-die results.

## 0.7.1 - Result Presentation + Roll Simulator

- Result faces finish physically upward and player-readable.
- Added standalone pool builder and Genesys narrative roll simulator.
- Preserved authoritative face indices and adaptive audio.

## 0.7.0 - Premium Physical Dice Pass

- Premium polished dice bodies, locked narrative glyph silhouettes, authentic face composition and high-contrast symbol policy.
