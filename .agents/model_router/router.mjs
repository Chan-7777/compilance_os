import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { askJev } from '../skills/jev/scripts/jev.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.join(__dirname, 'router_state.json');

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch {}
  return {
    enabled: false,
    confidence_threshold: 0.60,
    counts: { tiny: 0, everyday: 0, large: 0, hardest: 0, handled_by_primary: 0 },
    total_jev_cost_usd: 0,
    total_calls: 0,
    models: {
      tiny: "google/gemini-2.0-flash-lite",
      everyday: "google/gemini-2.0-flash",
      large: "anthropic/claude-3.5-sonnet",
      hardest: "openai/gpt-4o"
    }
  };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

export function isShortReply(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  
  // Under 8 words with conversational affirmative/directive phrases
  if (words.length <= 8) {
    const lower = trimmed.toLowerCase();
    const commonPatterns = [
      /^(yes|no|ok|okay|sure|yep|nope|thanks|thank you)/,
      /^(do that|make it|shorter|longer|continue|proceed|go ahead|fix it|commit)/,
      /^(looks good|looks fine|approved|lgtm|perfect|awesome|great)/
    ];
    if (commonPatterns.some(p => p.test(lower))) {
      return true;
    }
  }
  return false;
}

export async function routeMessage(message, options = {}) {
  const state = loadState();
  const forceCheck = options.forceCheck || false; // allows testing even when router is OFF

  if (!state.enabled && !forceCheck) {
    return {
      routed: false,
      reason: 'Router is OFF',
      handler: 'primary_agent',
      model: 'primary'
    };
  }

  // Check for short context-dependent conversational replies
  if (isShortReply(message)) {
    state.counts.handled_by_primary = (state.counts.handled_by_primary || 0) + 1;
    saveState(state);
    return {
      routed: false,
      reason: 'Short contextual reply (handled directly by conversation agent)',
      handler: 'primary_agent',
      model: 'primary'
    };
  }

  // Ask Jev to size up the message with a fail-safe timeout
  const jevPromise = askJev({
    state: message,
    questions: {
      model_size: {
        type: 'choice',
        instructions: "What is the smallest model size that can do this job well?",
        criteria: {
          tiny: "A quick lookup, a rename, a one-line answer, a factual check, or simple syntax fix.",
          everyday: "A normal email, post, short document, standard code refactor, or simple function.",
          large: "A multi-step build, research, a full report, architecture design, or complex multi-file coding.",
          hardest: "High-stakes strategy, complex debugging, critical security audit, or anything where a wrong call is expensive."
        }
      }
    }
  });

  // Timeout guard (2500ms): never block or slow down user if Jev is delayed
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Jev timeout (>2500ms)')), 2500)
  );

  let result;
  try {
    result = await Promise.race([jevPromise, timeoutPromise]);
  } catch (err) {
    // Fail-open: proceed as if router wasn't there
    state.counts.handled_by_primary = (state.counts.handled_by_primary || 0) + 1;
    saveState(state);
    return {
      routed: false,
      reason: `Fail-open fallback: ${err.message}`,
      handler: 'primary_agent',
      model: 'primary'
    };
  }

  const answer = result.answers?.model_size;
  const choice = answer?.choice || 'everyday';
  const confidence = typeof answer?.confidence === 'number' ? answer.confidence : 0.5;
  const probabilities = answer?.probabilities || {};

  // Track cost and counts
  const cost = result.estimatedCostUsd || 0;
  state.total_jev_cost_usd = Number((state.total_jev_cost_usd + cost).toFixed(7));
  state.total_calls = (state.total_calls || 0) + 1;

  if (confidence < state.confidence_threshold) {
    state.counts.handled_by_primary = (state.counts.handled_by_primary || 0) + 1;
    saveState(state);
    return {
      routed: false,
      reason: `Low confidence (${Math.round(confidence * 100)}% < ${Math.round(state.confidence_threshold * 100)}%)`,
      handler: 'primary_agent',
      model: 'primary',
      choice,
      confidence,
      probabilities,
      latencyMs: result.latencyMs,
      cost
    };
  }

  // Jev is confident (>= 60%)
  state.counts[choice] = (state.counts[choice] || 0) + 1;
  saveState(state);

  const targetModel = state.models[choice] || state.models.everyday;
  return {
    routed: true,
    size: choice,
    confidence,
    probabilities,
    model: targetModel,
    handler: `helper_${choice}`,
    footer: `\n\n*[Processed by: ${targetModel}]*`,
    latencyMs: result.latencyMs,
    cost
  };
}

// CLI commands
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const cmd = process.argv[2]?.toLowerCase();
  const state = loadState();

  if (cmd === 'on') {
    state.enabled = true;
    saveState(state);
    console.log('Model Router is now ON.');
    console.log('Notice: While ON, incoming routed tasks are evaluated by Jev via API.');
  } else if (cmd === 'off') {
    state.enabled = false;
    saveState(state);
    console.log('Model Router is now OFF.');
  } else if (cmd === 'status') {
    console.log('=== Model Router Status ===');
    console.log(`State:                 ${state.enabled ? 'ON' : 'OFF'}`);
    console.log(`Confidence Threshold:  ${Math.round(state.confidence_threshold * 100)}%`);
    console.log(`Total Routed Calls:    ${state.total_calls}`);
    console.log(`Total Jev Cost:        $${state.total_jev_cost_usd.toFixed(6)} USD`);
    console.log('--- Breakdown by Size ---');
    console.log(`  Tiny:                ${state.counts.tiny} (${state.models.tiny})`);
    console.log(`  Everyday:            ${state.counts.everyday} (${state.models.everyday})`);
    console.log(`  Large:               ${state.counts.large} (${state.models.large})`);
    console.log(`  Hardest:             ${state.counts.hardest} (${state.models.hardest})`);
    console.log(`  Handled by Primary:  ${state.counts.handled_by_primary} (fallback / low confidence / short reply)`);
  } else {
    console.log('Usage: node router.mjs [on | off | status]');
  }
}
