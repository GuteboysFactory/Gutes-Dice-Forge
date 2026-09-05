# Genesys Dice Forge Changelog

## 1.0.0 - Stable Release

- Promotes the approved v0.9.0 release candidate to stable without intentionally changing renderer physics, dice artwork, audio, capture behavior or launcher placement.
- Locks the natural rigid-body landing + authoritative top-face artwork remap architecture as the v1.0 presentation baseline.
- Keeps zero-config Genesys auto-capture, rendered-chat fallback, shared deduplication, integrated chat launcher, standalone simulator, deterministic 52-face QA cycler and GOLD adaptive audio.
- Marks the public API as `stableRelease: true` and clears release-candidate status.
- Keeps Foundry VTT 13.351 as the verified runtime baseline.
- Keeps Foundry VTT 14 declared compatible but explicitly unverified at runtime until a real v14 environment is available.
- Future changes after v1.0 should be driven by real playtest bugs, compatibility findings or explicit feature requests rather than speculative polish.

## 0.9.0 - Release Candidate

- Promotes the feature-complete v0.8.0 baseline to release-candidate status without intentionally changing renderer physics, dice artwork, audio, capture behavior or launcher placement.
- Keeps Foundry VTT 13.351 as the verified runtime baseline.
- Keeps Foundry VTT 14 declared compatible but explicitly marks runtime verification as deferred until a real v14 environment is available.
- Adds release-candidate capability metadata and a `foundry14RuntimeVerified: false` flag to make the current support state explicit.
- Refreshes README architecture and QA documentation to match the approved natural-landing + authoritative top-face artwork-remap design.
- Keeps the hardened stable-package workflow as the canonical build path.

## 0.8.0 - Feature Complete Baseline

- Promotes the approved v0.7.17 runtime to the feature-complete baseline.
- Keeps natural rigid-body landing and authoritative top-face artwork remapping as the locked result-presentation architecture.
- Preserves zero-config Genesys roll capture, shared capture deduplication, rendered-chat fallback, integrated chat-toolbar launcher, standalone simulator, deterministic 52-face QA cycler, premium dice artwork, and GOLD adaptive audio.
- Adds `featureComplete: true` API capability metadata for the stabilization phase.
- Replaces the historical patch-chain rebuild path with a conservative canonical package workflow that starts from the approved stable runtime and overlays only first-class repository sources.
- Adds package hardening gates: syntax-check every packaged JavaScript module, verify manifest/API version consistency, verify all manifest esmodules/styles exist, verify the 52-face inventory, reject deprecated `renderChatMessage`, reject reactivated target-face guidance, and reject a restored final `targetRotation` snap.
- Foundry VTT 13.351 remains the verified runtime baseline. Version 14 remains declared compatible but still requires a real Foundry v14 client smoke test before it should be described as runtime-verified.
- No renderer physics, dice artwork, launcher placement, capture behavior, or audio behavior is intentionally changed from approved v0.7.17.

## 0.7.17 - Natural Landing + Authoritative Face Remap

- Stops forcing the rigid body toward an authoritative polygon face.
- Allows each die to complete its physical roll naturally, eliminating the target-face chase that could produce terminal spin or visible last-second corrections.
- Determines the physical polygon that naturally lands upward and maps the authoritative Genesys face artwork onto that top polygon.
- Keeps authoritative `type + faceIndex` result data unchanged; only presentation artwork is remapped.
- Preserves the approved three motion profiles, hold/fade continuity, automatic Genesys capture, chat launcher and GOLD adaptive audio.

## 0.7.10 - No Final Twist

- Removes the visible last-second quaternion correction after the physical roll has visually finished.
- Tightens Guided Settle so the authoritative result face must be acquired during the physics phase itself.
- Gives the physics guidance a longer grace window to finish orienting the correct face before presentation can settle.
- Strengthens only the late in-motion angular guidance; the opening throw and the three motion profiles remain unchanged.
- The deterministic settle phase no longer rotates the die at all; it preserves the exact physical end pose and only handles presentation timing.
- Keeps the authoritative Genesys `faceIndex` result unchanged, along with GOLD adaptive audio, dice artwork, auto-capture, shared dedupe and chat-toolbar launcher.
- Foundry VTT 13.351 remains the verified baseline with Version 14 compatibility target.

## 0.7.9 - Progressive Guided Settle

- Moves most result-face correction into the late physical roll instead of relying on a visible final twist.
- Keeps the opening of every throw fully physical; guidance only begins after the die has hit the tabletop and the roll has started losing energy.
- Uses torque/angular-velocity guidance toward the already-authoritative Genesys `faceIndex` rather than directly rotating the rendered die.
- Preserves natural yaw so symbols are not presentation-snapped toward the camera.
- Rail Rebound keeps only a weak pre-rail bias so its signature right-edge hit remains physical; Scatter Roll and Deep Bounce can guide somewhat earlier because they do not require the rail.
- Sleep detection now requires the authoritative face to already be close to upward before the deterministic settle may begin.
- Adds a short physics-only grace period after each motion profile's normal deadline so Guided Settle can finish naturally instead of cutting into a large correction.
- Reduces the final deterministic settle window from 320 ms to 180 ms; it remains as a safety micro-correction to guarantee exact face playback.
- No changes to authoritative result generation, three motion-profile weights, GOLD adaptive audio, dice artwork, auto-capture, shared dedupe, or chat-toolbar launcher.
- Foundry VTT 13.351 remains the verified baseline with Version 14 compatibility target.

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
