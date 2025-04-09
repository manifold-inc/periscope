import { mergeDeep } from '../helpers/utils.js';

export const singleTextEmbedding = ({
  input = '',
  ...rest
}) => {
  return mergeDeep({
    input,
    model: 'text-embedding-3-small',
  }, rest);
};

export const multiTextEmbedding = ({
  inputs = [],
  ...rest
}) => {
  return mergeDeep({
    input: inputs,
    model: 'text-embedding-3-small',
  }, rest);
};