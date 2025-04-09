import { randomSeed } from 'k6';

import * as oai from './helpers/openaiGeneric.js';
import { any } from './helpers/utils.js';
import { chatCompletion } from './payloads/completions.js';
import config from './config.js';

// Sample prompts for different domains
const prompts = [
  {
    role: 'user',
    content: 'Explain quantum computing in simple terms.'
  },
  {
    role: 'user',
    content: 'Write a short poem about artificial intelligence.'
  },
  {
    role: 'user',
    content: 'What are the main differences between Python and JavaScript?'
  },
  {
    role: 'user',
    content: 'Provide 5 tips for effective time management.'
  },
  {
    role: 'user',
    content: 'Explain how neural networks work.'
  },
];

export const options = {
  stages: [
    { duration: '30s', target: 1 },  // Ramp up to 1 user
    { duration: '1m', target: 1 },   // Stay at 1 user
    { duration: '30s', target: 2 },  // Ramp up to 2 users
    { duration: '1m', target: 2 },   // Stay at 2 users
    { duration: '30s', target: 0 },  // Ramp down to 0 users
  ],
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

let counter = 0;

export default function run() {
  randomSeed(counter++);
  
  // Select a random prompt
  const prompt = any(prompts);
  
  // Create chat completion payload
  const payload = chatCompletion({
    messages: [prompt],
  });
  
  // Send request to OpenAI
  const response = client.chatComplete(payload);
  
  try {
    // Get the response content
    const content = oai.getContent(response);
    
    // Log first few characters of the response
    if (content) {
      console.log(`Prompt: "${prompt.content.substring(0, 30)}...", Response: "${content.substring(0, 30)}..."`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}