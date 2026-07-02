// src/services/apiClient.js
const API_BASE_URL = "http://localhost:8000/api";

const apiClient = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token"); // Hoặc lấy từ cookie
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Có lỗi xảy ra");
  return data;
};

export default apiClient;