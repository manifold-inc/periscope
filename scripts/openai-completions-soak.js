import { sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import * as oai from './helpers/openaiGeneric.js';
import { chatCompletion } from './payloads/completions.js';
import { any } from './helpers/utils.js';
import config from './config.js';

/**
 * Soak Test for OpenAI Completions
 * 
 * Purpose: Assess the API's reliability and performance over an extended period 
 * under consistent load. Identifies issues that might only appear after prolonged use,
 * such as memory leaks, degradation in response times, or other stability issues.
 * 
 * Pattern: Moderate load maintained for a long duration (hours)
 */

// Custom metrics
const responseTime = new Trend('response_time');
const errorRate = new Rate('error_rate');
const tokenRate = new Rate('token_rate');
const hourlyCounter = new Counter('hourly_requests');

// Mix of prompts to simulate realistic usage
const testPrompts = [
  { role: 'user', content: 'What are the benefits of regular exercise?' },
  { role: 'user', content: 'How does photosynthesis work?' },
  { role: 'user', content: 'Write a short story about a robot discovering emotions.' },
  { role: 'user', content: 'What are some effective strategies for time management?' },
  { role: 'user', content: 'Explain the concept of supply and demand in economics.' },
  { role: 'user', content: 'What are the key differences between renewable and non-renewable energy sources?' },
  { role: 'user', content: 'How do vaccines work to prevent disease?' },
  { role: 'user', content: 'Describe the water cycle and its importance to Earth\'s ecosystems.' },
];

export const options = {
  // Maintain moderate load for an extended period
  // Note: For actual soak tests, this would typically run for hours
  // Here we use a shorter duration for demonstration purposes
  stages: [
    { duration: '5m', target: 5 },    // Ramp up to 5 VUs
    { duration: '30m', target: 5 },   // Stay at 5 VUs for 30 minutes
    { duration: '5m', target: 0 },    // Ramp down to 0 VUs
  ],
  thresholds: {
    'response_time': ['p(90)<10000'],  // 90% of requests under 10s
    'error_rate': ['rate<0.05'],       // Less than 5% error rate
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

export function setup() {
  console.log(`Starting soak test at ${new Date().toISOString()}`);
  return { startTime: new Date() };
}

export default function run(data) {
  // Calculate how long the test has been running
  const testRuntime = (new Date() - data.startTime) / 1000 / 60; // in minutes
  const hourMark = Math.floor(testRuntime / 60);
  
  // Select a prompt
  const prompt = any(testPrompts);
  
  // Track the start time for this request
  const startTime = new Date();
  
  // Create payload with typical settings
  const payload = chatCompletion({
    messages: [prompt],
    max_tokens: 100,
    temperature: 0.7,
  });
  
  try {
    // Send request to OpenAI
    const response = client.chatComplete(payload);
    const content = oai.getContent(response);
    
    // Calculate response metrics
    const elapsed = new Date() - startTime;
    responseTime.add(elapsed);
    errorRate.add(0);
    hourlyCounter.add(1, { hour: hourMark });
    
    // If the response contains usage information
    if (response.json().usage) {
      const usage = response.json().usage;
      tokenRate.add(usage.completion_tokens / (elapsed / 1000)); // tokens per second
    }
    
    console.log(`[${Math.floor(testRuntime)}m] Response received in ${elapsed}ms: "${content.substring(0, 30)}..."`);
    
    // Pause between requests to simulate realistic usage patterns
    // and prevent rate limiting during long-running tests
    sleep(Math.random() * 5 + 2); // 2-7 second pause
    
  } catch (error) {
    errorRate.add(1);
    console.error(`[${Math.floor(testRuntime)}m] Error: ${error.message}`);
    
    // Add longer backoff when errors occur
    sleep(10); 
  }
  
  // Every hour (in test time), log a summary
  if (testRuntime > 0 && testRuntime % 60 < 1) {
    console.log(`=== HOUR ${hourMark} SUMMARY ===`);
    console.log(`Total requests this hour: ${hourlyCounter.values[hourMark] || 0}`);
    console.log(`Current error rate: ${errorRate.value}`);
    console.log(`Average response time: ${responseTime.avg}ms`);
  }
}

export function teardown(data) {
  const testDuration = (new Date() - data.startTime) / 1000 / 60;
  console.log(`Soak test completed after ${testDuration.toFixed(2)} minutes.`);
}