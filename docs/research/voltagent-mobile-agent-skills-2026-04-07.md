# VoltAgent Agent Skills Mobile Notes

Date: 2026-04-07

Source:
- https://github.com/VoltAgent/awesome-agent-skills
- https://skills.sh/vercel-labs/agent-skills/react-native-skills

Relevant skills found:
- Expo app development guidance from the Expo ecosystem.
- CallStack React Native best-practices guidance.
- Vercel Labs React Native skills covering list performance, UI patterns, images, animations, state, rendering, monorepo, and configuration rules.

AURA integration decision:
- Do not copy or install these skills into generated projects by default.
- Use the curated skills as product-quality guidance for AURA's mobile prompt contracts.
- Keep AURA's default mobile baseline as Capacitor + React unless the user explicitly asks for Expo or React Native.

Applied guidance:
- Require a mobile app map before generation: screens, navigation model, app shell, persistent actions, and data/state model.
- Prefer app-like navigation: bottom tabs for primary destinations and stack/detail views for drill-down.
- Treat safe areas, touch targets, scroll containers, keyboard overlap, and sticky bottom actions as first-class constraints.
- Use realistic seed arrays and reusable rows/cards for lists instead of giant static DOM blocks.
- Include empty, loading, error, offline, disabled, and permission states when relevant.
- Provide image/media strategies with local assets, inline SVG, remote URLs, and fallbacks.
- Avoid generating native `android/` or `ios/` folders unless native sync/build is explicitly requested.

