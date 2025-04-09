import { check } from "k6";
import { Trend } from "k6/metrics";
import http from "k6/http";
import { mergeDeep } from './utils.js';

const graphqlTrends = {
  entities: new Trend('graphql_entities'),
  errors: new Trend('graphql_errors'),
};

export function get(url, params) {
  const response = http.get(url, params);
  check(response, {
    "status is 200": (r) => r.status === 200,
  });

  if (__ENV.NETWORK_DEBUG === 'true') {
    console.log('===============');
    console.log('HTTP:', url, response.status, response.status_text);
    console.log('===============');
  }

  return response;
}

export function getRequest(url, params) {
  return {
    method: 'GET',
    url,
    params,
  };
}

export function post(url, body, params) {
  if (typeof body !== 'string') {
    body = JSON.stringify(body);
  }

  const response = http.post(url, body, params);
  check(response, {
    "status is 200": (r) => r.status === 200,
  });
  return response;
}

export function postRequest(url, body, params) {
  return {
    method: 'POST',
    url,
    body,
    params,
  };
}

/**
 * Tries to parse the body as JSON and logs an error if it fails to do so.
 * Useful when you may occasionally receive non-JSON responses (for example 502/3/4 from ALB).
 */
export function getBody(response) {
  try {
    return response.json();
  } catch(e) {
    const maybeBody = ((response && response.body) || '');
    const maybePreview = maybeBody.slice(0, 500);

    console.error(`Not a JSON:\n${maybePreview}\nStatus: ${response.status}\nHeaders: ${JSON.stringify(response.headers)}}`);
  }
}