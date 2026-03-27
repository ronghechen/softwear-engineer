const API_BASE_URL = "http://localhost:3001";

export async function getOutfits() {
  const response = await fetch(`${API_BASE_URL}/outfits`);
  return response.json();
}

export async function filterOutfits(filters) {
  const query = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_BASE_URL}/outfits/filter?${query}`);
  return response.json();
}

export async function searchOutfits(q) {
  const response = await fetch(
    `${API_BASE_URL}/outfits/search?q=${encodeURIComponent(q)}`
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