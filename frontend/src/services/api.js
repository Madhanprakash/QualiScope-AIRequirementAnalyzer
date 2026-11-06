import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const KEY_STORAGE = "qs_api_key";

export const http = axios.create({ baseURL: API_URL, timeout: 300000 });

http.interceptors.request.use(cfg => {
  try {
    const key = localStorage.getItem(KEY_STORAGE);
    if (key) cfg.headers["X-API-Key"] = key;
  } catch { /* storage unavailable */ }
  return cfg;
});

export function errorMessage(err) {
  if (err?.code === "ECONNABORTED") return "The request timed out. Please try again.";
  if (!err?.response) return "Cannot reach the QualiScope API. Check that the backend is running.";
  const d = err.response.data;
  if (d?.errors?.length) return d.errors.map(e => `${e.field || "input"}: ${e.message}`).join("; ");
  if (typeof d?.detail === "string") return d.detail;
  return `Request failed (${err.response.status}).`;
}

const data = p => p.then(r => r.data);

export const api = {
  health: () => data(http.get("/api/health")),
  me: () => data(http.get("/api/me")),
  analyze: req => data(http.post("/api/requirements/analyze", req)),
  extract: file => {
    const fd = new FormData();
    fd.append("file", file);
    return data(http.post("/api/requirements/extract", fd));
  },
  generate: (requirement, analysis) => data(http.post("/api/test-pack/generate", { requirement, analysis })),
  listPacks: () => data(http.get("/api/test-pack")),
  getPack: id => data(http.get(`/api/test-pack/${id}`, { params: { page_size: 1000 } })),
  deletePack: id => http.delete(`/api/test-pack/${id}`),
  patchCase: (id, caseId, body) => data(http.patch(`/api/test-pack/${id}/test-cases/${caseId}`, body)),
  executeCase: (id, caseId, body) => data(http.patch(`/api/test-pack/${id}/test-cases/${caseId}/execution`, body)),
  addCase: (id, body) => data(http.post(`/api/test-pack/${id}/test-cases`, body)),
  deleteCase: (id, caseId) => data(http.delete(`/api/test-pack/${id}/test-cases/${caseId}`)),
  regenerate: (id, body) => data(http.post(`/api/test-pack/${id}/regenerate`, body)),
  approve: (id, approved) => data(http.post(`/api/test-pack/${id}/approve`, { approved })),
  traceability: id => data(http.get(`/api/test-pack/${id}/traceability`)),
  versions: id => data(http.get(`/api/test-pack/${id}/versions`)),
  compare: (id, a, b) => data(http.get(`/api/test-pack/${id}/compare`, { params: { a, b } })),
  audit: id => data(http.get(`/api/test-pack/${id}/audit`)),
  dashboard: () => data(http.get("/api/dashboard/summary")),
  exportPack: async (id, format) => {
    const res = await http.post(`/api/test-pack/${id}/export`, { format }, { responseType: "blob" });
    const cd = res.headers["content-disposition"] || "";
    const name = /filename="([^"]+)"/.exec(cd)?.[1] || `AI-Test-Pack.${format}`;
    return { blob: res.data, name };
  }
};

export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
