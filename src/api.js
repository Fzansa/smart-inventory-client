import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
export const API_ORIGIN = new URL(API_BASE_URL).origin;
const AUTH_KEY = "sioms_store_auth";

export const getStoredAuth = () => {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY)) || null;
  } catch {
    return null;
  }
};

export const setStoredAuth = (auth) => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
};

export const clearStoredAuth = () => {
  localStorage.removeItem(AUTH_KEY);
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const auth = getStoredAuth();
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const auth = getStoredAuth();
    if (error.response?.status === 401 && auth?.refreshToken && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken: auth.refreshToken,
        });
        const accessToken = response.data?.data?.accessToken;
        if (accessToken) {
          setStoredAuth({ ...auth, accessToken });
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch {
        clearStoredAuth();
      }
    }
    return Promise.reject(error);
  }
);

export const unwrapData = (response) => response.data?.data ?? response.data;

export const asArray = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of keys) {
    if (Array.isArray(value[key])) return value[key];
  }
  return [];
};

export const getApiError = (error, fallback = "Something went wrong") =>
  error.response?.data?.message || error.message || fallback;

export const authService = {
  async login(payload) {
    const response = await api.post("/auth/login", payload);
    return unwrapData(response);
  },
  async register(payload) {
    const response = await api.post("/auth/register", { ...payload, role: "customer" });
    return unwrapData(response);
  },
  async me() {
    const response = await api.get("/auth/me");
    return unwrapData(response);
  },
};

export const categoryService = {
  async list() {
    const response = await api.get("/categories/get", { params: { page: 1, limit: 1000 } });
    return asArray(unwrapData(response), ["categories"]);
  },
};

export const productService = {
  async list(params = {}) {
    const response = await api.get("/products/fetch", {
      params: { page: params.page || 1, limit: params.limit || 100 },
    });
    const payload = unwrapData(response);
    return {
      items: asArray(payload, ["products"]),
      pagination: payload?.pagination || null,
    };
  },
  async get(id) {
    const response = await api.get(`/products/fetch/${id}`);
    return unwrapData(response);
  },
  async variants(id) {
    const response = await api.get(`/variants/product/${id}`);
    return asArray(unwrapData(response), ["variants"]);
  },
};

export const cartService = {
  async selectVariant(itemId, variantId, quantity) {
    const response = await api.patch(`/cart/items/${itemId}/variant`, { variantId, ...(quantity === undefined ? {} : { quantity }) });
    return response.data?.cart ?? unwrapData(response);
  },
  async get() {
    const response = await api.get("/cart");
    return response.data?.cart ?? unwrapData(response) ?? { items: [] };
  },
  async add(payload) {
    const response = await api.post("/cart/add", payload);
    return response.data?.cart ?? unwrapData(response);
  },
  async remove(productId, variantId, itemId) {
    const response = itemId ? await api.delete(`/cart/items/${itemId}`)
      : await api.delete(`/cart/remove/${productId}`, { params: variantId ? { variantId } : {} });
    return response.data?.cart ?? unwrapData(response);
  },
  async setQuantity(productId, quantity, variantId) {
    const response = await api.patch(`/cart/items/${productId}`, { quantity, ...(variantId ? { variantId } : {}) });
    return response.data?.cart ?? unwrapData(response);
  },
};

export const orderService = {
  async mine() {
    const response = await api.get("/order", { params: { scope: "mine" } });
    return asArray(unwrapData(response), ["orders"]);
  },
  async create() {
    const response = await api.post("/order/create");
    return response.data?.order ?? unwrapData(response)?.order ?? unwrapData(response);
  },
  async list() {
    const response = await api.get("/order");
    return asArray(unwrapData(response), ["orders"]);
  },
};

export const mediaUrl = (value) => {
  if (!value) return "";
  const path = typeof value === "object" ? value.path || value.filename || value.originalName : value;
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = String(path).replaceAll("\\", "/");
  const uploadPath = normalized.startsWith("uploads/") ? normalized : `uploads/${normalized}`;
  return `/api/media-file?path=${encodeURIComponent(uploadPath)}`;
};
