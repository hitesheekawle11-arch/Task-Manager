/**
 * Authentication and User Session Controller
 */

const Auth = {
  getToken() {
    return localStorage.getItem('tm_token');
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('tm_user')) || null;
    } catch {
      return null;
    }
  },

  setSession(token, user) {
    localStorage.setItem('tm_token', token);
    localStorage.setItem('tm_user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('tm_token');
    localStorage.removeItem('tm_user');
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  isAdmin() {
    const user = this.getUser();
    return user && user.role === 'admin';
  },

  // Route protection helper for frontend pages
  requireAuth(adminOnly = false) {
    if (!this.isAuthenticated()) {
      window.location.href = 'login.html';
      return false;
    }
    if (adminOnly && !this.isAdmin()) {
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  },

  redirectIfAuthenticated() {
    if (this.isAuthenticated()) {
      window.location.href = 'dashboard.html';
    }
  },

  async login(email, password) {
    try {
      const res = await API.post('/auth/login', { email, password });
      if (res.success && res.token) {
        this.setSession(res.token, res.user);
        if (window.Toast) Toast.success(res.message || 'Login successful!');
        return res;
      }
      throw new Error(res.message || 'Login failed');
    } catch (err) {
      if (window.Toast) Toast.error(err.message || 'Login failed', 'Authentication Error');
      throw err;
    }
  },

  async register(name, email, password, role = 'user') {
    try {
      const res = await API.post('/auth/register', { name, email, password, role });
      if (res.success && res.token) {
        this.setSession(res.token, res.user);
        if (window.Toast) Toast.success('Account created successfully!', 'Welcome');
        return res;
      }
      throw new Error(res.message || 'Registration failed');
    } catch (err) {
      if (window.Toast) Toast.error(err.message || 'Registration failed', 'Registration Error');
      throw err;
    }
  },

  async logout() {
    try {
      if (this.isAuthenticated()) {
        await API.post('/auth/logout', {}).catch(() => {});
      }
    } finally {
      this.clearSession();
      if (window.Toast) Toast.info('You have logged out');
      window.location.href = 'login.html';
    }
  },

  async updateProfile(profileData) {
    try {
      const res = await API.put('/users/profile', profileData);
      if (res.success) {
        // Update user in localStorage
        const current = this.getUser() || {};
        this.setSession(this.getToken(), { ...current, ...res.data });
        if (window.Toast) Toast.success('Profile updated successfully');
        return res.data;
      }
      throw new Error(res.message || 'Profile update failed');
    } catch (err) {
      if (window.Toast) Toast.error(err.message, 'Update Error');
      throw err;
    }
  },

  async changePassword(currentPassword, newPassword) {
    try {
      const res = await API.put('/users/password', { currentPassword, newPassword });
      if (res.success) {
        if (window.Toast) Toast.success('Password changed successfully');
        return true;
      }
      throw new Error(res.message || 'Failed to update password');
    } catch (err) {
      if (window.Toast) Toast.error(err.message, 'Password Error');
      throw err;
    }
  },

  // Dark / Light Theme Management
  initTheme() {
    const savedTheme = localStorage.getItem('tm_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcons(savedTheme);
  },

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('tm_theme', newTheme);
    this.updateThemeIcons(newTheme);

    if (window.Toast) {
      Toast.info(`Switched to ${newTheme} theme`);
    }

    // Also persist theme to user profile in backend if authenticated
    if (this.isAuthenticated()) {
      API.put('/users/profile', { themePreference: newTheme }).catch(() => {});
    }
    return newTheme;
  },

  updateThemeIcons(theme) {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
      themeBtn.title = `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`;
    }
  },
};

window.Auth = Auth;

// Automatically initialize theme on script load
document.addEventListener('DOMContentLoaded', () => {
  Auth.initTheme();
});
