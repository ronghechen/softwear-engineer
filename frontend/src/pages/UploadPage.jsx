import { useState } from "react";
import { uploadOutfit } from "../services/api";
import { fileToBase64 } from "../utils/fileToBase64";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    occasion: "",
    vibe: "",
    season: "",
    color: "",
    notes: "",
  });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleFileChange(e) {
    const selectedFile = e.target.files[0];
    setFile(selectedFile || null);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!file) {
      setMessage("Please choose an image first.");
      setIsError(true);
      return;
    }

    if (
      !formData.occasion.trim() ||
      !formData.vibe.trim() ||
      !formData.season.trim()
    ) {
      setMessage("Please fill out occasion, vibe, and season.");
      setIsError(true);
      return;
    }

    try {
      setIsUploading(true);
      setMessage("");
      setIsError(false);

      const base64 = await fileToBase64(file);

      const result = await uploadOutfit({
        local_filename: file.name,
        data: base64,
        occasion: formData.occasion,
        vibe: formData.vibe,
        season: formData.season,
        color: formData.color,
        notes: formData.notes,
      });

      if (result.outfitid && result.outfitid !== -1) {
        const detectedColorText = result.detected_color
          ? ` Server detected: ${result.detected_color}.`
          : "";

        setMessage(
          `Upload successful. Image was processed and thumbnail generated.${detectedColorText}`
        );
        setIsError(false);

        setFile(null);
        setFormData({
          occasion: "",
          vibe: "",
          season: "",
          color: "",
          notes: "",
        });

        const fileInput = document.getElementById("outfit-file-input");
        if (fileInput) {
          fileInput.value = "";
        }
      } else {
        setMessage(result.message || "Upload failed.");
        setIsError(true);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setMessage("Something went wrong during upload.");
      setIsError(true);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="page-container upload-page-shell">
      <h1 className="page-title upload-title">Upload Outfit</h1>

      <form className="upload-page-form" onSubmit={handleSubmit}>
        <label htmlFor="outfit-file-input" className="upload-dropzone">
          <div className="upload-dropzone-icon">⇪</div>
          <div className="upload-dropzone-text">
            {file ? file.name : "Drag files here or browse"}
          </div>
          <div className="upload-dropzone-subtext">
            JPG, PNG, or JPEG outfit image
          </div>
        </label>

        <input
          id="outfit-file-input"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden-file-input"
        />

        <div className="upload-input-row">
          <input
            className="input-pill upload-input"
            name="occasion"
            placeholder="Occasion"
            value={formData.occasion}
            onChange={handleChange}
          />
          <input
            className="input-pill upload-input"
            name="vibe"
            placeholder="Vibe"
            value={formData.vibe}
            onChange={handleChange}
          />
          <input
            className="input-pill upload-input"
            name="color"
            placeholder="Manual color override (optional)"
            value={formData.color}
            onChange={handleChange}
          />
          <input
            className="input-pill upload-input"
            name="season"
            placeholder="Season"
            value={formData.season}
            onChange={handleChange}
          />
        </div>

        <textarea
          className="upload-notes"
          name="notes"
          placeholder="Notes..."
          value={formData.notes}
          onChange={handleChange}
          rows="6"
        />

        <div className="upload-button-row">
          <button
            type="submit"
            className="primary-button upload-submit-button"
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>

        {message && (
          <p className={`upload-message ${isError ? "error" : "success"}`}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
}