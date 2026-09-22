# Workspace Instructions & Rules

## Jev Collaboration Rules
- **Jev decides, you write**: Use Jev (`jev-latest` via TypeSafe or `typesafe/jev-1.13` via OpenRouter) for fast, structured decision-making, categorical sorting, scoring, and probability evaluation. You do all synthesis, writing, and code generation.
- **Handling uncertainty**: When Jev isn't sure about something (low confidence or split probabilities), make the call yourself.
- **Privacy check**: Anything sent to Jev leaves the computer. Always ask the user for permission before sending anything private or sensitive.
- **Model Router**: **PERMANENTLY ON**. Incoming tasks are automatically sized by Jev (`tiny`, `everyday`, `large`, `hardest`). Low-confidence and short replies stay with the primary agent.
- **Key Safety**: The API keys are stored safely at `~/.typesafe_key` and `~/.openrouter_key` (`C:\Users\chand\.typesafe_key`, `C:\Users\chand\.openrouter_key`). Never commit, share, or display them back.
