import * as oai from './helpers/openaiGeneric.js';
import { singleTextEmbedding } from './payloads/embeddings.js';
import config from './config.js';

/**
 * Smoke Test for OpenAI Embeddings
 * 
 * Purpose: Verify that the OpenAI embeddings endpoint is functioning correctly
 * under minimal load conditions. This is a basic sanity check to ensure the API
 * is responsive before running more intensive tests.
 * 
 * Pattern: 1 VU, few iterations, simple inputs
 */

// Simple test texts for verification
const testTexts = [
  "Hello world.",
  "This is a basic test.",
  "Embeddings are vector representations of text.",
];

export const options = {
  // Minimal load for verification
  vus: 1,
  iterations: 3,
  thresholds: {
    // Basic checks for service responsiveness
    http_req_failed: ['rate<0.01'], // Less than 1% of requests should fail
    http_req_duration: ['p(95)<3000'], // 95% of requests should respond within 3s
  },
};

// Create OpenAI client
const client = oai.createClient({
  url: config.openai.url,
  options: {
    model: config.openai.models.embedding,
  },
  headers: {
    'Authorization': `Bearer ${config.openai.key}`,
  },
});

export default function run() {
  // Use the current iteration to select a text
  const textIndex = __ITER % testTexts.length;
  const text = testTexts[textIndex];
  
  console.log(`Iteration ${__ITER}: Testing with text "${text}"`);
  
  // Create payload
  const payload = singleTextEmbedding({
    input: text,
  });
  
  // Send request to OpenAI
  const response = client.embeddings(payload);
  
  try {
    const embedding = oai.getContent(response);
    
    // Verify we got a proper embedding vector
    console.log(`Response received: ${embedding.length}-dimensional vector`);
    
    // Do a basic validation that we have a proper vector
    if (!Array.isArray(embedding) || embedding.length < 10) {
      console.error(`Warning: Unexpected embedding format or dimension (${embedding.length})`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}