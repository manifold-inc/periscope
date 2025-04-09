import { sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import * as oai from './helpers/openaiGeneric.js';
import { chatCompletion } from './payloads/completions.js';
import { any } from './helpers/utils.js';
import config from './config.js';

/**
 * Decode-Heavy Test for OpenAI Chat Completions
 * 
 * Purpose: Evaluate the model's performance when generating lengthy, detailed
 * outputs. This tests the model's token generation speed, coherence over long
 * outputs, and throughput under conditions requiring extensive decoding.
 * 
 * Pattern: Short, focused prompts designed to elicit long, detailed responses
 * with high token counts in the output.
 */

// Custom metrics
const outputGenerationTime = new Trend('output_generation_time');
const tokenGenerationRate = new Trend('token_generation_rate'); // tokens/second
const failureRate = new Rate('failure_rate');
const outputSizeMetric = new Trend('output_size_tokens');

// Prompts designed to elicit long, detailed responses
const longOutputPrompts = [
  // Detailed explanations
  {
    prompt: "Explain the entire process of photosynthesis in detail, including both the light-dependent and light-independent reactions, the role of chlorophyll, and how environmental factors affect the rate of photosynthesis.",
    expected_length: "long"
  },
  {
    prompt: "Write a comprehensive explanation of how blockchain technology works, including its core components, how transactions are verified, the consensus mechanisms used, and the differences between public and private blockchains.",
    expected_length: "very long"
  },
  {
    prompt: "Provide a detailed summary of the causes, key events, and consequences of World War II across all major theaters (European, Pacific, African), including the political, economic, and social impacts that shaped the post-war world.",
    expected_length: "very long"
  },
  
  // Step-by-step guides
  {
    prompt: "Write a comprehensive guide on how to start a small business from scratch, including research, planning, legal requirements, financing options, marketing strategies, hiring, and operations management.",
    expected_length: "very long"
  },
  {
    prompt: "Create a detailed step-by-step tutorial on building a machine learning model for image recognition, from data collection and preprocessing to model selection, training, evaluation, and deployment.",
    expected_length: "very long"
  },
  {
    prompt: "Provide a complete guide to writing a research paper, including choosing a topic, conducting research, organizing information, creating an outline, writing each section (introduction, literature review, methodology, results, discussion, conclusion), citing sources, and revision.",
    expected_length: "very long"
  },
  
  // Comparative analyses
  {
    prompt: "Compare and contrast the major programming paradigms (procedural, object-oriented, functional, and logic programming), including their fundamental concepts, strengths, weaknesses, suitable use cases, and representative languages for each.",
    expected_length: "long"
  },
  {
    prompt: "Write a detailed comparison of the major economic systems (capitalism, socialism, communism, and mixed economies), analyzing their theoretical foundations, historical implementations, advantages, disadvantages, and modern variations.",
    expected_length: "long"
  },
  
  // Creative writing prompts
  {
    prompt: "Write a short story about a scientist who discovers time travel. Include detailed descriptions of the technology, multiple time periods visited, character development, and a surprising twist ending.",
    expected_length: "long"
  },
  {
    prompt: "Create a detailed five-act play that explores the ethical implications of artificial intelligence gaining consciousness. Include multiple characters with conflicting viewpoints, complex dialogue, and stage directions.",
    expected_length: "very long"
  }
];

// Variables to add uniqueness to prompts
const uniqueModifiers = [
  "for a university lecture",
  "for a high school student",
  "for a technical blog post",
  "for a YouTube educational video script",
  "for a presentation to non-experts",
  "for a professional conference",
  "for a science magazine article",
  "for a beginner's guide",
  "for an advanced technical audience",
  "for a children's educational program"
];

const uniqueSubjectAreaModifiers = [
  "in the context of climate change",
  "with examples from recent technological developments",
  "with historical context",
  "with practical applications in mind",
  "focusing on future implications",
  "with an emphasis on ethical considerations",
  "highlighting international perspectives",
  "with case studies",
  "using analogies and metaphors",
  "from first principles"
];

export const options = {
  stages: [
    { duration: '30s', target: 1 },  // Ramp up
    { duration: '2m', target: 2 },   // Maintain load
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    'token_generation_rate': ['p(50)>5'],  // Median should be above 5 tokens/second
    'failure_rate': ['rate<0.1'],         // Less than 10% failures
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

export default function run() {
  // Generate a unique request ID to ensure no caching occurs
  const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  
  // Select a random prompt designed to elicit a long response
  const promptConfig = any(longOutputPrompts);
  let promptText = promptConfig.prompt;
  
  // Add uniqueness modifiers to ensure no prompt caching
  const modifier1 = any(uniqueModifiers);
  const modifier2 = any(uniqueSubjectAreaModifiers);
  
  // Format the prompt with unique modifiers and request ID
  promptText = `[RequestID: ${requestId}] ${promptText} Please prepare this ${modifier1} ${modifier2}.`;
  
  // Calculate max tokens based on expected length
  let maxTokens;
  switch(promptConfig.expected_length) {
    case "long":
      maxTokens = 800;
      break;
    case "very long":
      maxTokens = 1500;
      break;
    default:
      maxTokens = 500;
  }
  
  // Optional: Override max tokens from environment variable
  if (__ENV.MAX_OUTPUT_TOKENS) {
    maxTokens = parseInt(__ENV.MAX_OUTPUT_TOKENS);
  }
  
  // Build the message array with uniqueness guarantees
  const messages = [
    { 
      role: 'system', 
      content: `You are a helpful, thorough, and detailed assistant. When asked for information, provide comprehensive, well-structured responses. [Session: ${requestId}]` 
    },
    { 
      role: 'user', 
      content: promptText 
    }
  ];
  
  // Create payload with large output tokens
  const payload = chatCompletion({
    messages: messages,
    max_tokens: maxTokens,
    temperature: 0.7,  // Higher temperature for varied, creative responses
  });
  
  // Log details about this run
  console.log(`Decode test #${requestId} with prompt: "${promptText.substring(0, 50)}..."`);
  console.log(`Requesting max ${maxTokens} tokens output`);
  
  // Measure start time
  const startTime = new Date();
  
  try {
    // Send request to OpenAI
    const response = client.chatComplete(payload);
    const content = oai.getContent(response);
    
    // Calculate processing time
    const elapsed = new Date() - startTime;
    
    // Record metrics
    outputGenerationTime.add(elapsed);
    failureRate.add(0);
    
    // Calculate tokens per second if we have usage info
    if (response.json().usage) {
      const usage = response.json().usage;
      const completionTokens = usage.completion_tokens;
      outputSizeMetric.add(completionTokens);
      
      const tokenRate = completionTokens / (elapsed / 1000);  // tokens/second
      tokenGenerationRate.add(tokenRate);
      
      console.log(`Generated ${completionTokens} output tokens in ${elapsed}ms (${tokenRate.toFixed(2)} tokens/sec)`);
    }
    
    // Log a preview of the response
    console.log(`Response (${content.length} chars): "${content.substring(0, 100)}..."`);
    
    // Add a longer pause between requests to avoid rate limiting
    // Longer tests need more pause time
    sleep(Math.random() * 5 + maxTokens/200);  // Scale pause with token count
    
  } catch (error) {
    failureRate.add(1);
    console.error(`Error: ${error.message}`);
    
    // Longer pause after errors
    sleep(15);
  }
}