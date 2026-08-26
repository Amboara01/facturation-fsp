import { registerCommissionType, getCommissionCalculator } from "./registry.js";
import { calculate as flatAmount } from "./calculators/flatAmount.js";
import { calculate as bpsOfNotional } from "./calculators/bpsOfNotional.js";
import { calculate as shareOfTotalFees } from "./calculators/shareOfTotalFees.js";

registerCommissionType("flatAmount", flatAmount);
registerCommissionType("bpsOfNotional", bpsOfNotional);
registerCommissionType("shareOfTotalFees", shareOfTotalFees);

export function computeCommission({ type, params, product }) {
  const calculatorFn = getCommissionCalculator(type);
  return calculatorFn(params, product);
}

export { registerCommissionType };
