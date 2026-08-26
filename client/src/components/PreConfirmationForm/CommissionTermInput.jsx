import { useState } from "react";
import { COMMISSION_TYPES } from "../../constants/commissionTypes.js";

const DEFAULT_PARAMS = {
  flatAmount: { amount: 0, currency: "EUR" },
  bpsOfNotional: { bps: 0 },
  shareOfTotalFees: { sharePercent: 0 },
};

const EMPTY_FRACTION = { numerator: "", denominator: "" };

function updateParam(term, field, value, onChange) {
  onChange({ ...term, params: { ...term.params, [field]: value } });
}

function computeSharePercent(numerator, denominator) {
  const n = Number(numerator);
  const d = Number(denominator);
  if (!d) {
    return null;
  }
  return (n / d) * 100;
}

export default function CommissionTermInput({ productName, term, onChange }) {
  const [shareEntryMode, setShareEntryMode] = useState("percent");
  const [fraction, setFraction] = useState(EMPTY_FRACTION);

  function handleTypeChange(type) {
    onChange({ ...term, type, params: DEFAULT_PARAMS[type] });
    setShareEntryMode("percent");
    setFraction(EMPTY_FRACTION);
  }

  function handleFractionChange(field, value) {
    const nextFraction = { ...fraction, [field]: value };
    setFraction(nextFraction);
    const sharePercent = computeSharePercent(nextFraction.numerator, nextFraction.denominator);
    if (sharePercent !== null) {
      updateParam(term, "sharePercent", sharePercent, onChange);
    }
  }

  const fractionPreview = computeSharePercent(fraction.numerator, fraction.denominator);

  return (
    <div className="commission-term-row">
      <span className="product-label">{productName}</span>
      <label className="field">
        <span className="field-label">Commission type</span>
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
          <label className="field">
            <span className="field-label">Amount</span>
            <input
              type="number"
              min="0"
              step="any"
              value={term.params.amount}
              onChange={(e) => updateParam(term, "amount", Number(e.target.value), onChange)}
              required
            />
          </label>
          <label className="field field-narrow">
            <span className="field-label">Currency</span>
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
        <label className="field">
          <span className="field-label">Bps of notional</span>
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
        <div className="share-entry">
          <div className="entry-mode-toggle" role="group" aria-label="Share entry mode">
            <button
              type="button"
              className={shareEntryMode === "percent" ? "active" : ""}
              onClick={() => setShareEntryMode("percent")}
            >
              %
            </button>
            <button
              type="button"
              className={shareEntryMode === "fraction" ? "active" : ""}
              onClick={() => setShareEntryMode("fraction")}
            >
              Fraction
            </button>
          </div>

          {shareEntryMode === "percent" ? (
            <label className="field">
              <span className="field-label">Share of total fees (%)</span>
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
          ) : (
            <div className="fraction-entry">
              <label className="field field-narrow">
                <span className="field-label">Numerator</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={fraction.numerator}
                  onChange={(e) => handleFractionChange("numerator", e.target.value)}
                />
              </label>
              <span className="fraction-slash" aria-hidden="true">
                /
              </span>
              <label className="field field-narrow">
                <span className="field-label">Denominator</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={fraction.denominator}
                  onChange={(e) => handleFractionChange("denominator", e.target.value)}
                />
              </label>
              {fractionPreview !== null ? (
                <span className="derived-hint mono">≈ {fractionPreview.toFixed(6)}%</span>
              ) : (
                <span className="derived-hint field-warning">Enter a denominator greater than 0</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
