import { sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import * as oai from './helpers/openaiGeneric.js';
import { singleTextEmbedding, multiTextEmbedding } from './payloads/embeddings.js';
import { any } from './helpers/utils.js';
import config from './config.js';

/**
 * Stress Test for OpenAI Embeddings
 * 
 * Purpose: Identify the maximum operational capacity of the embedding API
 * by gradually increasing load until performance degradation or failures occur.
 * 
 * Pattern: Increasing VUs, mix of single and batch requests, varying text lengths
 */

// Custom metrics
const responseTime = new Trend('response_time');
const errorCounter = new Counter('api_errors');
const successCounter = new Counter('api_success');
const embeddingDimension = new Trend('embedding_dimension');

// Test texts of varying length and complexity
const shortTexts = [
  "Artificial intelligence",
  "Machine learning algorithms",
  "Neural networks",
  "Natural language processing",
  "Vector embeddings",
];

const mediumTexts = [
  "Artificial intelligence is intelligence demonstrated by machines, unlike natural intelligence displayed by humans and animals.",
  "Machine learning is a field of study that gives computers the ability to learn without being explicitly programmed.",
  "Neural networks are computing systems with interconnected nodes that work similar to neurons in a biological brain.",
  "Natural language processing is a subfield of AI concerned with giving computers the ability to understand text and spoken words.",
  "Vector embeddings are mathematical representations of text that capture semantic meaning in a high-dimensional space.",
];

const longTexts = [
  "Artificial intelligence (AI) is intelligence demonstrated by machines, unlike natural intelligence displayed by humans and animals, which involves consciousness and emotionality. The distinction between the former and the latter categories is often revealed by the acronym chosen. Strong AI is generally labeled as artificial general intelligence (AGI), while attempts to emulate natural intelligence have been called artificial biological intelligence (ABI).",
  "Machine learning (ML) is a field of study that gives computers the ability to learn without being explicitly programmed. ML is one way of achieving artificial intelligence. Machine learning algorithms build a model based on sample data, known as training data, in order to make predictions or decisions without being explicitly programmed to do so.",
  "Neural networks are computing systems with interconnected nodes that work similar to neurons in a biological brain. Using algorithms, they can recognize hidden patterns and correlations in raw data, cluster and classify it, and continuously learn and improve over time. Neural networks are used in deep learning, which is a subfield of machine learning.",
];

// Options for batch sizes
const batchSizes = [2, 3, 5];

export const options = {
  // Gradually increase load to find breaking points
  stages: [
    { duration: '30s', target: 3 },  // Ramp up to 3 users
    { duration: '1m', target: 5 },   // Ramp up to 5 users
    { duration: '2m', target: 10 },  // Ramp up to 10 users
    { duration: '2m', target: 15 },  // Ramp up to 15 users
    { duration: '1m', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_failed: ['rate<0.1'],    // Less than 10% of requests should fail
    'response_time': ['p(95)<10000'], // 95% of requests should be below 10s
    'api_errors': ['count<100'],      // Fewer than 100 total errors
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
  // Determine request type - sometimes do batch requests
  const useBatch = Math.random() < 0.3; // 30% of requests are batch
  
  // Select text length complexity based on load
  // As VUs increase, use more complex texts
  let textPool;
  if (__VU <= 5) {
    textPool = shortTexts;
  } else if (__VU <= 10) {
    textPool = mediumTexts;
  } else {
    textPool = longTexts;
  }
  
  // Track request timing
  const startTime = new Date();
  const requestId = `RID-${__VU}-${startTime.getTime()}`;
  
  try {
    let response;
    
    if (useBatch) {
      // Batch request
      const batchSize = batchSizes[Math.floor(Math.random() * batchSizes.length)];
      const batchTexts = [];
      
      // Select random texts for the batch
      for (let i = 0; i < batchSize; i++) {
        batchTexts.push(any(textPool));
      }
      
      console.log(`[${requestId}] User ${__VU}: Batch request with ${batchSize} texts`);
      
      // Create payload for batch embedding
      const payload = multiTextEmbedding({
        inputs: batchTexts,
      });
      
      // Send request to OpenAI
      response = client.embeddings(payload);
      
      // Get embeddings
      const embeddings = oai.getEmbeddings(response);
      
      // Record success and embeddings metrics
      successCounter.add(1);
      if (embeddings.length > 0) {
        embeddingDimension.add(embeddings[0].length);
      }
      
      console.log(`[${requestId}] Batch response received: ${embeddings.length} vectors`);
      
    } else {
      // Single text request
      const text = any(textPool);
      
      console.log(`[${requestId}] User ${__VU}: Single request with text "${text.substring(0, 30)}..."`);
      
      // Create payload for single text embedding
      const payload = singleTextEmbedding({
        input: text,
      });
      
      // Send request to OpenAI
      response = client.embeddings(payload);
      
      // Get embedding
      const embedding = oai.getContent(response);
      
      // Record success and embedding metrics
      successCounter.add(1);
      embeddingDimension.add(embedding.length);
      
      console.log(`[${requestId}] Single response received: ${embedding.length}-dimensional vector`);
    }
    
    // Calculate and record response time
    const elapsed = new Date() - startTime;
    responseTime.add(elapsed, { batch: useBatch ? "yes" : "no" });
    
    // Add variability to request timing
    sleep(Math.random() * 3 + 0.5); // 0.5 to 3.5 seconds
    
  } catch (error) {
    // Record error
    errorCounter.add(1);
    console.error(`[${requestId}] Error: ${error.message}`);
    
    // Backoff strategy on errors
    sleep(5);
  }
}