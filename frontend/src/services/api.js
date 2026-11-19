export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

export async function apiFetch(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let errorMsg = 'Request failed';
    try {
      const errorJson = await response.json();
      errorMsg = errorJson.error || errorJson.message || errorMsg;
    } catch {
      const errorText = await response.text();
      errorMsg = errorText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  return response.status === 204 ? null : response.json();
}

// Waste Listings API
export async function getListings(params = {}) {
  const query = new URLSearchParams();
  if (params.category && params.category !== 'All') query.set('category', params.category);
  if (params.status && params.status !== 'All') query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.sort) query.set('sort', params.sort);

  const qs = query.toString();
  return apiFetch(`/listings${qs ? `?${qs}` : ''}`);
}

export async function createListing(data) {
  return apiFetch('/listings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Seeker Material Requirements API (Objective 1)
export async function getRequirements() {
  return apiFetch('/requirements');
}

export async function createRequirement(data) {
  return apiFetch('/requirements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Dynamic Rule-Based Matching API (Objective 2)
export async function getMatches() {
  return apiFetch('/matches');
}

// Exchange Requests & Transactions (Objectives 3 & 4)
export async function getRequests() {
  return apiFetch('/requests');
}

export async function createRequest(data) {
  return apiFetch('/requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function advanceRequest(id) {
  return apiFetch(`/requests/${id}/advance`, {
    method: 'PATCH',
  });
}

export async function submitFeedback(id, rating, comment) {
  return apiFetch(`/requests/${id}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
  });
}

// Analytics & SDG Impact (Objective 5)
export async function getDashboardMetrics() {
  return apiFetch('/analytics/dashboard');
}

export async function getImpactMetrics() {
  return apiFetch('/analytics/impact');
}

// Chatbot Interface & Help Guides (Architecture Diagram)
export async function askChatbot(message) {
  return apiFetch('/chatbot', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function getGuides() {
  return apiFetch('/guides');
}

// Transport Estimation (Architecture Diagram)
export async function estimateTransport(payload) {
  return apiFetch('/transport/estimate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
