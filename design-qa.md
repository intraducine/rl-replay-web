# Replay UI Spacing, Polish, and Annotation Audit

Audit date: 2026-07-12

## Scope

- Surface: replay viewer chrome, open roster, player cards, and playback rail.
- Goal: remove inconsistent spacing and overflow, use a rounded UI face, make every player accent stripe straight, and resolve all 14 browser annotations.
- Audit mode: combined visual, responsive, interaction, and accessibility-risk review.

## Design system used

- Typeface: `ui-rounded`, then SF Pro Rounded, Avenir Next, Nunito Sans, Segoe UI, and system fallbacks.
- Spacing scale: 4, 8, 12, 16, 24, and 32 px.
- Viewer edge: 20 px on desktop/tablet and 8 px on mobile.
- Signature geometry: clipped broadcast scoreboard and player HUD, with a square-ended vertical team stripe.
- Palette: existing ink, blue, orange, cyan, white, and muted gray tokens were retained.

## Audit steps

### 1. Desktop replay view, 1487 x 1058 — healthy

![Final desktop replay UI](.codex-ui-audit/spacing-audit-final-desktop.png)

- Document overflow: 0 px horizontal and 0 px vertical.
- Header, scoreboard, and camera dock do not collide.
- Player HUD and timeline do not collide; the gap is exactly 24 px.
- Header content width equals its client width.
- Timeline and transport rows are vertically balanced inside the 198 px rail.

### 2. Tablet replay view, 900 x 900 — healthy

![Final tablet replay UI](.codex-ui-audit/spacing-audit-final-tablet.png)

- Document overflow: 0 px.
- Header, camera dock, and lowered scoreboard have no collisions.
- Player HUD stays 24 px above the replay rail.
- Desktop transport controls and speed control remain fully visible.

### 3. Mobile replay view, 390 x 844 — healthy

![Final mobile replay UI](.codex-ui-audit/spacing-audit-final-mobile.png)

- Document overflow: 0 px.
- Header, scoreboard, and camera dock use consistent 8 px vertical gaps.
- Mobile transport client width equals scroll width: 374 px.
- Timeline client width equals scroll width: 390 px.
- Player HUD stays 12 px above the replay rail.

### 4. Open roster and player cards — healthy

![Final mobile roster and player cards](.codex-ui-audit/spacing-audit-final-roster.png)

- Drawer client width equals scroll width; only vertical scrolling remains.
- Every player card client width equals scroll width.
- Every team accent is a straight, square-ended 4 px left stripe.
- Cards use 12 px padding, 8 px internal gaps, and 8 px gaps between cards.
- Metadata wraps inside the drawer instead of creating invisible popup width.

### 5. Core interactions — healthy

- Play changes to Pause and Pause returns to Play.
- Camera changes Director -> Free -> Director with the visible label synchronized.
- Speed changes 1x -> 2x -> 1x with the visible label synchronized.
- Mobile forward seek changes time by exactly +5 seconds.
- Mobile reverse seek changes time by exactly -5 seconds.
- Roster opens and closes without changing document overflow.
- Final state restored to 0:00, Director, 1x, roster closed.
- Browser warnings and errors: none.

### 6. Browser annotation pass, 884 x 782 — healthy

- Camera mode, player, and boost segments are all 132 x 54 px; the full `El Games Lolo` label fits and every segment is centered.
- Free camera replaces the player HUD with a bottom-left `WASD`, mouse-look, and `Q / E` control guide.
- Boost rendering visibly changes between a neutral off state and a cyan on state.
- Both score cells and the clock have zero-pixel horizontal and vertical center deltas; the three decorative clock bars were removed.
- Header edge insets are 9 px left and 12.8 px right, leaving the focus outlines clear of the container edge.
- The selected-player copy-to-boost gap is 0 px, with a dedicated 28 px safety column before the slanted edge.
- Event markers show one centered event-type label on hover/focus; player detail and timestamp remain in the accessible button label without increasing timeline scroll width.
- All seven desktop transport controls are 56 x 56 px on the same baseline; the `-5` and `+5` controls use the same button geometry.
- Playback speed is 72 px wide, and the enlarged timeline timestamp is centered in a dedicated 96 px column.
- The scoreboard is flush with the top edge on wide screens and moves below the header only when collision avoidance requires it.
- Responsive follow-up at 820 x 800 and 390 x 844 found zero overlay collisions, zero page overflow, and zero internal timeline overflow.

## Resolved findings

- [P1] Mobile transport and timeline children exceeded their containers because hidden tooltip bubbles contributed scroll width. Removed overflow-only replay tooltips while retaining direct accessible labels.
- [P1] Player cards and roster content carried hidden horizontal overflow. Removed nested tooltip DOM, constrained metadata, and made the drawer/player list vertical-scroll only.
- [P2] The condensed font made the replay UI look cramped and inconsistent. Replaced it with a rounded system-first font stack and adjusted the type scale.
- [P2] The selected-player accent began on a clipped diagonal. The left edge is now vertical and square-ended on desktop and mobile.
- [P2] The replay rail was top-heavy with uneven unused space. Timeline and transport rows are now centered with explicit row heights.
- [P2] The range input and event markers exceeded undersized rows. Their real interaction heights now fit the grid without clipping.
- [P2] Header content exceeded its own client width. The header now fits exactly at all audited breakpoints.
- [P2] Camera controls used unequal widths and cropped the selected player. All three segments now share one fixed geometry and centered content.
- [P2] Score and clock content looked visually offset. Each value now occupies a full-size centering wrapper, and the clock bars are gone.
- [P2] The player HUD left a large dead zone before a boost ring that crowded the slanted edge. The copy and ring now meet directly, with a separate edge safety column.
- [P2] Timeline event popups were too busy. Marker tooltips now show only a centered event type, while the full player/time description remains available to assistive technology.
- [P2] Transport controls mixed four sizes and the speed control was oversized. The desktop transport now uses one 56 px system and a compact 72 px speed selector.

## Accessibility evidence and limits

- Camera, player, boost, speed, roster, timeline, event, and transport controls retain direct accessible names.
- Native camera and speed selects remain operable beneath the custom display values.
- The closed roster remains `aria-hidden` and `inert`.
- Focus-visible and reduced-motion rules remain present.
- Screenshot and DOM checks do not establish full WCAG conformance; screen-reader and formal contrast certification remain separate work.

## Automated verification

- `npm test`: 30 files passed, 207 tests passed.
- `npm run build`: passed.
- `git diff --check`: passed.

final result: passed
