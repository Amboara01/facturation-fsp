function updateField(product, field, value, onChange) {
  onChange({ ...product, [field]: value });
}

function derivedFeeHint(product) {
  const { notionalAmount, notionalCurrency, totalUpfrontFeePercent } = product;
  if (!notionalAmount || !totalUpfrontFeePercent) {
    return null;
  }
  const amount = (notionalAmount * totalUpfrontFeePercent) / 100;
  return `≈ ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${notionalCurrency}`;
}

// issuer/underlyings have no submitted form field — this is read-only context carried on the
// product object from a term sheet upload, dropped automatically at submit time since
// PreConfirmationForm's sanitizedProducts mapping only picks the fields it actually sends.
function extractedInfoLine(product) {
  const info = product.extractedInfo;
  if (!info) {
    return null;
  }
  const parts = [];
  if (info.issuer) {
    parts.push(`Issuer: ${info.issuer}`);
  }
  if (info.underlyings?.length > 0) {
    parts.push(`Underlyings: ${info.underlyings.join(", ")}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export default function ProductRow({ product, index, onChange, onRemove, canRemove }) {
  return (
    <div className="card product-card">
      <div className="card-header">
        <h3>Product {index}</h3>
        {canRemove && (
          <button type="button" className="btn btn-ghost" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>

      <div className="card-body">
        <div className="field-row">
          <label className="field">
            <span className="field-label">
              Name<span className="req">*</span>
            </span>
            <input
              type="text"
              value={product.name}
              onChange={(e) => updateField(product, "name", e.target.value, onChange)}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">ISIN</span>
            <input
              type="text"
              value={product.isin}
              onChange={(e) => updateField(product, "isin", e.target.value.toUpperCase(), onChange)}
              maxLength={12}
              placeholder="e.g. FR0013479930"
            />
          </label>
        </div>

        {extractedInfoLine(product) && (
          <p className="derived-hint">{extractedInfoLine(product)}</p>
        )}

        <div className="field-row">
          <label className="field">
            <span className="field-label">
              Notional amount<span className="req">*</span>
            </span>
            <input
              type="number"
              min="0"
              step="any"
              value={product.notionalAmount}
              onChange={(e) =>
                updateField(product, "notionalAmount", Number(e.target.value), onChange)
              }
              required
            />
          </label>
          <label className="field field-narrow">
            <span className="field-label">
              Currency<span className="req">*</span>
            </span>
            <input
              type="text"
              value={product.notionalCurrency}
              onChange={(e) =>
                updateField(product, "notionalCurrency", e.target.value.toUpperCase(), onChange)
              }
              maxLength={3}
              required
            />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span className="field-label">
              Total upfront fee (% of notional)<span className="req">*</span>
            </span>
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={product.totalUpfrontFeePercent}
              onChange={(e) =>
                updateField(product, "totalUpfrontFeePercent", Number(e.target.value), onChange)
              }
              required
            />
            {derivedFeeHint(product) && (
              <span className="derived-hint mono">{derivedFeeHint(product)}</span>
            )}
          </label>
          <label className="field">
            <span className="field-label">
              Trade date<span className="req">*</span>
            </span>
            <input
              type="date"
              value={product.tradeDate}
              onChange={(e) => updateField(product, "tradeDate", e.target.value, onChange)}
              required
            />
          </label>
        </div>
      </div>
    </div>
  );
}
