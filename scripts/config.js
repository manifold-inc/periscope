import { envNumber } from './helpers/utils.js';

export default {
  runs: {
    vus: envNumber('VUS', 1),
    // Uses K6 time notation: "1m", "10s", etc.
    timeWait: __ENV.TIME_WAIT || '0s',
    timeRampUp: __ENV.TIME_RAMP_UP || '30s',
    timeLoad: __ENV.TIME_LOAD || '1m',
    timeRampDown: __ENV.TIME_RAMP_DOWN || '30s',
  },
  openai: {
    url: __ENV.OPENAI_BASE_URL || 'https://api.openai.com',
    key: __ENV.OPENAI_API_KEY || '',
    models: {
      completion: __ENV.OPENAI_COMPLETION_MODEL || 'gpt-3.5-turbo',
      embedding: __ENV.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      coding: __ENV.OPENAI_CODING_MODEL || 'gpt-3.5-turbo', // For code completion tasks
    }
  }
};