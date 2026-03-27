import { useState } from "react";

export default function FilterBar({ onFilter, onReset }) {
  const [filters, setFilters] = useState({
    occasion: "",
    vibe: "",
    season: "",
    color: "",
  });

  function handleChange(e) {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const cleaned = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value.trim() !== "")
    );
    onFilter(cleaned);
  }

  function handleReset() {
    setFilters({
      occasion: "",
      vibe: "",
      season: "",
      color: "",
    });
    onReset();
  }

  return (
    <form className="filter-form" onSubmit={handleSubmit}>
      <input
        className="filter-input"
        name="occasion"
        placeholder="Occasion"
        value={filters.occasion}
        onChange={handleChange}
      />
      <input
        className="filter-input"
        name="vibe"
        placeholder="Vibe"
        value={filters.vibe}
        onChange={handleChange}
      />
      <input
        className="filter-input"
        name="season"
        placeholder="Season"
        value={filters.season}
        onChange={handleChange}
      />
      <input
        className="filter-input"
        name="color"
        placeholder="Color / Detected Color"
        value={filters.color}
        onChange={handleChange}
        />

      <button className="filter-action-button primary" type="submit">
        Filter
      </button>
      <button
        className="filter-action-button secondary"
        type="button"
        onClick={handleReset}
      >
        Reset
      </button>
    </form>
  );
}