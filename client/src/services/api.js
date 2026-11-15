import axios from 'axios';

const KEY_A = 'gpc_access';
const KEY_R = 'gpc_refresh';

// "Remember me" -> localStorage (survives browser restarts); otherwise sessionStorage (tab only)
export const tokenStore = {
  getAccess: () => localStorage.getItem(KEY_A) || sessionStorage.getItem(KEY_A),
  getRefresh: () => localStorage.getItem(KEY_R) || sessionStorage.getItem(KEY_R),
  set({ accessToken, refreshToken }, remember = true) {
    const [use, other] = remember ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
    other.removeItem(KEY_A);
    other.removeItem(KEY_R);
    use.setItem(KEY_A, accessToken);
    use.setItem(KEY_R, refreshToken);
  },
  // used after a silent refresh: keep tokens in whichever storage already holds them
  update(tokens) {
    this.set(tokens, !!localStorage.getItem(KEY_R));
  },
  clear() {
    [localStorage, sessionStorage].forEach((s) => {
      s.removeItem(KEY_A);
      s.removeItem(KEY_R);
    });
  },
};

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', withCredentials: true });

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401: try ONE refresh (shared by all parallel requests), replay the request, else go to /login
let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthCall = /\/auth\/(login|refresh)/.test(original?.url || '');
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = axios
            .post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken: tokenStore.getRefresh() }, { withCredentials: true })
            .finally(() => {
              refreshing = null;
            });
        }
        const { data } = await refreshing;
        tokenStore.update(data);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        tokenStore.clear();
        window.dispatchEvent(new Event('auth:logout')); // AuthContext clears state -> ProtectedRoute redirects to /login
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ---- helpers ---------------------------------------------------------------
export const getError = (err) => {
  const status = err?.response?.status;
  let message = err?.response?.data?.message;
  if (!message) {
    message =
      !err?.response || status >= 500
        ? 'Cannot reach the server. Start the API (npm start) and make sure MongoDB is running.'
        : err?.message || 'Something went wrong';
  }
  return { message, fields: err?.response?.data?.errors || {} };
};

const crud = (path) => ({
  list: (params) => api.get(path, { params }).then((r) => r.data),
  get: (id) => api.get(`${path}/${id}`).then((r) => r.data),
  create: (body) => api.post(path, body).then((r) => r.data),
  update: (id, body) => api.put(`${path}/${id}`, body).then((r) => r.data),
  remove: (id) => api.delete(`${path}/${id}`).then((r) => r.data),
});

export const studentsApi = crud('/students');
export const teachersApi = crud('/teachers');
export const coursesApi = crud('/courses');
export const attendanceApi = crud('/attendance');
export const resultsApi = crud('/results');

export const dashboardApi = {
  stats: () => api.get('/dashboard').then((r) => r.data),
  activity: (limit = 5) => api.get('/dashboard/activity', { params: { limit } }).then((r) => r.data),
};

export const rolesApi = {
  list: () => api.get('/roles').then((r) => r.data),
  permissions: () => api.get('/permissions').then((r) => r.data),
  savePermissions: (role, matrix) => api.put(`/permissions/${role}`, { matrix }).then((r) => r.data),
};
