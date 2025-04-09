import { sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import * as oai from './helpers/openaiGeneric.js';
import { chatCompletion } from './payloads/completions.js';
import { any } from './helpers/utils.js';
import config from './config.js';

/**
 * Recovery Test for OpenAI Completions
 * 
 * Purpose: Evaluate how quickly the API recovers after experiencing heavy load
 * or failure conditions. This test simulates a severe stress period followed by
 * a recovery period to measure stabilization time and behavior.
 * 
 * Pattern: High load → sudden drop → monitoring of recovery metrics
 */

// Custom metrics
const responseTime = new Trend('response_time');
const errorRate = new Rate('error_rate');
const recoveryTime = new Trend('recovery_time');
const stabilizationTime = new Trend('stabilization_time');

// Simple, consistent prompts for reliable comparison
const testPrompts = [
  { role: 'user', content: 'Define artificial intelligence.' },
  { role: 'user', content: 'Explain what cloud computing is.' },
  { role: 'user', content: 'What is machine learning?' },
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
    { duration: '1m', target: 3 },    // Baseline
    { duration: '3m', target: 20 },   // Stress phase - high load
    { duration: '10s', target: 2 },   // Sudden drop to simulate recovery
    { duration: '5m', target: 2 },    // Recovery monitoring phase
  ],
  thresholds: {
    'error_rate': ['rate<0.2'],        // Allow some errors during stress
    'stabilization_time': ['avg<60000'], // Average stabilization under 60s
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
  console.log(`Starting recovery test at ${new Date().toISOString()}`);
  return { 
    startTime: new Date(),
    baselineResponseTime: null,
    recoveryStartTime: null,
    currentPhase: phases.BASELINE,
    isStabilized: false,
    stabilizationTime: null,
  };
}

export default function run(data) {
  // Determine the current phase based on the test time
  const testRuntime = (new Date() - data.startTime) / 1000;
  
  let currentPhase;
  if (testRuntime < 60) {
    currentPhase = phases.BASELINE;
  } else if (testRuntime < 240) {
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
    }
    
    data.currentPhase = currentPhase;
  }
  
  // Select a prompt
  const prompt = any(testPrompts);
  
  // Create payload appropriate for the phase
  const payload = chatCompletion({
    messages: [prompt],
    max_tokens: currentPhase === phases.STRESS ? 150 : 50,
    temperature: 0.5,
  });
  
  // Measure start time
  const startTime = new Date();
  
  try {
    // Send request to OpenAI
    const response = client.chatComplete(payload);
    const content = oai.getContent(response);
    
    // Calculate response time
    const elapsed = new Date() - startTime;
    responseTime.add(elapsed, { phase: currentPhase });
    errorRate.add(0);
    
    // Record baseline response time if in baseline phase
    if (currentPhase === phases.BASELINE && !data.baselineResponseTime) {
      data.baselineResponseTime = responseTime.values.phase[phases.BASELINE].avg;
      console.log(`Established baseline response time: ${data.baselineResponseTime}ms`);
    }
    
    // Measure recovery metrics
    if (currentPhase === phases.RECOVERY) {
      // Calculate time since recovery phase started
      const timeSinceRecoveryStarted = new Date() - data.recoveryStartTime;
      recoveryTime.add(timeSinceRecoveryStarted);
      
      // Check if we've stabilized (response time within 20% of baseline)
      if (!data.isStabilized && data.baselineResponseTime) {
        const stabilizationThreshold = data.baselineResponseTime * 1.2; // 20% above baseline
        
        if (elapsed <= stabilizationThreshold) {
          data.isStabilized = true;
          data.stabilizationTime = timeSinceRecoveryStarted;
          stabilizationTime.add(data.stabilizationTime);
          
          console.log(`System stabilized after ${data.stabilizationTime}ms (response time: ${elapsed}ms)`);
        }
      }
    }
    
    console.log(`[${currentPhase.toUpperCase()}] Response time: ${elapsed}ms, Content: "${content.substring(0, 30)}..."`);
    
    // Vary sleep time based on phase
    if (currentPhase === phases.STRESS) {
      sleep(Math.random() * 0.5); // Short wait during stress
    } else {
      sleep(Math.random() * 2 + 1); // 1-3s wait during baseline/recovery
    }
    
  } catch (error) {
    errorRate.add(1);
    console.error(`[${currentPhase.toUpperCase()}] Error: ${error.message}`);
    
    // Back off on errors
    sleep(5);
  }
}

export function teardown(data) {
  console.log(`Recovery test completed at ${new Date().toISOString()}`);
  console.log(`Baseline response time: ${data.baselineResponseTime}ms`);
  
  if (data.isStabilized) {
    console.log(`System stabilized after ${data.stabilizationTime}ms in recovery phase`);
  } else {
    console.log(`System did not stabilize during the test duration`);
  }
}