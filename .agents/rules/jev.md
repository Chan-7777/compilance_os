# Jev Collaboration Rules

- **Jev decides, you write**: Jev is a System One decision model optimized for lightning-fast, structured classification, scoring, and boolean decisions. For text drafting, synthesis, coding, or content generation, the assistant handles the writing.
- **Handling uncertainty**: When Jev's answer exhibits low confidence or ambiguous probabilities, do not accept the classification blindly; evaluate the context and make the call yourself.
- **Privacy and Data Exfiltration**: Anything sent to Jev leaves the local computer via the API. Always ask the user for confirmation before sending anything private, sensitive, or containing customer/credential data.
- **Key Safety**: The API keys are stored strictly at `~/.typesafe_key` and `~/.openrouter_key`. Never echo, share, or commit these keys to version control or logs.
