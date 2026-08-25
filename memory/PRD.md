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
- 196 bubble grid (4 quadrants, 7x7 each, skipping x=0 and y=0) with d3-force collision physics
- Click-to-expand marble physics (synchronized d3-force + CSS scaling via useLayoutEffect)
- Bubble breathe + aura pulse CSS animations (organic drift)
- Ethereal (light pearlescent) and Cosmic (dark starfield) themes with smooth transition
- Custom pan/zoom canvas wrapping the grid
- Persistent HUD (EmotionDetailPanel) showing selected emotion
- `/admin` editor with passphrase auth gate (`fH4KGbiw!`) for inline editing of titles, descriptions, and per-cell custom colors
- Backend: `GET /api/emotions`, `PUT /api/emotions/{x}/{y}` (admin), `POST /api/admin/verify`

## Color Scheme (Feb 2026, iterated with user)
- Q1 (pleasant / high energy): vibrant yellow field — soft muted yellow near origin, bright saturated yellow far right, deep golden yellow top corner (no red undertones)
- Q2 (unpleasant / high energy): red-orange near y-axis → pure red top; pink-magenta at (-7,+1) grading up to a deep ruby jewel at (-7,+7)
- Q3 (unpleasant / low energy): medium cyan-blue near origin row grading to deep sapphire jewel tones on the -7 row, floor capped at hsl(246, 75%, 34%) (no amethyst purple)
- Q4 (pleasant / low energy): deep teal → pure green on -1 row, deep teal → emerald jewel tones on -7 row

## Backlog (P1/P2)
- P1: Expand curated set to all 256 coordinates
- P1: Search box to jump to an emotion by name
- P2: Share-a-feeling link (encode current selection in URL)
- P2: Journaling / "I felt this today" logbook
- P2: Emotion connections / suggested nearby emotions
- P2: Ambient soundscape tied to quadrant
