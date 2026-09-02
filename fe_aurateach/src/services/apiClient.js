const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
// const API_BASE_URL = "https://api.aurateach.io.vn/api";
const getHeaders = (customHeaders = {}, isFormData = false) => {
  // 🔍 Hỗ trợ tìm token ở nhiều key phổ biến khác nhau trong localStorage
  const token = 
    localStorage.getItem("access_token") || 
    localStorage.getItem("token") || 
    localStorage.getItem("user_token");

  console.log("🔐 [apiClient] Token lấy từ storage:", token ? token.substring(0, 10) + "..." : "KHÔNG CÓ TOKEN!");
  
  const headers = {
    "Accept": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...customHeaders,
  };

  // Nếu KHÔNG phải FormData thì mới thêm Content-Type: application/json
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

// Hàm phụ trợ xử lý response thông minh hơn (tránh lỗi 204 No Content)
const handleResponse = async (response) => {
  // Nếu status là 204 (No Content) thì trả về null/true luôn, không gọi .json()
  if (response.status === 204) {
    return null;
  }

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    // Trường hợp server trả về HTML lỗi (ví dụ lỗi 500 của Laravel)
    data = { message: response.statusText };
  }

  if (!response.ok) {
    throw new Error(data.message || "Đã có lỗi xảy ra từ hệ thống");
  }

  return data;
};

const apiClient = {
  // Phương thức GET
  get: async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: getHeaders(options.headers),
      });
      return handleResponse(response);
    } catch (error) {
      console.error(`❌ Không thể kết nối tới API: ${url}`, error);
      throw error;
    }
  },

  // Phương thức POST (hỗ trợ cả JSON và FormData)
  post: async (endpoint, body, options = {}) => {
    const isFormData = body instanceof FormData;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: getHeaders(options.headers, isFormData),
      body: isFormData ? body : JSON.stringify(body),
    });
    return handleResponse(response);
  },

  // Phương thức PATCH
  patch: async (endpoint, body, options = {}) => {
    const isFormData = body instanceof FormData;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "PATCH",
      headers: getHeaders(options.headers, isFormData),
      body: isFormData ? body : JSON.stringify(body),
    });
    return handleResponse(response);
  },

  // 👈 Bổ sung thêm phương thức PUT vào đây
  put: async (endpoint, body, options = {}) => {
    const isFormData = body instanceof FormData;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "PUT",
      headers: getHeaders(options.headers, isFormData),
      body: isFormData ? body : JSON.stringify(body),
    });
    return handleResponse(response);
  },

  // Phương thức DELETE
  delete: async (endpoint, body = null, options = {}) => {
    const config = {
      method: "DELETE",
      headers: getHeaders(options.headers),
    };
    if (body) {
      config.body = JSON.stringify(body);
      config.headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    return handleResponse(response);
  },
};

export default apiClient;