const describers = {
  flatAmount: (params) => `Flat ${params.amount} ${params.currency}`,
  bpsOfNotional: (params) => `${params.bps} bps of notional`,
  shareOfTotalFees: (params) => `${Number(params.sharePercent.toFixed(4))}% of total fees`,
};

export function describeCommissionTerm(type, params) {
  const describe = describers[type];
  if (!describe) {
    throw new Error(`Unknown commission type: "${type}"`);
  }
  return describe(params);
}
