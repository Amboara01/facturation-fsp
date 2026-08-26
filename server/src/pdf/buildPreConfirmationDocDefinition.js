const FORBIDDEN_KEYS = new Set([
  "totalUpfrontFeeAmount",
  "totalUpfrontFeeCurrency",
  "totalUpfrontFee",
  "totalUpfrontFeePercent",
  "firmRetainedAmount",
  "firmCut",
]);

function assertNoForbiddenKeys(value, path = "") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenKeys(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, val] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(key)) {
        const location = path ? `${path}.${key}` : key;
        throw new Error(
          `Refusing to build PDF: forbidden key "${key}" found at "${location}". ` +
            "Total upfront fee / firm retained amount must never reach PDF generation."
        );
      }
      assertNoForbiddenKeys(val, path ? `${path}.${key}` : key);
    }
  }
}

const FIXED_ISSUER_BLOCK_LINES = [
  "Issued by: FSP",
  "This document is confidential and prepared solely for the named introducer.",
  "It does not constitute an offer, and commission terms shown are indicative pending final settlement.",
];

function buildIssuerBlock() {
  return {
    stack: FIXED_ISSUER_BLOCK_LINES.map((line) => ({ text: line, fontSize: 9, color: "#555555" })),
    margin: [0, 0, 0, 8],
  };
}

function buildCounterpartyBlock(counterpartyFields) {
  const entries = Object.entries(counterpartyFields || {}).filter(([, value]) => value);
  if (entries.length === 0) {
    return null;
  }
  return {
    stack: [
      { text: "Counterparty", style: "sectionHeader" },
      ...entries.map(([key, value]) => ({ text: `${key}: ${value}`, fontSize: 9 })),
    ],
  };
}

function formatNotional(amount, currency) {
  return `${amount.toLocaleString("en-US")} ${currency}`;
}

function formatAmount(amount, currency) {
  return `${amount.toFixed(2)} ${currency}`;
}

function buildProductCell(product) {
  if (!product.isin) {
    return product.name;
  }
  return {
    stack: [
      { text: product.name },
      { text: product.isin, fontSize: 8, color: "#555555", font: "Mono" },
    ],
  };
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatTradeDate(isoDate) {
  if (!isoDate) {
    return "";
  }
  const [year, month, day] = isoDate.split("-");
  return `${Number(day)} ${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

function buildTotalsRows(products) {
  if (products.length <= 1) {
    return [];
  }
  const totalsByCurrency = new Map();
  for (const product of products) {
    const current = totalsByCurrency.get(product.computedCurrency) || 0;
    totalsByCurrency.set(product.computedCurrency, current + product.computedAmount);
  }
  const currencies = [...totalsByCurrency.keys()];
  return currencies.map((currency) => {
    const label = currencies.length > 1 ? `Total (${currency})` : "Total";
    return [
      { text: label, bold: true, colSpan: 3 },
      {},
      {},
      { text: formatAmount(totalsByCurrency.get(currency), currency), bold: true, font: "Mono" },
    ];
  });
}

// No logo upload exists yet (Phase 2) — the slot stays blank until a caller supplies one.
function buildLogoBlock(logoDataUrl) {
  if (!logoDataUrl) {
    return null;
  }
  return {
    image: "logo",
    width: 120,
    margin: [0, 16, 0, 0],
  };
}

export function buildPreConfirmationDocDefinition(viewModel) {
  assertNoForbiddenKeys(viewModel);

  const { referenceNumber, generatedAt, introducerName, counterpartyFields, products, logoDataUrl } = viewModel;

  const productRows = products.map((product) => [
    buildProductCell(product),
    { text: formatNotional(product.notionalAmount, product.notionalCurrency), font: "Mono" },
    formatTradeDate(product.tradeDate),
    { text: formatAmount(product.computedAmount, product.computedCurrency), font: "Mono" },
  ]);
  const totalsRows = buildTotalsRows(products);

  const content = [
    { text: "Pre-Confirmation", style: "title" },
    { text: `Reference: ${referenceNumber}`, style: "meta" },
    { text: `Date: ${generatedAt}`, style: "meta" },
    { text: "Issuer", style: "sectionHeader" },
    buildIssuerBlock(),
    { text: "Introducer", style: "sectionHeader" },
    { text: introducerName },
    buildCounterpartyBlock(counterpartyFields),
    { text: "Commission Summary", style: "sectionHeader" },
    {
      table: {
        headerRows: 1,
        widths: ["*", "auto", "*", "auto"],
        body: [
          [
            { text: "Product", bold: true },
            { text: "Notional", bold: true },
            { text: "Trade Date", bold: true },
            { text: "Amount", bold: true },
          ],
          ...productRows,
          ...totalsRows,
        ],
      },
    },
    buildLogoBlock(logoDataUrl),
  ].filter(Boolean);

  return {
    defaultStyle: { font: "Helvetica", fontSize: 10 },
    pageMargins: [40, 40, 40, 40],
    // Uncompressed content streams: these are small single-page documents, and staying
    // uncompressed lets a byte-level substring scan (used to test confidentiality) actually
    // mean something instead of trivially passing against opaque compressed bytes.
    compress: false,
    images: logoDataUrl ? { logo: logoDataUrl } : undefined,
    content,
    styles: {
      title: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
      meta: { fontSize: 9, color: "#555555" },
      sectionHeader: { fontSize: 12, bold: true, margin: [0, 12, 0, 4] },
    },
  };
}
