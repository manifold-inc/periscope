import * as oai from './helpers/openaiGeneric.js';
import { chatCompletion } from './payloads/completions.js';
import config from './config.js';

/**
 * Smoke Test for OpenAI Completions
 * 
 * Purpose: Verify that the OpenAI completions endpoint is functioning correctly
 * under minimal load conditions. This is a basic sanity check to ensure the API
 * is responsive before running more intensive tests.
 * 
 * Pattern: 1 VU, few iterations, simple prompts
 */

// Very simple prompts for basic verification
const testPrompts = [
  { role: 'user', content: 'Hello, who are you?' },
  { role: 'user', content: 'What is 2+2?' },
  { role: 'user', content: 'Name three colors.' },
];

export const options = {
  // Smoke test uses minimal load - just enough to verify functionality
  vus: 1,
  iterations: 3,
  thresholds: {
    // Basic checks to ensure the service is responsive
    http_req_failed: ['rate<0.01'], // Less than 1% of requests should fail
    http_req_duration: ['p(95)<5000'], // 95% of requests should respond within 5s
  },
};

// Create OpenAI client
const client = oai.createClient({
  url: config.openai.url,
  options: {
    model: config.openai.models.completion,
  },
  headers: {
    'Authorization': `Bearer ${config.openai.key}`,
  },
});

export default function run() {
  // Use the current iteration to select a prompt
  const promptIndex = __ITER % testPrompts.length;
  const prompt = testPrompts[promptIndex];
  
  console.log(`Iteration ${__ITER}: Testing with prompt "${prompt.content}"`);
  
  // Create payload
  const payload = chatCompletion({
    messages: [prompt],
    max_tokens: 20, // Keep responses short for smoke test
    temperature: 0.3, // Low temperature for consistent responses
  });
  
  // Send request to OpenAI
  const response = client.chatComplete(payload);
  
  try {
    const content = oai.getContent(response);
    console.log(`Response received: "${content.substring(0, 30)}..."`);
    
    // Check for empty responses (a sign of potential issues)
    if (!content || content.trim().length === 0) {
      console.error("Warning: Empty response received");
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}