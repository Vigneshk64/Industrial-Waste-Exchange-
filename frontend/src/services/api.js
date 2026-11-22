import { supabase } from './supabase';

const configuredApiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
const normalizedApiBaseUrl = configuredApiBaseUrl.replace(/\/+$/, '');
export const API_BASE_URL = normalizedApiBaseUrl.endsWith('/api')
  ? normalizedApiBaseUrl
  : `${normalizedApiBaseUrl}/api`;

export async function apiFetch(endpoint, options = {}) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.access_token) throw new Error('Please sign in to continue.');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    let errorMsg = 'Request failed';
    const errorText = await response.text();
    if (errorText) {
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = (typeof errorJson === 'string' ? errorJson : errorJson.error || errorJson.message) || errorText;
      } catch {
        errorMsg = errorText;
      }
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
  if (params.location) query.set('location', params.location);
  if (params.mine) query.set('mine', 'true');
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));

  const qs = query.toString();
  return apiFetch(`/listings${qs ? `?${qs}` : ''}`);
}

export async function createListing(data) {
  return apiFetch('/listings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateListing(id, data) {
  return apiFetch(`/listings/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteListing(id) {
  return apiFetch(`/listings/${encodeURIComponent(id)}`, { method: 'DELETE' });
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

export async function getRequestHistory(id) {
  return apiFetch(`/requests/${encodeURIComponent(id)}/history`);
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

export async function updateRequestStatus(id, status) {
  return apiFetch(`/requests/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function respondToRequest(id, response) {
  return apiFetch(`/requests/${encodeURIComponent(id)}/response`, {
    method: 'PATCH',
    body: JSON.stringify({ response }),
  });
}

export async function submitFeedback(id, rating, comment) {
  return apiFetch(`/requests/${id}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
  });
}

// Company dashboard analytics
export async function getDashboardMetrics() {
  return apiFetch('/analytics/dashboard');
}

export async function getNotifications() {
  return apiFetch('/notifications');
}

export async function markNotificationRead(id) {
  return apiFetch(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
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
