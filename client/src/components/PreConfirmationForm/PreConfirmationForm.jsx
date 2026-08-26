import { useState } from "react";
import ProductRow from "./ProductRow.jsx";
import IntroducerBlock from "./IntroducerBlock.jsx";
import { createPreConfirmation } from "../../api/preConfirmations.js";

function makeId() {
  return crypto.randomUUID();
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function defaultProduct() {
  return {
    id: makeId(),
    name: "",
    notionalAmount: 0,
    notionalCurrency: "EUR",
    totalUpfrontFeePercent: 0,
    tradeDate: todayIsoDate(),
  };
}

function defaultTermForProduct(productId) {
  return { productId, type: "flatAmount", params: { amount: 0, currency: "EUR" } };
}

function defaultIntroducer(products) {
  return {
    localId: makeId(),
    name: "",
    counterpartyFields: { contactName: "", email: "", address: "" },
    commissionTerms: products.map((product) => defaultTermForProduct(product.id)),
  };
}

function sanitizeCounterpartyFields(fields) {
  const entries = Object.entries(fields).filter(([, value]) => value?.trim());
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export default function PreConfirmationForm() {
  const [products, setProducts] = useState(() => [defaultProduct()]);
  const [introducers, setIntroducers] = useState(() => [defaultIntroducer(products)]);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState([]);

  const productsById = new Map(products.map((product) => [product.id, product]));

  function addProduct() {
    const product = defaultProduct();
    setProducts([...products, product]);
    setIntroducers(
      introducers.map((introducer) => ({
        ...introducer,
        commissionTerms: [...introducer.commissionTerms, defaultTermForProduct(product.id)],
      }))
    );
  }

  function removeProduct(id) {
    setProducts(products.filter((product) => product.id !== id));
    setIntroducers(
      introducers.map((introducer) => ({
        ...introducer,
        commissionTerms: introducer.commissionTerms.filter((term) => term.productId !== id),
      }))
    );
  }

  function updateProduct(updated) {
    setProducts(products.map((product) => (product.id === updated.id ? updated : product)));
  }

  function addIntroducer() {
    setIntroducers([...introducers, defaultIntroducer(products)]);
  }

  function removeIntroducer(localId) {
    setIntroducers(introducers.filter((introducer) => introducer.localId !== localId));
  }

  function updateIntroducer(updated) {
    setIntroducers(
      introducers.map((introducer) => (introducer.localId === updated.localId ? updated : introducer))
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setResults([]);

    const sanitizedProducts = products.map(({ id, name, notionalAmount, notionalCurrency, totalUpfrontFeePercent, tradeDate }) => ({
      id,
      name,
      notionalAmount,
      notionalCurrency,
      totalUpfrontFeePercent,
      tradeDate,
    }));

    const collectedResults = [];
    for (const introducer of introducers) {
      try {
        // One request per introducer, sequential — the server never sees more than
        // one introducer's data in a single call.
        const created = await createPreConfirmation({
          products: sanitizedProducts,
          introducer: {
            name: introducer.name,
            counterpartyFields: sanitizeCounterpartyFields(introducer.counterpartyFields),
            commissionTerms: introducer.commissionTerms.map(({ productId, type, params }) => ({
              productId,
              type,
              params,
            })),
          },
        });
        collectedResults.push({ status: "success", introducerName: introducer.name, ...created });
      } catch (error) {
        collectedResults.push({
          status: "error",
          introducerName: introducer.name,
          error: error.message,
        });
      }
      setResults([...collectedResults]);
    }

    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="preconfirmation-form">
      <section className="form-section">
        <h2>Products</h2>
        <div className="card-stack">
          {products.map((product, i) => (
            <ProductRow
              key={product.id}
              product={product}
              index={i + 1}
              onChange={updateProduct}
              onRemove={() => removeProduct(product.id)}
              canRemove={products.length > 1}
            />
          ))}
        </div>
        <button type="button" className="btn btn-outline" onClick={addProduct}>
          + Add product
        </button>
      </section>

      <section className="form-section">
        <h2>Introducers</h2>
        <div className="card-stack">
          {introducers.map((introducer, i) => (
            <IntroducerBlock
              key={introducer.localId}
              introducer={introducer}
              index={i + 1}
              productsById={productsById}
              onChange={updateIntroducer}
              onRemove={() => removeIntroducer(introducer.localId)}
              canRemove={introducers.length > 1}
            />
          ))}
        </div>
        <button type="button" className="btn btn-outline" onClick={addIntroducer}>
          + Add introducer
        </button>
      </section>

      <div className="submit-row">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Generating…" : "Generate pre-confirmation(s)"}
        </button>
      </div>

      {results.length > 0 && (
        <ul className="results">
          {results.map((result) => (
            <li
              key={result.introducerName + result.status}
              className={result.status === "success" ? "result-success" : "result-error"}
            >
              {result.status === "success" ? (
                <>
                  <strong>{result.introducerName}</strong>
                  <span className="mono">{result.referenceNumber}</span>
                  <a href={result.pdfUrl} target="_blank" rel="noreferrer">
                    Open PDF
                  </a>
                </>
              ) : (
                <>
                  <strong>{result.introducerName}</strong>
                  <span>failed — {result.error}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
