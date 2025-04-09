/**
 * K6 runs a custom JS engine
 * that is not Node.js, so we can't really
 * use arbitrary external modules. Hence these utils.
 */

export function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item) && item !== null);
}

export const alphabet = 'qwertyuioplkjhgfdsamnbvcxz'.split('');

/**
 * Deep merge two objects.
 * @param target
 * @param source
 */
export function mergeDeep(target, source) {
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    });
  }
  return target;
}

/**
 * Returns a parsed number for a given environment variable value,
 * if not available returns a provided default value.
 */
export function envNumber(key, defaultValue) {
  if (__ENV[key]) {
    const maybeValue = Number(__ENV[key])
    return Number.isNaN(maybeValue) ? defaultValue : maybeValue;
  }

  return defaultValue;
}

/**
 * Random integer between from and to,
 * if "to" is undefined, from 0 to "from"
 */
export const random = (from, to) => {
  if (!to) {
    to = from;
    from = 0;
  }

  return Math.round(
    from + (to - from) * Math.random(),
  );
};

/**
 * Returns a random element of a given array
 */
export const any = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Returns true or false with given "probability"
 */
export const maybe = (probability = 0.5) => {
  if (Math.random() < probability) {
    return true;
  }

  return false;
}

/**
 * Returns a random sample from a given array
 *
 * @param {*[]} arr
 * @param {Number} count
 * @returns {*[]}
 */
export const sample = (arr, count = 1) => {
  const selection = [];
  let restItems = arr;

  while (count > 0) {
    const nextItem = any(restItems);

    selection.push(nextItem);
    restItems = restItems.filter((item) => item !== nextItem);
    count--;
  }

  return selection;
};

/**
 * Take scenarios and arrange them to run one by one
 */
export function sequenceScenarios(scenarios, duration) {
  return Object.fromEntries(
    Object.entries(scenarios).map(([scenario, config], i) => {
      return [scenario, {
        ...config,
        duration: `${duration}s`,
        startTime: `${i * duration}s`,
      }];
    }),
  );
}