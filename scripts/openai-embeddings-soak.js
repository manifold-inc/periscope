import { sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import * as oai from './helpers/openaiGeneric.js';
import { singleTextEmbedding, multiTextEmbedding } from './payloads/embeddings.js';
import { any } from './helpers/utils.js';
import config from './config.js';

/**
 * Soak Test for OpenAI Embeddings
 * 
 * Purpose: Assess the embeddings API's reliability and performance over an extended period 
 * under consistent load. Identifies issues that might only appear after prolonged use.
 * 
 * Pattern: Moderate load maintained for a long duration (hours)
 */

// Custom metrics
const responseTime = new Trend('response_time');
const batchResponseTime = new Trend('batch_response_time');
const errorRate = new Rate('error_rate');
const embeddingDimension = new Trend('embedding_dimension');
const hourlyCounter = new Counter('hourly_requests');

// Mix of texts with different lengths and domains
const shortTexts = [
  "Artificial intelligence",
  "Machine learning",
  "Neural networks",
  "Computer vision",
  "Natural language processing",
];

const mediumTexts = [
  "Artificial intelligence is transforming many industries through automation.",
  "Machine learning algorithms improve through experience without explicit programming.",
  "Neural networks use interconnected nodes to simulate brain function.",
  "Computer vision enables machines to interpret and understand visual information.",
  "Natural language processing allows computers to understand human language.",
];

const longTexts = [
  "Artificial intelligence (AI) is intelligence demonstrated by machines, unlike natural intelligence displayed by humans. AI applications include advanced web search engines, recommendation systems, human speech recognition, and self-driving cars.",
  "Machine learning is a method of data analysis that automates analytical model building. It is a branch of artificial intelligence based on the idea that systems can learn from data, identify patterns and make decisions with minimal human intervention.",
  "Neural networks are computing systems with interconnected nodes that work similar to neurons in a biological brain. Using algorithms, they can recognize hidden patterns and correlations in raw data, cluster and classify it, and continuously learn and improve over time.",
];

export const options = {
  // Maintain moderate load for an extended period
  // Note: For actual soak tests, this would typically run for hours
  // Here we use a shorter duration for demonstration purposes
  stages: [
    { duration: '3m', target: 5 },    // Ramp up to 5 VUs
    { duration: '15m', target: 5 },   // Stay at 5 VUs for 15 minutes
    { duration: '2m', target: 0 },    // Ramp down to 0 VUs
  ],
  thresholds: {
    'response_time': ['p(90)<5000'],   // 90% of requests under 5s
    'error_rate': ['rate<0.05'],       // Less than 5% error rate
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
  console.log(`Starting embeddings soak test at ${new Date().toISOString()}`);
  return { 
    startTime: new Date(),
    requestCount: 0,
    errorCount: 0,
    lastReportTime: new Date()
  };
}

export default function run(data) {
  // Calculate how long the test has been running
  const testRuntime = (new Date() - data.startTime) / 1000 / 60; // in minutes
  const hourMark = Math.floor(testRuntime / 60);
  
  // Determine if we'll do a batch request (20% probability)
  const doBatchRequest = Math.random() < 0.2;
  
  // Determine text complexity based on time in test
  // Gradually increase complexity over time to simulate evolving usage
  let textPool;
  if (testRuntime < 5) {
    textPool = shortTexts;
  } else if (testRuntime < 15) {
    textPool = mediumTexts;
  } else {
    textPool = longTexts;
  }
  
  // Track the start time for this request
  const startTime = new Date();
  
  try {
    if (doBatchRequest) {
      // Batch request
      const batchSize = Math.floor(Math.random() * 3) + 2; // 2-4 texts
      const batchTexts = [];
      
      // Select random texts for the batch
      for (let i = 0; i < batchSize; i++) {
        batchTexts.push(any(textPool));
      }
      
      // Create payload
      const payload = multiTextEmbedding({
        inputs: batchTexts,
      });
      
      // Send request to OpenAI
      const response = client.embeddings(payload);
      const embeddings = oai.getEmbeddings(response);
      
      // Calculate response metrics
      const elapsed = new Date() - startTime;
      batchResponseTime.add(elapsed);
      errorRate.add(0);
      hourlyCounter.add(1, { hour: hourMark, type: 'batch' });
      
      if (embeddings.length > 0) {
        embeddingDimension.add(embeddings[0].length);
      }
      
      console.log(`[${Math.floor(testRuntime)}m] Batch (${batchSize}) response in ${elapsed}ms: ${embeddings.length} vectors of ${embeddings[0]?.length || 'unknown'} dimensions`);
      
    } else {
      // Single text request
      const text = any(textPool);
      
      // Create payload
      const payload = singleTextEmbedding({
        input: text,
      });
      
      // Send request to OpenAI
      const response = client.embeddings(payload);
      const embedding = oai.getContent(response);
      
      // Calculate response metrics
      const elapsed = new Date() - startTime;
      responseTime.add(elapsed);
      errorRate.add(0);
      hourlyCounter.add(1, { hour: hourMark, type: 'single' });
      embeddingDimension.add(embedding.length);
      
      console.log(`[${Math.floor(testRuntime)}m] Single response in ${elapsed}ms: ${embedding.length}-dimensional vector`);
    }
    
    // Update request count
    data.requestCount++;
    
    // Periodic reporting
    const timeSinceLastReport = new Date() - data.lastReportTime;
    if (timeSinceLastReport > 300000) { // Report every 5 minutes
      console.log(`=== PROGRESS REPORT AT ${Math.floor(testRuntime)}m ===`);
      console.log(`Total requests: ${data.requestCount}, Errors: ${data.errorCount}`);
      console.log(`Error rate: ${(data.errorCount / data.requestCount * 100).toFixed(2)}%`);
      console.log(`Average response times - Single: ${responseTime.avg.toFixed(2)}ms, Batch: ${batchResponseTime.avg.toFixed(2)}ms`);
      
      data.lastReportTime = new Date();
    }
    
    // Pause between requests to simulate realistic usage patterns
    // and prevent rate limiting during long-running tests
    sleep(Math.random() * 4 + 1); // 1-5 second pause
    
  } catch (error) {
    errorRate.add(1);
    data.errorCount++;
    console.error(`[${Math.floor(testRuntime)}m] Error: ${error.message}`);
    
    // Add longer backoff when errors occur
    sleep(10); 
  }
}

export function teardown(data) {
  const testDuration = (new Date() - data.startTime) / 1000 / 60;
  const errorPercentage = (data.errorCount / data.requestCount * 100) || 0;
  
  console.log(`\n=== SOAK TEST SUMMARY ===`);
  console.log(`Test completed after ${testDuration.toFixed(2)} minutes`);
  console.log(`Total requests: ${data.requestCount}`);
  console.log(`Error count: ${data.errorCount} (${errorPercentage.toFixed(2)}%)`);
  console.log(`Average response times:`);
  console.log(`  Single requests: ${responseTime.avg.toFixed(2)}ms`);
  console.log(`  Batch requests: ${batchResponseTime.avg.toFixed(2)}ms`);
  console.log(`Average embedding dimension: ${embeddingDimension.avg.toFixed(0)}`);
}