# RotaLab Design System v2.0

**Source of truth:** `tokens.json` (Style Dictionary compatible)
**Import to Figma:** Plugins → Tokens Studio → Import tokens.json
**Import to Penpot:** Libraries → Import Tokens

## Usage for developers
```ts
import tokens from '@/design-system/tokens.json';
// tokens.color.accent.value === "#2563eb"
```

## Components (Storybook)
- `MetricCard` — RMS/Peak/Crest/Kurtosis
- `IsoGauge` — ISO 10816-3 traffic-light
- `ChannelRow` — ax/ay/az with RMS badge
- `DiagnosisCard` — Fluke-style 4-level
- All stories run in Chromatic for visual regression.

## Principles (from UI/UX Expert)
1. Density over whitespace — industrial users want 30% more data per screen
2. Desaturated palette — no neon, only Blue 600 accent
3. Every pixel has data — no fake "Live Mode"
4. Keyboard first — ⌘K palette, Space play, +/- zoom
