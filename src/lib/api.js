export async function readApiResponse(response) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`The API returned an invalid response (${response.status}). Check that the API server is running.`);
  }

  if (!response.ok) throw new Error(payload?.error || 'The request could not be completed.');
  return payload;
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  if (response.status === 204) return null;
  return readApiResponse(response);
}
