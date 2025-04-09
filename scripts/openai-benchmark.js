import { randomSeed } from 'k6';
import { Trend } from 'k6/metrics';

import * as oai from './helpers/openaiGeneric.js';
import { any, sequenceScenarios } from './helpers/utils.js';
import { chatCompletion } from './payloads/completions.js';
import { singleTextEmbedding } from './payloads/embeddings.js';
import config from './config.js';

// Custom metrics
const completionLatency = new Trend('completion_latency');
const embeddingLatency = new Trend('embedding_latency');

// Chat completion prompts
const completionPrompts = [
  { role: 'user', content: 'Explain the concept of machine learning in simple terms.' },
  { role: 'user', content: 'What are the benefits of cloud computing for businesses?' },
  { role: 'user', content: 'How does natural language processing work?' },
  { role: 'user', content: 'Explain the differences between supervised and unsupervised learning.' },
  { role: 'user', content: 'What are the ethical considerations of AI development?' },
];

// Embedding texts
const embeddingTexts = [
  "Machine learning is a method of data analysis that automates analytical model building.",
  "Cloud computing is the on-demand availability of computer system resources, especially data storage and computing power.",
  "Natural language processing is a subfield of linguistics, computer science, and artificial intelligence concerned with the interactions between computers and human language.",
  "Supervised learning is the machine learning task of learning a function that maps an input to an output based on example input-output pairs.",
  "AI ethics is a set of principles and guidelines that are designed to inform the development and rightful use of artificial intelligence.",
];

// Create OpenAI client with authentication
const createOpenAIClient = (model) => {
  return oai.createClient({
    url: config.openai.url,
    options: {
      model,
    },
    headers: {
      'Authorization': `Bearer ${config.openai.key}`,
    },
  });
};

// Setup scenarios to benchmark different API endpoints
const setupScenarios = () => {
  const scenarios = {};
  const endpointTypes = ['completion', 'embedding'];
  const vusLevels = [1, 2, 5];
  const duration = 60; // seconds per scenario
  
  let scenarioIndex = 0;
  
  // For each endpoint type and VU level, create a scenario
  endpointTypes.forEach(type => {
    vusLevels.forEach(vus => {
      const scenarioName = `${type}_${vus}vu`;
      scenarios[scenarioName] = {
        executor: 'constant-vus',
        vus,
        duration: `${duration}s`,
        startTime: `${scenarioIndex * duration}s`,
        env: { 
          endpointType: type,
        },
      };
      scenarioIndex++;
    });
  });
  
  return scenarios;
};

export const options = {
  scenarios: setupScenarios(),
};

let counter = 0;

export default function run() {
  randomSeed(counter++);
  
  const endpointType = __ENV.endpointType || 'completion';
  
  // Measure start time
  const startTime = new Date();
  
  if (endpointType === 'completion') {
    // Test chat completion endpoint
    const completionClient = createOpenAIClient(config.openai.models.completion);
    const prompt = any(completionPrompts);
    
    const payload = chatCompletion({
      messages: [prompt],
    });
    
    const response = completionClient.chatComplete(payload);
    
    try {
      const content = oai.getContent(response);
      const latency = new Date() - startTime;
      
      completionLatency.add(latency);
      
      console.log(`[Completion] "${prompt.content.substring(0, 30)}..." → ${content ? content.length : 0} chars, took ${latency}ms`);
    } catch (error) {
      console.error(`[Completion] Error: ${error.message}`);
    }
  } else if (endpointType === 'embedding') {
    // Test embedding endpoint
    const embeddingClient = createOpenAIClient(config.openai.models.embedding);
    const text = any(embeddingTexts);
    
    const payload = singleTextEmbedding({
      input: text,
    });
    
    const response = embeddingClient.embeddings(payload);
    
    try {
      const embedding = oai.getContent(response);
      const latency = new Date() - startTime;
      
      embeddingLatency.add(latency);
      
      console.log(`[Embedding] "${text.substring(0, 30)}..." → ${embedding ? embedding.length : 0}d vector, took ${latency}ms`);
    } catch (error) {
      console.error(`[Embedding] Error: ${error.message}`);
    }
  }
}