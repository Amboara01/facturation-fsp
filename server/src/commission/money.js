export function roundHalfUpToCents(amount) {
  const sign = amount < 0 ? -1 : 1;
  const shifted = Math.abs(amount) * 100 + 1e-9;
  return (sign * Math.round(shifted)) / 100;
}

export function formatMoney(amount, currency) {
  return `${roundHalfUpToCents(amount).toFixed(2)} ${currency}`;
}
