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
    return <p>Loading...</p>;
  }

  if (error) {
    return <p role="alert">Failed to load history: {error}</p>;
  }

  if (items.length === 0) {
    return <p>No pre-confirmations generated yet.</p>;
  }

  return (
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
            <td>{item.referenceNumber}</td>
            <td>{item.introducerName}</td>
            <td>{new Date(item.generatedAt).toLocaleString()}</td>
            <td>
              <a href={item.pdfUrl} target="_blank" rel="noreferrer">
                Open PDF
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
