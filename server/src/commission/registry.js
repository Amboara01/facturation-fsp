const calculators = new Map();

export function registerCommissionType(key, calculatorFn) {
  calculators.set(key, calculatorFn);
}

export function getCommissionCalculator(key) {
  const calculatorFn = calculators.get(key);
  if (!calculatorFn) {
    throw new Error(`Unknown commission type: "${key}"`);
  }
  return calculatorFn;
}
