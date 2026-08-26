import { useState } from "react";
import PreConfirmationForm from "./components/PreConfirmationForm/PreConfirmationForm.jsx";
import HistoryList from "./components/HistoryList/HistoryList.jsx";
import "./App.css";

export default function App() {
  const [view, setView] = useState("form");

  return (
    <div className="app">
      <header className="app-header">
        <h1>Commission Pre-Confirmations</h1>
        <nav className="tabs">
          <button
            type="button"
            className={view === "form" ? "active" : ""}
            onClick={() => setView("form")}
          >
            New pre-confirmation
          </button>
          <button
            type="button"
            className={view === "history" ? "active" : ""}
            onClick={() => setView("history")}
          >
            History
          </button>
        </nav>
      </header>

      {view === "form" ? <PreConfirmationForm /> : <HistoryList />}
    </div>
  );
}
