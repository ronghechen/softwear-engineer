const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export async function getOutfits(page = 1, limit = 12) {
  const response = await fetch(
    `${API_BASE_URL}/outfits?page=${page}&limit=${limit}`
  );
  return response.json();
}

export async function filterOutfits(filters, page = 1, limit = 12) {
  const params = new URLSearchParams();

  if (filters.occasion) params.append("occasion", filters.occasion);
  if (filters.vibe) params.append("vibe", filters.vibe);
  if (filters.season) params.append("season", filters.season);
  if (filters.color) params.append("color", filters.color);

  params.append("page", page);
  params.append("limit", limit);

  const response = await fetch(
    `${API_BASE_URL}/outfits/filter?${params.toString()}`
  );
  return response.json();
}

export async function searchOutfits(q, page = 1, limit = 12) {
  const response = await fetch(
    `${API_BASE_URL}/outfits/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`
  );
  return response.json();
}

export async function uploadOutfit(data) {
  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateOutfit(id, data) {
  const response = await fetch(`${API_BASE_URL}/outfits/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteOutfit(id) {
  const response = await fetch(`${API_BASE_URL}/outfits/${id}`, {
    method: "DELETE",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Delete request failed");
  }

  return data;
}

export async function getRecommendations(id) {
  const response = await fetch(`${API_BASE_URL}/outfits/${id}/recommend`);
  return response.json();
}

export async function getAnalytics() {
  const response = await fetch(`${API_BASE_URL}/analytics`);
  return response.json();
}