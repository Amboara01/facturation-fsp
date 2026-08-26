import { roundHalfUpToCents } from "../money.js";

export function calculate(params, product) {
  const totalUpfrontFeeAmount = roundHalfUpToCents(
    (product.notionalAmount * product.totalUpfrontFeePercent) / 100
  );
  return {
    amount: roundHalfUpToCents((totalUpfrontFeeAmount * params.sharePercent) / 100),
    currency: product.notionalCurrency,
  };
}
