// scripts/my-custom-test.js
import * as oai from './helpers/openaiGeneric.js';
import config from './config.js';

export const options = {
    vus: 1,
    duration: '10s',
};

const client = oai.createClient({
    url: config.openai.url,
    options: {
    model: 'gpt-3.5-turbo',
    },
    headers: {
    'Authorization': `Bearer ${config.openai.key}`,
    },
});

export default function() {
    const response = client.chatComplete({
    messages: [
        { role: 'user', content: 'Generate a random number between 1 and 100' }
    ]
    });
    
    console.log(oai.getContent(response));
}