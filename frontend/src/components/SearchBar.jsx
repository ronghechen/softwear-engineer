import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();

    if (onSearch) {
      onSearch(query);
    } else {
      navigate(`/?q=${encodeURIComponent(query)}`);
    }
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="search-shell">
        <input
          className="search-input"
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="search-icon-button" type="submit" aria-label="Search">
          ⌕
        </button>
      </div>
    </form>
  );
}