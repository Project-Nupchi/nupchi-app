# Project Nupchi Agent Notes

## Design Tokens

- Figma source: `https://www.figma.com/design/mby1o9uMiY4tYstDx81vp5?node-id=46-450`.
- Implement UI from `src/constants/aqua-theme.ts` first. Import `FigmaTokens`, `Palette`, `Gradient`, `Radius`, `Space`, `Shadow`, and `Type` instead of hardcoding colors, spacing, shadows, radii, or typography.
- Keep `FigmaTokens` as the raw Figma token layer. Add or update semantic aliases in the same file only when a screen needs a readable app-level name.
- Match Figma status tokens for health states: success = normal/good, warning = caution/suspect, danger = alert/suspicious.
- Card and navigation shadows should use `Shadow.card` and `Shadow.navigation`; do not invent per-screen shadow values.
- New screens should follow the home/tank-status visual system: blue-to-white screen gradient, white translucent cards, Pretendard text scale from `Type`, 20px card radius, and token-based status badges.
