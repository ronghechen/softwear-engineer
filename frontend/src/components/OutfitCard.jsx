import { useState } from "react";
import {
  updateOutfit,
  deleteOutfit,
  getRecommendations,
} from "../services/api";

export default function OutfitCard({ outfit, onUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [recommendations, setRecommendations] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false);

  const [formData, setFormData] = useState({
    occasion: outfit.occasion || "",
    vibe: outfit.vibe || "",
    season: outfit.season || "",
    color: outfit.color || "",
    notes: outfit.notes || "",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSave() {
    try {
      setIsSaving(true);

      const result = await updateOutfit(outfit.id, formData);

      if (result.message === "success") {
        setIsEditing(false);
        if (onUpdated) onUpdated();
      } else {
        alert(result.message || "Failed to update outfit.");
      }
    } catch (err) {
      console.error("Update failed:", err);
      alert("Failed to update outfit.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    const confirmDelete = window.confirm("Delete this outfit?");
    if (!confirmDelete) return;

    try {
      setIsDeleting(true);
      const result = await deleteOutfit(outfit.id);

      if (result.message === "success") {
        if (onUpdated) onUpdated();
      } else {
        alert(result.message || "Delete failed");
      }
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleToggleRecommendations() {
    if (showRecommendations) {
      setShowRecommendations(false);
      return;
    }

    try {
      setIsLoadingRecommendations(true);
      const result = await getRecommendations(outfit.id);
      setRecommendations(result.recommendations || []);
      setShowRecommendations(true);
    } catch (err) {
      console.error("Failed to load recommendations:", err);
      alert("Failed to load similar outfits.");
    } finally {
      setIsLoadingRecommendations(false);
    }
  }

  function handleCancel() {
    setFormData({
      occasion: outfit.occasion || "",
      vibe: outfit.vibe || "",
      season: outfit.season || "",
      color: outfit.color || "",
      notes: outfit.notes || "",
    });
    setIsEditing(false);
  }

  const displayImage = outfit.thumbnail_url || outfit.image_url;

  return (
    <div className="outfit-card">
      <img src={displayImage} alt="Outfit" className="outfit-image" />

      {!isEditing ? (
        <>
          <div className="outfit-details">
            <p><span>occasion:</span> {outfit.occasion}</p>
            <p><span>vibe:</span> {outfit.vibe}</p>
            <p><span>season:</span> {outfit.season}</p>
            <p><span>color:</span> {outfit.color || outfit.detected_color || "unknown"}</p>
            <p><span>notes:</span> {outfit.notes || "none"}</p>
          </div>

          <div className="card-button-row">
            <button
              className="glow-button card-edit-button"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </button>

            <button
              className="glow-button glow-button-secondary card-edit-button"
              onClick={handleToggleRecommendations}
              disabled={isLoadingRecommendations}
              type="button"
            >
              {isLoadingRecommendations
                ? "Loading..."
                : showRecommendations
                ? "Hide Similar"
                : "Show Similar"}
            </button>

            <button
              className="delete-button card-edit-button"
              onClick={handleDelete}
              disabled={isDeleting}
              type="button"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>

          {showRecommendations && (
            <div className="recommendations-section">
              <p className="recommendations-title">Similar outfits</p>

              {recommendations.length === 0 ? (
                <p className="recommendations-empty">No recommendations found yet.</p>
              ) : (
                <div className="recommendations-grid">
                  {recommendations.map((rec) => (
                    <div key={rec.id} className="recommendation-card">
                      <img
                        src={rec.thumbnail_url || rec.image_url}
                        alt="Recommended outfit"
                        className="recommendation-image"
                      />
                      <div className="recommendation-details">
                        <p><span>vibe:</span> {rec.vibe}</p>
                        <p><span>season:</span> {rec.season}</p>
                        <p><span>color:</span> {rec.color || rec.deteched_color || "unknown"}</p>
                        <p><span>score:</span> {rec.recommendation_score}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="edit-form">
          <input
            className="edit-input"
            name="occasion"
            value={formData.occasion}
            onChange={handleChange}
            placeholder="Occasion"
          />
          <input
            className="edit-input"
            name="vibe"
            value={formData.vibe}
            onChange={handleChange}
            placeholder="Vibe"
          />
          <input
            className="edit-input"
            name="season"
            value={formData.season}
            onChange={handleChange}
            placeholder="Season"
          />
          <input
            className="edit-input"
            name="color"
            value={formData.color}
            onChange={handleChange}
            placeholder="Color"
          />
          <textarea
            className="edit-textarea"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Notes"
            rows="3"
          />

          <div className="card-button-row">
            <button
              className="glow-button card-edit-button"
              onClick={handleSave}
              disabled={isSaving}
              type="button"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>

            <button
              className="glow-button glow-button-secondary card-edit-button"
              onClick={handleCancel}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}