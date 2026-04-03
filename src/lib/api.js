export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getToken() {
  return localStorage.getItem("ht_token");
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || `Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (url, options = {}) => {
    const finalUrl = options.params
      ? `${url}?${new URLSearchParams(options.params).toString()}`
      : url;
    return request(finalUrl);
  },
  post: (url, body) =>
    request(url, { method: "POST", body: JSON.stringify(body) }),
  put: (url, body) =>
    request(url, { method: "PUT", body: JSON.stringify(body) }),
  patch: (url, body) =>
    request(url, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (url) => request(url, { method: "DELETE" }),
  postForm: (url, formData) => request(url, { method: "POST", body: formData }),
  putForm: (url, formData) => request(url, { method: "PUT", body: formData }),
};

export function imgUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path}`;
}
