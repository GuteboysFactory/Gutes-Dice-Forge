# Genesys Dice Forge Changelog

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
