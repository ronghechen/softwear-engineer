import { useEffect, useState } from "react";
import {
  getOutfits,
  filterOutfits,
  searchOutfits,
  getAnalytics,
} from "../services/api";
import SearchBar from "../components/SearchBar";
import FilterBar from "../components/FilterBar";
import OutfitCard from "../components/OutfitCard";

export default function GalleryPage() {
  const [outfits, setOutfits] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadOutfits() {
    try {
      const data = await getOutfits();
      setOutfits(data.outfits || []);
    } catch (err) {
      console.error("Failed to load outfits:", err);
    }
  }

  async function loadAnalytics() {
    try {
      const data = await getAnalytics();
      if (data.message === "success") {
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
    }
  }

  async function refreshPageData() {
    setLoading(true);
    await Promise.all([loadOutfits(), loadAnalytics()]);
    setLoading(false);
  }

  useEffect(() => {
    refreshPageData();
  }, []);

  async function handleSearch(query) {
    try {
      setLoading(true);

      if (!query.trim()) {
        await refreshPageData();
        return;
      }

      const data = await searchOutfits(query);
      setOutfits(data.outfits || []);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleFilter(filters) {
    try {
      setLoading(true);

      const hasFilters = Object.values(filters).some(
        (value) => value.trim() !== ""
      );

      if (!hasFilters) {
        await refreshPageData();
        return;
      }

      const data = await filterOutfits(filters);
      setOutfits(data.outfits || []);
    } catch (err) {
      console.error("Filter failed:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gallery-page">
      <div className="gallery-title-row">
        <h1 className="gallery-brand-title">softwear.engineer 💻</h1>
      </div>
      <div className="gallery-controls-row">
        <FilterBar onFilter={handleFilter} onReset={refreshPageData} />
      </div>

      {analytics && (
        <section className="analytics-panel">
          <h2 className="analytics-title">Closet Analytics</h2>

          <div className="analytics-grid">
            <div className="analytics-card">
              <p className="analytics-label">Total outfits</p>
              <p className="analytics-value">{analytics.total_outfits}</p>
            </div>

            <div className="analytics-card">
              <p className="analytics-label">Top color</p>
              <p className="analytics-value">
                {analytics.most_common_color?.value || "—"}
              </p>
              <p className="analytics-subvalue">
                {analytics.most_common_color?.count || 0} outfits
              </p>
            </div>

            <div className="analytics-card">
              <p className="analytics-label">Top vibe</p>
              <p className="analytics-value">
                {analytics.most_common_vibe?.value || "—"}
              </p>
              <p className="analytics-subvalue">
                {analytics.most_common_vibe?.count || 0} outfits
              </p>
            </div>

            <div className="analytics-card">
              <p className="analytics-label">Top season</p>
              <p className="analytics-value">
                {analytics.most_common_season?.value || "—"}
              </p>
              <p className="analytics-subvalue">
                {analytics.most_common_season?.count || 0} outfits
              </p>
            </div>

            <div className="analytics-card">
              <p className="analytics-label">Top occasion</p>
              <p className="analytics-value">
                {analytics.most_common_occasion?.value || "—"}
              </p>
              <p className="analytics-subvalue">
                {analytics.most_common_occasion?.count || 0} outfits
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="gallery-content">
        {loading ? (
          <p className="gallery-status-text">Loading your outfits...</p>
        ) : outfits.length === 0 ? (
          <p className="gallery-status-text">No outfits found.</p>
        ) : (
          <div className="gallery-grid">
            {outfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                onUpdated={refreshPageData}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}