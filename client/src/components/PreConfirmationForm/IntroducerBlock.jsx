import CommissionTermInput from "./CommissionTermInput.jsx";
import LogoUpload from "./LogoUpload.jsx";

function updateCounterpartyField(introducer, field, value, onChange) {
  onChange({
    ...introducer,
    counterpartyFields: { ...introducer.counterpartyFields, [field]: value },
  });
}

function updateTerm(introducer, productId, updatedTerm, onChange) {
  onChange({
    ...introducer,
    commissionTerms: introducer.commissionTerms.map((term) =>
      term.productId === productId ? updatedTerm : term
    ),
  });
}

export default function IntroducerBlock({ introducer, index, productsById, onChange, onRemove, canRemove }) {
  return (
    <div className="card introducer-card">
      <div className="card-header">
        <h3>Introducer {index}</h3>
        {canRemove && (
          <button type="button" className="btn btn-ghost" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>

      <div className="card-body">
        <label className="field field-full">
          <span className="field-label">
            Name<span className="req">*</span>
          </span>
          <input
            type="text"
            value={introducer.name}
            onChange={(e) => onChange({ ...introducer, name: e.target.value })}
            required
          />
        </label>

        <div className="field">
          <span className="field-label">Logo (optional)</span>
          <LogoUpload
            value={introducer.logoDataUrl}
            onChange={(logoDataUrl) => onChange({ ...introducer, logoDataUrl })}
          />
        </div>

        <details className="counterparty-details">
          <summary>Counterparty fields (optional)</summary>
          <div className="field-row">
            <label className="field">
              <span className="field-label">Contact name</span>
              <input
                type="text"
                value={introducer.counterpartyFields.contactName}
                onChange={(e) => updateCounterpartyField(introducer, "contactName", e.target.value, onChange)}
              />
            </label>
            <label className="field">
              <span className="field-label">Email</span>
              <input
                type="email"
                value={introducer.counterpartyFields.email}
                onChange={(e) => updateCounterpartyField(introducer, "email", e.target.value, onChange)}
              />
            </label>
          </div>
          <label className="field field-full">
            <span className="field-label">Address</span>
            <input
              type="text"
              value={introducer.counterpartyFields.address}
              onChange={(e) => updateCounterpartyField(introducer, "address", e.target.value, onChange)}
            />
          </label>
        </details>

        <div className="commission-terms">
          <h4>Commission terms</h4>
          {introducer.commissionTerms.map((term) => (
            <CommissionTermInput
              key={term.productId}
              productName={productsById.get(term.productId)?.name || "Product"}
              term={term}
              onChange={(updatedTerm) => updateTerm(introducer, term.productId, updatedTerm, onChange)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
