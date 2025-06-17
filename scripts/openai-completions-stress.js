import { sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import * as oai from './helpers/openaiGeneric.js';
import { chatCompletion } from './payloads/completions.js';
import config from './config.js';
import {Faker} from 'k6/x/faker';

/**
 * Stress Test for OpenAI Completions
 * 
 * Purpose: Identify the maximum operational capacity of the OpenAI API
 * by gradually increasing load until performance degradation or failures occur.
 * 
 * Pattern: Increasing VUs, long prompts, concurrent requests
 */

// Custom metrics
const responseTime = new Trend('response_time');
const errorCounter = new Counter('api_errors');
const successCounter = new Counter('api_success');

const faker = new Faker(11)

function newPrompt(){
  return { role: 'user', content: [...new Array(100)].reduce((last, _) => last + faker.word.sentence(50), "Respond to the following input with similar words for as long as you can: ") }
}

export const options = {
  // Gradually increase load to find breaking points
  stages: [
    { duration: '1m', target: 1 },   // Ramp up to 5 users
    { duration: '1m', target: 5 },   // Ramp up to 5 users
    { duration: '3m', target: 25 },   // Ramp up to 5 users
    { duration: '3m', target: 50 },   // Ramp up to 5 users
    { duration: '4m', target: 100 },  // Stay at 20 users
    { duration: '1m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_failed: ['rate<0.1'],    // Less than 10% of requests should fail
    'response_time': ['p(95)<15000'], // 95% of requests should be below 15s
    'api_errors': ['count<50'],       // Fewer than 50 total errors
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
  // Randomly select a prompt
  const prompt = newPrompt()
  
  // Add a timestamp to help identify concurrent requests
  const timestamp = new Date().toISOString();
  const requestId = `RID-${__VU}-${timestamp}`;
  
  console.log(`[${requestId}] User ${__VU}: Starting request with prompt: "${prompt.content.substring(0, 30)}..."`);
  
  const startTime = new Date();
  
  // Create payload with longer response
  const payload = chatCompletion({
    messages: [prompt],
    max_tokens: __ENV.MAX_TOKENS || 150, // Larger responses for stress testing
    temperature: 0.7,
  });
  
  try {
    // Send request to OpenAI
    const response = client.chatComplete(payload);
    const content = oai.getContent(response);
    
    // Calculate response time
    const elapsed = new Date() - startTime;
    responseTime.add(elapsed);
    
    // Record success
    successCounter.add(1);
    
    console.log(`[${requestId}] Response received in ${elapsed}ms: "${content.substring(0, 30)}..."`);
    
    // Add some variability to the test
    sleep(Math.random()); // Sleep between 0 and 1 seconds.
  } catch (error) {
    errorCounter.add(1);
    console.error(`[${requestId}] Error: ${error.message}`);
    
    // Backoff on errors
    sleep(5);
  }
}
