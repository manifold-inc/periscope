import { randomSeed } from 'k6';

import * as oai from './helpers/openaiGeneric.js';
import { any } from './helpers/utils.js';
import { fimCompletion } from './payloads/completions.js';
import config from './config.js';

// Code prefixes to start completions with
const prefixes = [
  '// This function',
  '# Define a class that',
  '/* A utility to',
  'def calculate_',
  'class UserProfile',
  'function fetchData',
  '-- SQL query to',
  'import tensorflow as',
]

// Create OpenAI client
const client = oai.createClient({
  url: config.openai.url,
  options: {
    model: __ENV.OPENAI_CODING_MODEL || config.openai.models.completion,
  },
  headers: {
    'Authorization': `Bearer ${config.openai.key}`,
  },
});

// Runtime state
const runtimeConfig = {
  prefix: any(prefixes),
}

export const options = {
  stages: [
    // Solo user latency (default)
    { duration: '30s', target: 1 },
    { duration: '1m', target: 1 },
    { duration: '30s', target: 0 },

    // Uncomment for stress-testing
    // { duration: '30s', target: 5 },
    // { duration: '2m', target: 5 },
    // { duration: '30s', target: 0 },
  ],
};

let counter = 0;

// This script tests code completion performance
// by simulating an autocomplete feature that builds on previous completions.
//
// We take a starting prefix and then iteratively:
// 1. Send the current prefix to the API
// 2. Get the completion
// 3. Append the completion to the prefix
// 4. Repeat
export default function run() {
  randomSeed(counter++);

  // Create payload with current prefix
  const payload = fimCompletion({
    prefix: runtimeConfig.prefix,
    max_tokens: __ENV.MAX_TOKENS || 16,
  });
  
  // Get completion from OpenAI
  const response = client.complete(payload);
  const content = oai.getContent(response);

  // Append completion to prefix
  runtimeConfig.prefix += content;

  // If we get an empty completion, reset to a new prefix
  if (content === '') {
    runtimeConfig.prefix = any(prefixes);
  }

  // Limit prefix length to prevent extremely long contexts
  if (runtimeConfig.prefix.length > 2000) {
    runtimeConfig.prefix = runtimeConfig.prefix.substring(0, 500);
  }

  // Log current prefix (uncomment for debugging)
  // console.log(`Prefix (${runtimeConfig.prefix.length} chars): ${runtimeConfig.prefix.substring(0, 50)}...`);
}