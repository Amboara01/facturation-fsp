import { roundHalfUpToCents } from "../money.js";

export function calculate(params, product) {
  return {
    amount: roundHalfUpToCents((product.notionalAmount * params.bps) / 10000),
    currency: product.notionalCurrency,
  };
}
