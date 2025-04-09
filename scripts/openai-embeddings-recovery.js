import { sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import * as oai from './helpers/openaiGeneric.js';
import { singleTextEmbedding } from './payloads/embeddings.js';
import { any } from './helpers/utils.js';
import config from './config.js';

/**
 * Recovery Test for OpenAI Embeddings
 * 
 * Purpose: Evaluate how quickly the embeddings API recovers after experiencing 
 * heavy load or failure conditions. This test simulates a severe stress period 
 * followed by a recovery period to measure stabilization time and behavior.
 * 
 * Pattern: High load → sudden drop → monitoring of recovery metrics
 */

// Custom metrics
const responseTime = new Trend('response_time');
const errorRate = new Rate('error_rate');
const recoveryTime = new Trend('recovery_time');
const stabilizationTime = new Trend('stabilization_time');

// Consistent texts for reliable comparison
const testTexts = [
  "Embedding models convert text into numerical vector representations.",
  "Vector databases enable efficient similarity search for embeddings.",
  "Semantic search uses embeddings to find conceptually similar content.",
  "Clustering algorithms group similar embeddings together.",
  "Classification systems can categorize text based on embeddings.",
];

// Define the test phases
const phases = {
  BASELINE: 'baseline',
  STRESS: 'stress',
  RECOVERY: 'recovery',
};

export const options = {
  // Create a pattern to test recovery
  stages: [
    { duration: '1m', target: 2 },    // Baseline
    { duration: '2m', target: 25 },   // Stress phase - high load
    { duration: '10s', target: 2 },   // Sudden drop to simulate recovery
    { duration: '4m', target: 2 },    // Recovery monitoring phase
  ],
  thresholds: {
    'error_rate': ['rate<0.2'],           // Allow some errors during stress
    'stabilization_time': ['avg<60000'],  // Average stabilization under 60s
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

export function setup() {
  console.log(`Starting embeddings recovery test at ${new Date().toISOString()}`);
  return { 
    startTime: new Date(),
    baselineResponseTime: null,
    recoveryStartTime: null,
    currentPhase: phases.BASELINE,
    isStabilized: false,
    stabilizationTime: null,
    baselineSamples: [],
    lastResponseTimes: [], // Rolling window of recent response times
  };
}

export default function run(data) {
  // Determine the current phase based on the test time
  const testRuntime = (new Date() - data.startTime) / 1000;
  
  let currentPhase;
  if (testRuntime < 60) {
    currentPhase = phases.BASELINE;
  } else if (testRuntime < 180) {
    currentPhase = phases.STRESS;
  } else {
    currentPhase = phases.RECOVERY;
  }
  
  // Phase transition detection
  if (currentPhase !== data.currentPhase) {
    console.log(`[${Math.floor(testRuntime)}s] Phase changed: ${data.currentPhase} -> ${currentPhase}`);
    
    // If we just entered recovery phase, mark the start time
    if (currentPhase === phases.RECOVERY && data.currentPhase === phases.STRESS) {
      data.recoveryStartTime = new Date();
      console.log(`Recovery phase started at ${data.recoveryStartTime.toISOString()}`);
      
      // Calculate baseline statistics if we have enough samples
      if (data.baselineSamples.length > 0) {
        data.baselineResponseTime = data.baselineSamples.reduce((sum, val) => sum + val, 0) / data.baselineSamples.length;
        console.log(`Baseline response time: ${data.baselineResponseTime.toFixed(2)}ms (from ${data.baselineSamples.length} samples)`);
      }
    }
    
    data.currentPhase = currentPhase;
  }
  
  // Select a text
  const text = any(testTexts);
  
  // Create payload
  const payload = singleTextEmbedding({
    input: text,
  });
  
  // Measure start time
  const startTime = new Date();
  
  try {
    // Send request to OpenAI
    const response = client.embeddings(payload);
    const embedding = oai.getContent(response);
    
    // Calculate response time
    const elapsed = new Date() - startTime;
    responseTime.add(elapsed, { phase: currentPhase });
    errorRate.add(0);
    
    // Keep track of baseline samples
    if (currentPhase === phases.BASELINE) {
      data.baselineSamples.push(elapsed);
    }
    
    // Update rolling window of recent response times
    data.lastResponseTimes.push(elapsed);
    if (data.lastResponseTimes.length > 5) {
      data.lastResponseTimes.shift(); // Keep only the most recent 5
    }
    
    // Measure recovery metrics
    if (currentPhase === phases.RECOVERY) {
      // Calculate time since recovery phase started
      const timeSinceRecoveryStarted = new Date() - data.recoveryStartTime;
      recoveryTime.add(timeSinceRecoveryStarted);
      
      // Check if we've stabilized (rolling average within 30% of baseline)
      if (!data.isStabilized && data.baselineResponseTime && data.lastResponseTimes.length >= 3) {
        const recentAvg = data.lastResponseTimes.reduce((sum, val) => sum + val, 0) / data.lastResponseTimes.length;
        const stabilizationThreshold = data.baselineResponseTime * 1.3; // 30% above baseline
        
        if (recentAvg <= stabilizationThreshold) {
          data.isStabilized = true;
          data.stabilizationTime = timeSinceRecoveryStarted;
          stabilizationTime.add(data.stabilizationTime);
          
          console.log(`System stabilized after ${data.stabilizationTime}ms (recent avg: ${recentAvg.toFixed(2)}ms, threshold: ${stabilizationThreshold.toFixed(2)}ms)`);
        }
      }
    }
    
    console.log(`[${currentPhase.toUpperCase()}] Response time: ${elapsed}ms, Vector dimensions: ${embedding.length}`);
    
    // Vary sleep time based on phase
    if (currentPhase === phases.STRESS) {
      sleep(Math.random() * 0.2); // Short wait during stress
    } else {
      sleep(Math.random() * 1 + 0.5); // 0.5-1.5s wait during baseline/recovery
    }
    
  } catch (error) {
    errorRate.add(1);
    console.error(`[${currentPhase.toUpperCase()}] Error: ${error.message}`);
    
    // Back off on errors
    sleep(3);
  }
}

export function teardown(data) {
  console.log(`\n=== RECOVERY TEST SUMMARY ===`);
  console.log(`Test completed at ${new Date().toISOString()}`);
  console.log(`Baseline response time: ${data.baselineResponseTime?.toFixed(2) || 'N/A'}ms`);
  
  if (data.isStabilized) {
    console.log(`System stabilized after ${data.stabilizationTime}ms in recovery phase`);
  } else {
    console.log(`System did not stabilize during the test duration`);
  }
  
  // Calculate average response times by phase
  console.log(`Average response times by phase:`);
  for (const phase in responseTime.values.phase) {
    console.log(`  ${phase.toUpperCase()}: ${responseTime.values.phase[phase].avg.toFixed(2)}ms`);
  }
}