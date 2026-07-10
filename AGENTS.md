# Project Nupchi Agent Notes

## Design Tokens

- Figma source: `https://www.figma.com/design/mby1o9uMiY4tYstDx81vp5?node-id=46-450`.
- Implement UI from `src/constants/aqua-theme.ts` first. Import `FigmaTokens`, `Palette`, `Gradient`, `Radius`, `Space`, `Shadow`, and `Type` instead of hardcoding colors, spacing, shadows, radii, or typography.
- Keep `FigmaTokens` as the raw Figma token layer. Add or update semantic aliases in the same file only when a screen needs a readable app-level name.
- Match Figma status tokens for health states: success = normal/good, warning = caution/suspect, danger = alert/suspicious.
- Card and navigation shadows should use `Shadow.card` and `Shadow.navigation`; do not invent per-screen shadow values.
- New screens should follow the home/tank-status visual system: blue-to-white screen gradient, white translucent cards, Pretendard text scale from `Type`, 20px card radius, and token-based status badges.

## Git 및 Pull Request 작성 규칙

- 모든 커밋 메시지는 한글로 작성한다.
- Pull Request의 제목과 본문을 한글로 작성한다.
- Pull Request의 변경 요약, 검증 결과, 체크리스트, 리뷰어에게 전달할 참고 사항도 한글로 작성한다.
- 파일명, 코드 식별자, 명령어처럼 원문 유지가 필요한 기술 요소는 영문 표기를 사용할 수 있다.
