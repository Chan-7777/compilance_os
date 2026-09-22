import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * TypeSafe Jev Decision Helper
 * Supports TypeSafe Direct API (Free credits) and OpenRouter Decisions API.
 * Keys are loaded securely from ~/.typesafe_key or ~/.openrouter_key.
 */

function getCredentials() {
  const home = os.homedir();
  const typesafeKeyPath = path.join(home, '.typesafe_key');
  const openrouterKeyPath = path.join(home, '.openrouter_key');

  if (process.env.TYPESAFE_API_KEY) {
    return { provider: 'typesafe', key: process.env.TYPESAFE_API_KEY.trim() };
  }
  if (fs.existsSync(typesafeKeyPath)) {
    return { provider: 'typesafe', key: fs.readFileSync(typesafeKeyPath, 'utf8').trim() };
  }
  if (process.env.OPENROUTER_API_KEY) {
    return { provider: 'openrouter', key: process.env.OPENROUTER_API_KEY.trim() };
  }
  if (fs.existsSync(openrouterKeyPath)) {
    return { provider: 'openrouter', key: fs.readFileSync(openrouterKeyPath, 'utf8').trim() };
  }
  throw new Error('No API key found. Store your key in ~/.typesafe_key or ~/.openrouter_key.');
}

export async function askJev({ state, questions, model }) {
  const { provider, key } = getCredentials();
  const startTime = performance.now();

  let endpoint;
  let defaultModel;

  if (provider === 'typesafe') {
    endpoint = 'https://api.typesafe.ai/v1/systemone';
    defaultModel = 'jev-latest';
  } else {
    endpoint = 'https://openrouter.ai/api/alpha/decisions';
    defaultModel = 'typesafe/jev-1.13';
  }

  const payload = {
    model: model || defaultModel,
    state,
    questions
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const latencyMs = Math.round(performance.now() - startTime);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Jev API failed (${provider} ${response.status} ${response.statusText}): ${errorText}`);
  }

  const result = await response.json();
  const inputTokens = result.usage?.input_tokens || 0;
  // TypeSafe pricing: $0.042 per 1M input tokens, output free
  const estimatedCostUsd = (inputTokens / 1_000_000) * 0.042;

  return {
    ...result,
    provider,
    latencyMs,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(7))
  };
}

// CLI execution support: node jev.mjs <payload.json>
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.error('Usage: node jev.mjs <request_payload.json>');
    process.exit(1);
  }
  try {
    const payload = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    const res = await askJev(payload);
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Error executing Jev:', err.message);
    process.exit(1);
  }
}
