# The Feeling Field — PRD

## Original Problem Statement
An interactive emotions chart where you can explore the meanings and experiences of different emotions, arranged on an x/y axis continuum. -x unpleasant, +x pleasant, -y low energy, +y high energy. Reduced to -8..+7 (256 total). Bubble-like circles with subtle moving aura. Hover enlarges 50% and pushes neighbors aside like bubbles.

## User Choices
- Emotion data source: Hybrid (curated + AI-generated on click via Claude Sonnet 4.6)
- Detail view: Emotion name + brief description only
- Theme: Both Soft Ethereal Light AND Dark Dreamy Cosmic (toggle)
- Purely exploratory (no journaling / no auth)
- Grid: 16x16 = 256 emotions, integer coords -8 to +7 on both axes

## User Personas
- Curious explorer / journaler wanting a fresh way to name feelings
- Therapist / educator introducing affect models

## Architecture
- **Backend** (FastAPI): `/api/emotions` list, `/api/emotions/generate` (LLM + MongoDB cache)
- **Frontend** (React 19): d3-force physics grid, framer-motion detail panel, theme toggle
- **LLM**: emergentintegrations → Anthropic Claude Sonnet 4.6 via Emergent LLM key
- **DB**: MongoDB `generated_emotions` collection caches on-demand emotions

## Implemented (v1, Feb 2026)
- 256 bubble grid with d3-force collision physics
- Hover scale 1.5x pushes neighbors via dynamic collision radius
- Bubble breathe + aura pulse CSS animations (organic drift)
- Quadrant color mapping (Q1 gold, Q2 magenta, Q3 indigo, Q4 mint) with smooth hue interpolation
- Ethereal (light pearlescent) and Cosmic (dark starfield) themes with smooth transition
- ~80 curated emotions covering all quadrants and axes
- On-demand LLM generation for uncurated coordinates with MongoDB caching
- Glassmorphic detail panel with source badge (curated vs generated)
- Axis lines + quadrant labels (High Energy / Low Energy / Pleasant / Unpleasant)
- Accessibility: prefers-reduced-motion disables animations

## Backlog (P1/P2)
- P1: Expand curated set to all 256 coordinates
- P1: Search box to jump to an emotion by name
- P2: Share-a-feeling link (encode current selection in URL)
- P2: Journaling / "I felt this today" logbook
- P2: Emotion connections / suggested nearby emotions
- P2: Ambient soundscape tied to quadrant
