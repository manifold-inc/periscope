import { sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import * as oai from './helpers/openaiGeneric.js';
import { singleTextEmbedding } from './payloads/embeddings.js';
import { any } from './helpers/utils.js';
import config from './config.js';

/**
 * Spike Test for OpenAI Embeddings
 * 
 * Purpose: Evaluate how the OpenAI embeddings API handles sudden, extreme surges 
 * in traffic and whether it can maintain stability or gracefully degrade.
 * 
 * Pattern: Sudden jump to high VU count, then return to baseline
 */

// Custom metrics
const responseTime = new Trend('response_time');
const failureRate = new Rate('failure_rate');
const recoveryTime = new Trend('recovery_time');

// Consistent set of texts for comparison
const testTexts = [
  "Artificial intelligence and machine learning are transforming industries worldwide.",
  "Neural networks enable computers to recognize patterns and make decisions.",
  "Natural language processing helps computers understand and generate human language.",
  "Computer vision systems can identify objects and interpret visual information.",
  "Reinforcement learning allows systems to learn through trial and error interactions.",
];

export const options = {
  // Create a spike pattern
  stages: [
    { duration: '1m', target: 2 },    // Start with baseline
    { duration: '10s', target: 30 },  // Sudden spike to 30 users
    { duration: '30s', target: 30 },  // Stay at peak for 30s
    { duration: '30s', target: 2 },   // Return to baseline
    { duration: '2m', target: 2 },    // Continue at baseline to measure recovery
  ],
  thresholds: {
    'failure_rate': ['rate<0.3'],      // Expect some failures but <30%
    'response_time': ['p(99)<20000'],  // 99% of requests under 20s
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

// Track if we're in the spike phase
let spikeActive = false;
let recoveryStartTime = null;

export function setup() {
  console.log('Starting embedding spike test...');
  return { startTime: new Date() };
}

export default function run(data) {
  // Check if we've entered or exited the spike phase based on test time
  const testRuntime = (new Date() - data.startTime) / 1000;
  const currentStage = testRuntime > 60 && testRuntime < 100 ? 'spike' : 'normal';
  
  if (currentStage === 'spike' && !spikeActive) {
    console.log(`Entering spike phase at ${new Date().toISOString()}`);
    spikeActive = true;
  } else if (currentStage === 'normal' && spikeActive) {
    console.log(`Exiting spike phase at ${new Date().toISOString()}`);
    spikeActive = false;
    recoveryStartTime = new Date();
  }
  
  // Select a text
  const text = any(testTexts);
  
  // Create payload
  const payload = singleTextEmbedding({
    input: text,
  });
  
  // Measure response time
  const startTime = new Date();
  
  try {
    // Send request to OpenAI
    const response = client.embeddings(payload);
    const embedding = oai.getContent(response);
    
    // Record success
    failureRate.add(0);
    
    const elapsed = new Date() - startTime;
    responseTime.add(elapsed, { phase: currentStage });
    
    // Calculate recovery time if we're post-spike
    if (!spikeActive && recoveryStartTime) {
      recoveryTime.add(new Date() - recoveryStartTime);
    }
    
    // Log response
    console.log(`[${spikeActive ? 'SPIKE' : 'NORMAL'}] Embedding generated in ${elapsed}ms: ${embedding.length} dimensions`);
    
    // Add some randomness to request timing
    sleep(spikeActive ? 0.5 : Math.random() * 2 + 1);
    
  } catch (error) {
    // Record failure
    failureRate.add(1);
    
    console.error(`[${spikeActive ? 'SPIKE' : 'NORMAL'}] Error: ${error.message}`);
    
    // Backoff strategy during errors
    sleep(spikeActive ? 2 : 1);
  }
}

export function teardown(data) {
  const testDuration = (new Date() - data.startTime) / 1000;
  console.log(`Spike test completed after ${testDuration.toFixed(2)} seconds.`);
  console.log(`Failure rate: ${failureRate.value}`);
  console.log(`Average response times: Normal: ${responseTime.values.phase.normal?.avg || 'N/A'}ms, Spike: ${responseTime.values.phase.spike?.avg || 'N/A'}ms`);
}