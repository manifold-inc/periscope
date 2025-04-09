import { randomSeed } from 'k6';
import { Trend } from 'k6/metrics';

import * as oai from './helpers/openaiGeneric.js';
import { multiTextEmbedding } from './payloads/embeddings.js';
import config from './config.js';

// Custom metrics for batch embedding performance
const batchLatency = new Trend('batch_embedding_latency');
const batchLatencyPerText = new Trend('batch_embedding_latency_per_text');
const batchSize = new Trend('batch_size');
const embeddingDimension = new Trend('embedding_dimension');

// Sample texts of different lengths for batch processing
const textPool = [
  "The quick brown fox jumps over the lazy dog.",
  "Machine learning models have transformed how we approach natural language processing tasks.",
  "Embedding vectors are mathematical representations of text that capture semantic meaning.",
  "Large language models can generate human-like text and answer questions.",
  "Vector databases are specialized for storing high-dimensional vectors.",
  "Artificial intelligence continues to evolve at a rapid pace.",
  "Natural language processing helps computers understand human language.",
  "Semantic search uses meaning rather than just keywords.",
  "Neural networks are inspired by biological neurons in the brain.",
  "Data science combines statistics, mathematics, and programming.",
  "Cloud computing provides scalable resources for AI workloads.",
  "Transformer models revolutionized language understanding tasks.",
  "Supervised learning requires labeled data for training.",
  "Clustering algorithms group similar data points together.",
  "Feature engineering transforms raw data into useful inputs.",
];

export const options = {
  stages: [
    { duration: '30s', target: 1 },
    { duration: '1m', target: 2 },
    { duration: '30s', target: 0 },
  ],
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

// Configure batch sizes to test
const batchSizes = [2, 3, 5];
let batchIndex = 0;

export default function run() {
  randomSeed(batchIndex++);
  
  // Select batch size for this iteration
  const currentBatchSize = batchSizes[batchIndex % batchSizes.length];
  
  // Create a batch of texts
  const batchTexts = [];
  for (let i = 0; i < currentBatchSize; i++) {
    const textIndex = (batchIndex + i) % textPool.length;
    batchTexts.push(textPool[textIndex]);
  }
  
  // Measure start time
  const startTime = new Date();
  
  // Create payload for batch embedding
  const payload = multiTextEmbedding({
    inputs: batchTexts,
  });
  
  // Send request to OpenAI
  const response = client.embeddings(payload);
  
  try {
    // Extract all embedding vectors
    const embeddings = oai.getEmbeddings(response);
    
    // Calculate latency
    const latency = new Date() - startTime;
    const latencyPerText = latency / currentBatchSize;
    
    // Record metrics
    batchLatency.add(latency);
    batchLatencyPerText.add(latencyPerText);
    batchSize.add(currentBatchSize);
    
    if (embeddings.length > 0) {
      embeddingDimension.add(embeddings[0].length);
    }
    
    console.log(`Batch size: ${currentBatchSize} → ${embeddings.length} vectors, took ${latency}ms (${latencyPerText.toFixed(2)}ms per text)`);
    
    // Display the first few tokens of first few texts
    for (let i = 0; i < Math.min(2, batchTexts.length); i++) {
      console.log(`  Text ${i+1}: "${batchTexts[i].substring(0, 25)}..."`);
    }
  } catch (error) {
    console.error(`Batch error: ${error.message}`);
  }
}