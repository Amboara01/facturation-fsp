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

export default function ProductRow({ product, onChange, onRemove, canRemove }) {
  return (
    <fieldset className="product-row">
      <legend>Product</legend>
      <label>
        Name
        <input
          type="text"
          value={product.name}
          onChange={(e) => updateField(product, "name", e.target.value, onChange)}
          required
        />
      </label>
      <label>
        Notional amount
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
      <label>
        Notional currency
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
      <label>
        Total upfront fee (% of notional)
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
        {derivedFeeHint(product) && <span className="derived-hint">{derivedFeeHint(product)}</span>}
      </label>
      <label>
        Trade date
        <input
          type="date"
          value={product.tradeDate}
          onChange={(e) => updateField(product, "tradeDate", e.target.value, onChange)}
          required
        />
      </label>
      {canRemove && (
        <button type="button" onClick={onRemove}>
          Remove product
        </button>
      )}
    </fieldset>
  );
}
