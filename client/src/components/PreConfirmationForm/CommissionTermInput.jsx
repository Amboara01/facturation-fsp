import { COMMISSION_TYPES } from "../../constants/commissionTypes.js";

const DEFAULT_PARAMS = {
  flatAmount: { amount: 0, currency: "EUR" },
  bpsOfNotional: { bps: 0 },
  shareOfTotalFees: { sharePercent: 0 },
};

function updateParam(term, field, value, onChange) {
  onChange({ ...term, params: { ...term.params, [field]: value } });
}

export default function CommissionTermInput({ productName, term, onChange }) {
  function handleTypeChange(type) {
    onChange({ ...term, type, params: DEFAULT_PARAMS[type] });
  }

  return (
    <div className="commission-term-input">
      <span className="product-label">{productName}</span>
      <label>
        Commission type
        <select value={term.type} onChange={(e) => handleTypeChange(e.target.value)}>
          {COMMISSION_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {term.type === "flatAmount" && (
        <>
          <label>
            Amount
            <input
              type="number"
              min="0"
              step="any"
              value={term.params.amount}
              onChange={(e) => updateParam(term, "amount", Number(e.target.value), onChange)}
              required
            />
          </label>
          <label>
            Currency
            <input
              type="text"
              value={term.params.currency}
              onChange={(e) => updateParam(term, "currency", e.target.value.toUpperCase(), onChange)}
              maxLength={3}
              required
            />
          </label>
        </>
      )}

      {term.type === "bpsOfNotional" && (
        <label>
          Bps of notional
          <input
            type="number"
            min="0"
            step="any"
            value={term.params.bps}
            onChange={(e) => updateParam(term, "bps", Number(e.target.value), onChange)}
            required
          />
        </label>
      )}

      {term.type === "shareOfTotalFees" && (
        <label>
          Share of total fees (%)
          <input
            type="number"
            min="0"
            max="100"
            step="any"
            value={term.params.sharePercent}
            onChange={(e) => updateParam(term, "sharePercent", Number(e.target.value), onChange)}
            required
          />
        </label>
      )}
    </div>
  );
}
