# Code review fixes · 2026-10-06

- Chapter two updates map language in place. The iframe, player position and unfinished route remain intact; initialization uses the latest selected language.
- Save and checkpoint writes share a visible session-only warning when browser storage fails. A later successful write clears the warning and persists the session progress.
- Chapter two records branch context with each dialogue entry. Narrative text, narration paths and history use one resolver. Legacy single-run history uses the choices already recorded in its save.
- A character rename no longer changes the chapter two ending image filename. Both languages check every narrative frame against the shipped image files.
- Mirror hall initialization catches unsupported WebGL 2, module loading and shader compilation failures. The parent offers localized retry/back controls and a loading timeout. Retry restores collected clues through a new ready handshake.
- Chapter one, chapter three and the coastal DLC protect controls and dialogue with device safe-area insets, including landscape and immersive views.
- The development dependency `source-map-js` is updated to 1.2.2. Dependency audit reports no vulnerabilities.
- Optional web fonts load after the initial page render. Network failures leave system-font fallbacks available.
- Bilingual player-facing update notes use a new release ID: `2026-10-06-game-stability-fixes`.

## Verification

Run the production build, all package `check:*` scripts, and the existing `check-ice-input.mjs` and `check-ice-quality-picker.mjs` scripts. The new `check:review-fixes` exercises the real chapter controller with simulated storage/frame events, branch history migration, initialization failures and font loading.

Browser and real-device visual acceptance is left to the user under the project rules.
