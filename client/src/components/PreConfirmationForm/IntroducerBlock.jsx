import CommissionTermInput from "./CommissionTermInput.jsx";

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

export default function IntroducerBlock({ introducer, productsById, onChange, onRemove, canRemove }) {
  return (
    <fieldset className="introducer-block">
      <legend>Introducer</legend>
      <label>
        Name
        <input
          type="text"
          value={introducer.name}
          onChange={(e) => onChange({ ...introducer, name: e.target.value })}
          required
        />
      </label>

      <details>
        <summary>Counterparty fields (optional)</summary>
        <label>
          Contact name
          <input
            type="text"
            value={introducer.counterpartyFields.contactName}
            onChange={(e) => updateCounterpartyField(introducer, "contactName", e.target.value, onChange)}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={introducer.counterpartyFields.email}
            onChange={(e) => updateCounterpartyField(introducer, "email", e.target.value, onChange)}
          />
        </label>
        <label>
          Address
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

      {canRemove && (
        <button type="button" onClick={onRemove}>
          Remove introducer
        </button>
      )}
    </fieldset>
  );
}
