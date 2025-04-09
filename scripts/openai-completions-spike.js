import { sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import * as oai from './helpers/openaiGeneric.js';
import { chatCompletion } from './payloads/completions.js';
import { any } from './helpers/utils.js';
import config from './config.js';

/**
 * Spike Test for OpenAI Completions
 * 
 * Purpose: Evaluate how the OpenAI API handles sudden, extreme surges in traffic
 * and whether it can maintain stability or gracefully degrade under unexpected load spikes.
 * 
 * Pattern: Sudden jump to high VU count, then return to baseline
 */

// Custom metrics
const responseTime = new Trend('response_time');
const failureRate = new Rate('failure_rate');
const recoveryTime = new Trend('recovery_time');

// Simple prompts for consistent comparison
const testPrompts = [
  { role: 'user', content: 'Write a short poem about technology.' },
  { role: 'user', content: 'Give me three tips for productive work.' },
  { role: 'user', content: 'Explain how the internet works in one paragraph.' },
];

export const options = {
  // Create a spike pattern
  stages: [
    { duration: '1m', target: 2 },    // Start with baseline
    { duration: '10s', target: 25 },  // Sudden spike to 25 users
    { duration: '30s', target: 25 },  // Stay at peak for 30s
    { duration: '1m', target: 2 },    // Return to baseline
    { duration: '3m', target: 2 },    // Continue at baseline to measure recovery
  ],
  thresholds: {
    'failure_rate': ['rate<0.3'],      // Expect some failures but <30%
    'response_time': ['p(99)<30000'],  // 99% of requests under 30s
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

// Track if we're in the spike phase
let spikeActive = false;
let recoveryStartTime = null;

export function setup() {
  console.log('Starting spike test...');
  return { startTime: new Date() };
}

export default function run(data) {
  // Check if we've entered or exited the spike phase
  const currentStage = __ITER > 10 && __ITER < 50 ? 'spike' : 'normal';
  
  if (currentStage === 'spike' && !spikeActive) {
    console.log(`Entering spike phase at ${new Date().toISOString()}`);
    spikeActive = true;
  } else if (currentStage === 'normal' && spikeActive) {
    console.log(`Exiting spike phase at ${new Date().toISOString()}`);
    spikeActive = false;
    recoveryStartTime = new Date();
  }
  
  // Select a prompt
  const prompt = any(testPrompts);
  
  // Create payload
  const payload = chatCompletion({
    messages: [prompt],
    max_tokens: 60,
    temperature: 0.5,
  });
  
  // Measure response time
  const startTime = new Date();
  
  try {
    // Send request to OpenAI
    const response = client.chatComplete(payload);
    const content = oai.getContent(response);
    
    // Record success
    failureRate.add(0);
    
    const elapsed = new Date() - startTime;
    responseTime.add(elapsed);
    
    // Calculate recovery time if we're post-spike
    if (!spikeActive && recoveryStartTime) {
      recoveryTime.add(new Date() - recoveryStartTime);
    }
    
    // Log response
    console.log(`[${spikeActive ? 'SPIKE' : 'NORMAL'}] Request completed in ${elapsed}ms: "${content.substring(0, 30)}..."`);
    
    // Add some randomness to request timing
    sleep(spikeActive ? Math.random() : Math.random() * 3);
    
  } catch (error) {
    // Record failure
    failureRate.add(1);
    
    console.error(`[${spikeActive ? 'SPIKE' : 'NORMAL'}] Error: ${error.message}`);
    
    // Backoff strategy during errors
    sleep(spikeActive ? 3 : 1);
  }
}

export function teardown(data) {
  console.log(`Spike test completed. Started at: ${data.startTime}, Ended at: ${new Date()}`);
}