const API_BASE_URL = "http://localhost:8000/api";

const getHeaders = (customHeaders = {}) => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...customHeaders,
  };
};

const apiClient = {
  // Phương thức GET
  get: async (endpoint, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: getHeaders(options.headers),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Lỗi GET");
    return data;
  },

  // Phương thức POST
  post: async (endpoint, body, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: getHeaders(options.headers),
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Lỗi POST");
    return data;
  },

  // Phương thức PATCH
  patch: async (endpoint, body, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "PATCH",
      headers: getHeaders(options.headers),
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Lỗi PATCH");
    return data;
  },

  // Phương thức DELETE
  delete: async (endpoint, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers: getHeaders(options.headers),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Lỗi DELETE");
    return data;
  }
};

export default apiClient;