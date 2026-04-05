import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const limit = 12;

  const [mode, setMode] = useState("all"); // "all" | "search" | "filter"
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [activeFilters, setActiveFilters] = useState({
    occasion: "",
    vibe: "",
    season: "",
    color: "",
  });

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

  async function loadOutfits() {
    try {
      setLoading(true);

      let data;

      if (mode === "search" && searchQuery.trim()) {
        data = await searchOutfits(searchQuery, page, limit);
      } else if (
        mode === "filter" &&
        Object.values(activeFilters).some((value) => value.trim() !== "")
      ) {
        data = await filterOutfits(activeFilters, page, limit);
      } else {
        data = await getOutfits(page, limit);
      }

      setOutfits(data.outfits || []);
      setPagination(data.pagination || null);
    } catch (err) {
      console.error("Failed to load outfits:", err);
      setOutfits([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }

  async function refreshPageData() {
    setMode("all");
    setSearchQuery("");
    setActiveFilters({
      occasion: "",
      vibe: "",
      season: "",
      color: "",
    });
    setPage(1);

    try {
      setLoading(true);
      const [outfitsData, analyticsData] = await Promise.all([
        getOutfits(1, limit),
        getAnalytics(),
      ]);

      setOutfits(outfitsData.outfits || []);
      setPagination(outfitsData.pagination || null);

      if (analyticsData.message === "success") {
        setAnalytics(analyticsData);
      }
    } catch (err) {
      console.error("Failed to refresh page data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const qFromUrl = searchParams.get("q") || "";
    setSearchQuery(qFromUrl);
    setMode(qFromUrl.trim() ? "search" : "all");
    setPage(1);
  }, [searchParams]);
  
  useEffect(() => {
    loadAnalytics();
  }, []);

  useEffect(() => {
    loadOutfits();
  }, [page, mode, searchQuery, activeFilters]);

  async function handleSearch(query) {
    const trimmed = query.trim();

    setSearchQuery(trimmed);
    setMode(trimmed ? "search" : "all");
    setPage(1);

    if (trimmed) {
      setSearchParams({ q: trimmed });
    } else {
      setSearchParams({});
    }
}

  async function handleFilter(filters) {
    const hasFilters = Object.values(filters).some(
      (value) => value.trim() !== ""
    );

    setActiveFilters(filters);
    setMode(hasFilters ? "filter" : "all");
    setPage(1);
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
          <>
            <div className="gallery-grid">
              {outfits.map((outfit) => (
                <OutfitCard
                  key={outfit.id}
                  outfit={outfit}
                  onUpdated={refreshPageData}
                />
              ))}
            </div>

            {pagination?.totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                >
                  ← Previous
                </button>

                <span>
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <button
                  onClick={() =>
                    setPage((prev) =>
                      Math.min(prev + 1, pagination.totalPages)
                    )
                  }
                  disabled={page === pagination.totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}