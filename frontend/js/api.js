// frontend/js/api.js
// Centralised API client — all requests go through here

const API_BASE = 'http://localhost:3000/api';

const api = {
  // ── Auth helpers ─────────────────────────────────────────
  getToken: ()  => localStorage.getItem('token'),
  getUser:  ()  => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } },
  isLoggedIn: () => !!api.getToken(),
  isAdmin:    () => ['admin'].includes(api.getUser()?.role),
  isMod:      () => ['admin', 'moderator'].includes(api.getUser()?.role),

  setAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // ── Core fetch ───────────────────────────────────────────
  async request(method, endpoint, body = null, isFormData = false) {
    const headers = {};
    const token   = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    try {
      const res  = await fetch(API_BASE + endpoint, opts);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Token expired — logout only for actual auth errors, not wrong password
        if (res.status === 401 && !endpoint.includes('/password')) {
          this.clearAuth();
          if (!window.location.pathname.includes('login')) {
            window.location.href = '/frontend/pages/login.html';
          }
        }
        throw { status: res.status, message: data.error || 'Request failed' };
      }
      return data;
    } catch (err) {
      if (err.status) throw err;
      throw { status: 0, message: 'Network error — is the server running?' };
    }
  },

  get:    (ep)         => api.request('GET',    ep),
  post:   (ep, body)   => api.request('POST',   ep, body),
  put:    (ep, body)   => api.request('PUT',    ep, body),
  delete: (ep, body)   => api.request('DELETE', ep, body),
  upload: (ep, fd)     => api.request('POST',   ep, fd, true),

  // ── Auth ─────────────────────────────────────────────────
  auth: {
    login:    (data) => api.post('/auth/login', data),
    register: (data) => api.post('/auth/register', data),
    me:       ()     => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/profile', data),
    changePassword:(data) => api.put('/auth/password', data),
  },

  // ── Books ────────────────────────────────────────────────
  books: {
    list:   (params = {}) => api.get('/books?' + new URLSearchParams(params)),
    get:    (id)          => api.get(`/books/${id}`),
    create: (fd)          => api.upload('/books', fd),
    update: (id, data)    => api.put(`/books/${id}`, data),
    delete: (id, reason)  => api.delete(`/books/${id}`, { reason }),
    streamUrl: (bookId, fileId) => `${API_BASE}/books/${bookId}/stream/${fileId}`,
    genres:    () => api.get('/books/meta/genres'),
    languages: () => api.get('/books/meta/languages'),
    publicStats: () => api.get('/books/meta/stats'),
    recalcDuration: (id) => api.request('POST', `/books/${id}/recalc-duration`),
    download: (id) => `${API_BASE}/books/${id}/download`,
  },

  // ── Reviews ──────────────────────────────────────────────
  reviews: {
    list:   (bookId, params = {}) => api.get(`/books/${bookId}/reviews?` + new URLSearchParams(params)),
    create: (bookId, data)        => api.post(`/books/${bookId}/reviews`, data),
    delete: (bookId, reviewId, reason) => api.delete(`/books/${bookId}/reviews/${reviewId}`, { reason }),
  },

  // ── Users ────────────────────────────────────────────────
  users: {
    get:           (id)  => api.get(`/users/${id}`),
    myBooks:       ()    => api.get('/users/me/books'),
    history:       (p)   => api.get('/users/me/history?' + new URLSearchParams(p)),
    saveProgress:  (d)   => api.post('/users/me/history', d),
    addListenTime: (sec) => api.post('/users/me/listen-time', { seconds: sec }),
    clearHistory:  ()    => api.delete('/users/me/history'),
    uploadAvatar:  (fd)  => api.upload('/users/me/avatar', fd),
  },

  // ── Admin ────────────────────────────────────────────────
  admin: {
    stats:    () => api.get('/admin/stats'),
    users:    (p) => api.get('/admin/users?' + new URLSearchParams(p)),
    setRole:  (id, role)   => api.put(`/admin/users/${id}/role`, { role }),
    block:    (id, reason) => api.put(`/admin/users/${id}/block`, { reason }),
    unblock:  (id)         => api.put(`/admin/users/${id}/unblock`),
    pendingBooks: ()        => api.get('/admin/pending-books'),
    approveBook: (id)       => api.post(`/admin/books/${id}/approve`),
    rejectBook:  (id, reason) => api.post(`/admin/books/${id}/reject`, { reason }),
    deleteUser:(id)        => api.delete(`/admin/users/${id}`),
    books:    (p) => api.get('/admin/books?' + new URLSearchParams(p)),
    reviews:  (p) => api.get('/admin/reviews?' + new URLSearchParams(p)),
    modlog:   (p) => api.get('/admin/modlog?' + new URLSearchParams(p)),
  },
};

window.api = api;
