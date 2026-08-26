import { roundHalfUpToCents } from "../money.js";

export function calculate(params) {
  return {
    amount: roundHalfUpToCents(params.amount),
    currency: params.currency,
  };
}
