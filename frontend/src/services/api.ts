import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to add JWT token to headers of every request
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = sessionStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle authentication errors (e.g. expired tokens)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        // Force redirect to login page if unauthorized and not already there
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (err: any): string => {
  if (err && err.response && err.response.data) {
    const detail = err.response.data.detail;
    if (detail) {
      if (typeof detail === "string") {
        return detail;
      }
      if (Array.isArray(detail)) {
        return detail.map((d: any) => {
          const loc = d.loc ? d.loc.filter((l: any) => l !== "body").join(".") : "";
          return `${loc ? loc + ": " : ""}${d.msg}`;
        }).join(", ");
      }
      return JSON.stringify(detail);
    }
    if (err.response.data.message) {
      return err.response.data.message;
    }
  }
  return err.message || "Error de conexión con el servidor";
};

export default api;
