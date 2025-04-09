import { mergeDeep } from '../helpers/utils.js'

export const fimCompletion = ({
  prefix = '',
  suffix = '',
  ...rest
}) => {
  return mergeDeep({
    max_tokens: 512,
    temperature: 0,
    seed: 0,
    frequency_penalty: 1.25,
    prompt: `<|fim_prefix|>${prefix}<|fim_suffix|>${suffix}<|fim_middle|>`
  }, rest);
}

export const standardCompletion = ({
  prompt = '',
  ...rest
}) => {
  return mergeDeep({
    max_tokens: 256,
    temperature: 0.7,
    seed: 0,
    prompt
  }, rest);
}

export const chatCompletion = ({
  messages = [],
  ...rest
}) => {
  return mergeDeep({
    model: 'gpt-3.5-turbo',
    max_tokens: 256,
    temperature: 0.7,
    seed: 0,
    messages
  }, rest);
}