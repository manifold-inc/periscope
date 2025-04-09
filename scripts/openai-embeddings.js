import { randomSeed } from 'k6';
import { Trend } from 'k6/metrics';

import * as oai from './helpers/openaiGeneric.js';
import { any } from './helpers/utils.js';
import { singleTextEmbedding } from './payloads/embeddings.js';
import config from './config.js';

// Custom metrics for embedding performance
const embeddingLatency = new Trend('embedding_latency');
const embeddingDimension = new Trend('embedding_dimension');

// Sample texts of different lengths
const texts = [
  "The quick brown fox jumps over the lazy dog.",
  "Machine learning models have transformed how we approach natural language processing tasks.",
  "Embedding vectors are mathematical representations of text that capture semantic meaning in a high-dimensional space.",
  "Large language models can generate human-like text, answer questions, translate languages, and write different kinds of creative content.",
  "Vector databases are specialized for storing high-dimensional vectors for efficient similarity search operations.",
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

let counter = 0;

export default function run() {
  randomSeed(counter++);
  
  // Select a random text
  const text = any(texts);
  
  // Measure start time
  const startTime = new Date();
  
  // Create payload for single text embedding
  const payload = singleTextEmbedding({
    input: text,
  });
  
  // Send request to OpenAI
  const response = client.embeddings(payload);
  
  try {
    // Extract the embedding vector
    const embedVector = oai.getContent(response);
    
    // Calculate latency
    const latency = new Date() - startTime;
    
    // Record metrics
    embeddingLatency.add(latency);
    embeddingDimension.add(embedVector.length);
    
    console.log(`"${text.substring(0, 30)}..." → ${embedVector.length}d vector, took ${latency}ms`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}