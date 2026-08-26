import { useEffect, useState } from "react";
import { listPreConfirmations } from "../../api/preConfirmations.js";

export default function HistoryList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listPreConfirmations()
      .then((data) => setItems(data.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="empty-state">Loading…</p>;
  }

  if (error) {
    return (
      <p className="empty-state result-error" role="alert">
        Failed to load history: {error}
      </p>
    );
  }

  if (items.length === 0) {
    return <p className="empty-state">No pre-confirmations generated yet.</p>;
  }

  return (
    <div className="table-scroll">
      <table className="history-list">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Introducer</th>
            <th>Generated at</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="mono">{item.referenceNumber}</td>
              <td>{item.introducerName}</td>
              <td className="mono">{new Date(item.generatedAt).toLocaleString()}</td>
              <td>
                <a className="btn btn-outline btn-small" href={item.pdfUrl} target="_blank" rel="noreferrer">
                  Open PDF
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
