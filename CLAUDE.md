# ComplianceOS — Project & Assistant Guidelines

## Jev Collaboration Rules
- **Jev decides, you write**: Use Jev (`jev-latest` via TypeSafe or `typesafe/jev-1.13` via OpenRouter) for fast, structured decision-making, categorical sorting, scoring, and probability evaluation. You do all synthesis, writing, and code generation.
- **Handling uncertainty**: When Jev isn't sure about something (low confidence or split probabilities), make the call yourself.
- **Privacy check**: Anything sent to Jev leaves the computer. Always ask the user for permission before sending anything private or sensitive.
- **Key Safety**: The API keys are stored safely at `~/.typesafe_key` and `~/.openrouter_key` (`C:\Users\chand\.typesafe_key`, `C:\Users\chand\.openrouter_key`). Never commit, share, or display them back.

## Model Router (PERMANENTLY ON)
A model router is active at `.agents/model_router/router.mjs`:
- Status: **ON**
- `node .agents/model_router/router.mjs status` — Displays router status and cumulative Jev costs
- **Rule**: Jev sizes tasks into `tiny`, `everyday`, `large`, `hardest`. Short conversational replies and low-confidence decisions (<60%) fall back directly to the primary agent.
