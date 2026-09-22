---
name: jev
description: >-
  Use this skill whenever the user says "use Jev to sort these", or wants to classify,
  score, rank, or make fast structured decisions on text or data using TypeSafe Jev (typesafe/jev-1.13) via OpenRouter or TypeSafe Direct.
---

# TypeSafe Jev (System One Decision Model)

Jev is TypeSafe's System One decision model. It does not generate creative text; instead, it consumes unstructured or semi-structured state and answers typed questions with calibrated probabilities and confidence scores.

## Operational Rule

> **Jev decides, you write.**
> When Jev is uncertain (low confidence or split probabilities), you make the call yourself.
> Anything sent to Jev leaves the local computer via the API — always ask the user before sending confidential or private data.

## API Providers & Storage

1. **TypeSafe Direct (Default)**:
   - Endpoint: `POST https://api.typesafe.ai/v1/systemone`
   - Model: `jev-latest`
   - Key storage: `~/.typesafe_key` (`C:\Users\chand\.typesafe_key`)
2. **OpenRouter**:
   - Endpoint: `POST https://openrouter.ai/api/alpha/decisions`
   - Model: `typesafe/jev-1.13`
   - Key storage: `~/.openrouter_key` (`C:\Users\chand\.openrouter_key`)

*Keys are stored outside the repository and must never be committed, shared, or echoed.*

## Question Primitives (The 3 Answer Shapes)

Jev only answers in 3 structured shapes:

### 1. `choice` (Pick one option from a list)
Selects the best fitting option from an object map of criteria.
```json
{
  "type": "choice",
  "instructions": "Which category best describes this text?",
  "criteria": {
    "category_a": "Description of condition A",
    "category_b": "Description of condition B"
  }
}
```
**Returns**: `choice` (string key), `confidence` (0.0 to 1.0), and `probabilities` map for each option.

### 2. `score` (Rate on an ordered scale)
Evaluates content against ordered, descriptive levels (0 to N-1).
```json
{
  "type": "score",
  "instructions": "How urgent is this request?",
  "criteria": [
    "Low urgency: can wait for weeks",
    "Medium urgency: needs action this week",
    "High urgency: critical blocking issue"
  ]
}
```
**Returns**: `score` (floating point value along scale), `confidence` (0.0 to 1.0), `probabilities` map per index.

### 3. `noul` (Likelihood that a statement is true)
Evaluates a boolean/truth probability.
```json
{
  "type": "noul",
  "instructions": "Does this text contain confidential credentials?",
  "criteria": {
    "true": "The text contains API keys, passwords, or secrets.",
    "false": "The text contains only public or non-sensitive information."
  }
}
```
**Returns**: `noul` (probability from 0.0 to 1.0).

## Executing Jev Requests

Use the workspace helper script:
```bash
node .agents/skills/jev/scripts/jev.mjs <payload.json>
```

Or call via fetch in Node/JS/TS:
```javascript
import { askJev } from './scripts/jev.mjs';

const res = await askJev({
  state: "text to analyze...",
  questions: { ... }
});
```
