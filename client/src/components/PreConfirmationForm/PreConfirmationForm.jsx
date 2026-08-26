import { useState } from "react";
import ProductRow from "./ProductRow.jsx";
import IntroducerBlock from "./IntroducerBlock.jsx";
import TermSheetUpload from "./TermSheetUpload.jsx";
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
    isin: "",
    notionalAmount: 0,
    notionalCurrency: "EUR",
    totalUpfrontFeePercent: 0,
    tradeDate: todayIsoDate(),
  };
}

function defaultTermForProduct(productId) {
  return { productId, type: "flatAmount", params: { amount: 0, currency: "EUR" } };
}

// True only when none of the fields an operator would actually type have been touched yet —
// notionalCurrency ("EUR") and tradeDate (today) are left out on purpose: both are plausible
// values someone genuinely wants, not placeholder blanks, so they don't count as "untouched."
function isProductBlank(product) {
  return !product.name && !product.isin && !product.notionalAmount && !product.totalUpfrontFeePercent;
}

// Starts from baseProduct (defaults to a fresh defaultProduct()) with whatever the extraction
// actually found overlaid on top. Passing an existing product as baseProduct reuses its id,
// turning this into an in-place update instead of a new row. notionalAmount/notionalCurrency
// are never touched here — the server never returns them, so every extracted row still needs
// the operator to type its notional by hand, same as a manually-added one.
function buildProductFromExtraction(extracted, baseProduct = defaultProduct()) {
  const product = { ...baseProduct };
  if (extracted.name) {
    product.name = extracted.name;
  }
  if (extracted.isin) {
    product.isin = extracted.isin;
  }
  if (extracted.tradeDate) {
    product.tradeDate = extracted.tradeDate;
  }
  if (extracted.totalUpfrontFeePercent != null) {
    product.totalUpfrontFeePercent = extracted.totalUpfrontFeePercent;
  }
  if (extracted.issuer || extracted.underlyings?.length > 0) {
    product.extractedInfo = { issuer: extracted.issuer, underlyings: extracted.underlyings };
  }
  return product;
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

  // Shared by both ways of adding products — one manual row, or one-to-many rows from a term
  // sheet upload — so every introducer's commissionTerms always stays in sync with the product
  // list regardless of which path added to it.
  function appendProducts(newProducts) {
    setProducts([...products, ...newProducts]);
    setIntroducers(
      introducers.map((introducer) => ({
        ...introducer,
        commissionTerms: [
          ...introducer.commissionTerms,
          ...newProducts.map((product) => defaultTermForProduct(product.id)),
        ],
      }))
    );
  }

  function addProduct() {
    appendProducts([defaultProduct()]);
  }

  function handleExtractedProducts(extractedProducts) {
    if (extractedProducts.length === 0) {
      return;
    }

    // If the form is still showing nothing but the untouched starting row, the first extracted
    // product populates that row in place rather than leaving a dangling empty card alongside
    // the new ones. Every product after the first is always a new row — only ever one row gets
    // this treatment, never "whichever rows happen to be blank." Deliberately NOT built as
    // "updateProduct(...) then appendProducts(...)" — two setState-triggering calls in the same
    // handler would each read the same stale `products` closure snapshot, so the second call
    // would silently discard the first's update. One products array, one introducers array,
    // one pair of setState calls.
    const populateInPlace = products.length === 1 && isProductBlank(products[0]);
    const [first, ...rest] = extractedProducts;
    const newRows = (populateInPlace ? rest : extractedProducts).map((product) =>
      buildProductFromExtraction(product)
    );
    const nextProducts = populateInPlace
      ? [buildProductFromExtraction(first, products[0]), ...newRows]
      : [...products, ...newRows];

    setProducts(nextProducts);
    setIntroducers(
      introducers.map((introducer) => ({
        ...introducer,
        commissionTerms: [
          ...introducer.commissionTerms,
          ...newRows.map((product) => defaultTermForProduct(product.id)),
        ],
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

    const sanitizedProducts = products.map(({ id, name, isin, notionalAmount, notionalCurrency, totalUpfrontFeePercent, tradeDate }) => ({
      id,
      name,
      isin,
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
        <div className="product-actions">
          <button type="button" className="btn btn-outline" onClick={addProduct}>
            + Add product
          </button>
          <TermSheetUpload onExtracted={handleExtractedProducts} />
        </div>
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
