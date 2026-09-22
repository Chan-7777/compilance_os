---
name: jev
description: >-
  Use this skill whenever the user asks to "use Jev to sort these", or wants to classify,
  score, rank, or make fast structured decisions on text or data using TypeSafe Jev (System One decision model).
---

# TypeSafe Jev (System One Decision Model)

Jev is TypeSafe's System One decision model. It does not generate creative prose; it evaluates structured state and answers typed questions (`choice`, `score`, `noul`) with calibrated probabilities and confidence scores.

## Operational Rule for Claude Code

> **Jev decides, you write.**
> When Jev is uncertain (low confidence < 60% or split probabilities), make the call yourself.
> Anything sent to Jev leaves the local computer via the API — always ask the user before sending confidential or private data.

## Question Primitives (The 3 Answer Shapes)

1. **`choice`**: Pick one option from a dictionary of criteria. Returns `choice`, `confidence`, and `probabilities`.
2. **`score`**: Rate on an ordered scale of descriptive levels (0 to N-1). Returns `score`, `confidence`, and `probabilities`.
3. **`noul`**: Evaluate boolean truth probability (0.0 to 1.0). Returns `noul`.

## Invoking Jev

Run the runner script from terminal:
```bash
node .claude/skills/jev/scripts/jev.mjs <payload.json>
```

Or import in Node.js / TypeScript:
```javascript
import { askJev } from './.claude/skills/jev/scripts/jev.mjs';

const res = await askJev({
  state: "text to analyze...",
  questions: { ... }
});
```

*API keys are read automatically from `~/.typesafe_key` or `~/.openrouter_key` in the user profile.*
