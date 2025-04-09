import { Trend } from 'k6/metrics';

import * as http from "./http.js";

const openaiTrends = {
  prompt_tokens: new Trend('prompt_tokens'),
  completion_tokens: new Trend('completion_tokens'),
  total_tokens: new Trend('total_tokens'),
  tokens_per_second: new Trend('tokens_per_second'),
  embedding_tokens: new Trend('embedding_tokens'),
}

const completionEndpoints = new Set([
  '/v1/chat/completions',
  '/v1/completions',
])

const embeddingEndpoints = new Set([
  '/v1/embeddings',
])

export const createClient = (config) => {
  const {
    url,
    options,
    headers = {},
  } = config;
  
  const clientGet = (path, ...args) => http.get(`${url}${path}`, ...args);
  
  const clientPost = (path, body, params = {}) => {
    // Merge default headers with provided params
    const mergedParams = {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      ...params,
    };
    
    const response = http.post(`${url}${path}`, body, mergedParams);

    // Track completion token stats
    if (completionEndpoints.has(path)) {
      const completion = http.getBody(response);

      if (completion && completion.usage) {
        openaiTrends.prompt_tokens.add(completion.usage.prompt_tokens);
        openaiTrends.completion_tokens.add(completion.usage.completion_tokens);
        openaiTrends.total_tokens.add(completion.usage.total_tokens);

        const durationSeconds = (response.timings.duration - response.timings.sending) / 1000;
        if (durationSeconds > 0) {
          const tokensPerSecond = completion.usage.completion_tokens / durationSeconds;
          openaiTrends.tokens_per_second.add(tokensPerSecond);
        }
      }
    }
    
    // Track embedding token stats
    if (embeddingEndpoints.has(path)) {
      const embedding = http.getBody(response);
      
      if (embedding && embedding.usage) {
        openaiTrends.embedding_tokens.add(embedding.usage.prompt_tokens);
        openaiTrends.total_tokens.add(embedding.usage.total_tokens);
      }
    }

    return response;
  };

  const complete = (body, ...args) => {
    return clientPost('/v1/completions', { ...body, ...options }, ...args);
  };

  const chatComplete = (body, ...args) => {
    return clientPost('/v1/chat/completions', { ...body, ...options}, ...args);
  }
  
  const embeddings = (body, ...args) => {
    return clientPost('/v1/embeddings', { ...body, ...options}, ...args);
  }

  return {
    config,
    get: clientGet,
    post: clientPost,
    complete,
    chatComplete,
    embeddings,
  };
}

export const getContent = (response) => {
  const body = http.getBody(response);

  if (!body) {
    throw new Error('Empty response body');
  }

  // Generic completion
  if (body.choices && body.choices[0].text) {
    return body.choices[0].text;
  }

  // Chat completion
  if (body.choices && body.choices[0].message) {
    return body.choices[0].message.content;
  }
  
  // Embeddings
  if (body.data && body.data.length > 0 && body.data[0].embedding) {
    return body.data[0].embedding;
  }

  throw new Error(`OpenAIGeneric: Unknown response format: ${JSON.stringify(body)}`);
}

// Helper to get all embedding vectors from a response
export const getEmbeddings = (response) => {
  const body = http.getBody(response);
  
  if (body.data && body.data.length > 0 && body.data[0].embedding) {
    return body.data.map(item => item.embedding);
  }
  
  throw new Error(`OpenAIGeneric: Not an embeddings response: ${JSON.stringify(body)}`);
}