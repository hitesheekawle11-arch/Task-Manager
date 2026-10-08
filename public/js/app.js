/**
 * Core Application Controller
 * Handles View Routing, Navigation, Modals, Pomodoro Timer, and Global Shortcuts
 */

const App = {
  currentView: 'dashboard',
  pomodoroTimer: null,
  pomodoroSecondsLeft: 25 * 60,
  pomodoroIsRunning: false,

  init() {
    // Check authentication
    if (!Auth.requireAuth()) return;

    this.renderUserInfo();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.setupSearch();
    this.initPomodoro();

    // Check URL hash for view (e.g. #kanban, #tasks, #categories, #admin)
    const hash = window.location.hash.replace('#', '');
    const initialView = ['dashboard', 'tasks', 'kanban', 'calendar', 'categories', 'admin', 'settings'].includes(hash)
      ? hash
      : 'dashboard';

    this.switchView(initialView);

    // Initial data fetch
    Categories.fetchAll();
  },

  renderUserInfo() {
    const user = Auth.getUser();
    if (!user) return;

    const userNameEls = document.querySelectorAll('.user-name-display');
    userNameEls.forEach((el) => (el.textContent = user.name));

    const userEmailEls = document.querySelectorAll('.user-email-display');
    userEmailEls.forEach((el) => (el.textContent = user.email));

    const userRoleEls = document.querySelectorAll('.user-role-display');
    userRoleEls.forEach((el) => (el.textContent = user.role));

    // Show or hide admin navigation link
    const adminNavLink = document.getElementById('nav-admin-link');
    if (adminNavLink) {
      adminNavLink.style.display = Auth.isAdmin() ? 'flex' : 'none';
    }

    // Avatar
    const avatarEls = document.querySelectorAll('.user-avatar-initials');
    avatarEls.forEach((el) => {
      if (user.avatar) {
        el.innerHTML = `<img src="${user.avatar}" alt="${user.name}" onerror="this.onerror=null;this.parentElement.textContent='${user.name.substring(0, 2).toUpperCase()}'">`;
      } else {
        el.textContent = user.name.substring(0, 2).toUpperCase();
      }
    });
  },

  switchView(viewName) {
    if (viewName === 'admin' && !Auth.isAdmin()) {
      Toast.error('Admin privilege required');
      return;
    }

    this.currentView = viewName;
    window.location.hash = viewName;

    // Update active state in sidebar
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.remove('active');
    });
    const activeNav = document.getElementById(`nav-${viewName}`);
    if (activeNav) activeNav.classList.add('active');

    // Switch view containers
    document.querySelectorAll('.view-section').forEach((sec) => {
      sec.style.display = 'none';
    });
    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) targetSection.style.display = 'block';

    // Close mobile sidebar if open
    this.closeMobileSidebar();

    // Trigger view-specific loads
    if (viewName === 'dashboard') {
      Dashboard.fetchAndRender();
    } else if (viewName === 'tasks') {
      Tasks.fetchAndRender();
    } else if (viewName === 'kanban') {
      Kanban.loadBoard();
    } else if (viewName === 'calendar') {
      CalendarView.loadCalendar();
    } else if (viewName === 'categories') {
      Categories.renderCategoriesPage();
    } else if (viewName === 'admin') {
      Admin.loadAdminData();
    } else if (viewName === 'settings') {
      this.populateSettingsForm();
    }
  },

  // Mobile navigation
  toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
  },

  closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
  },

  // Search input in header
  setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    let timeout = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const query = e.target.value.trim();
        if (App.currentView !== 'tasks') {
          App.switchView('tasks');
        }
        Tasks.applyFilter('search', query);
      }, 350);
    });
  },

  // Pomodoro Focus Timer
  initPomodoro() {
    this.updatePomodoroDisplay();
  },

  togglePomodoro() {
    if (this.pomodoroIsRunning) {
      clearInterval(this.pomodoroTimer);
      this.pomodoroIsRunning = false;
      document.querySelector('.pomodoro-dot').classList.remove('active');
      Toast.info('Pomodoro timer paused');
    } else {
      this.pomodoroIsRunning = true;
      document.querySelector('.pomodoro-dot').classList.add('active');
      Toast.info('Pomodoro 25-min focus session started! 🍅');

      this.pomodoroTimer = setInterval(() => {
        if (this.pomodoroSecondsLeft > 0) {
          this.pomodoroSecondsLeft--;
          this.updatePomodoroDisplay();
        } else {
          clearInterval(this.pomodoroTimer);
          this.pomodoroIsRunning = false;
          this.pomodoroSecondsLeft = 25 * 60;
          this.updatePomodoroDisplay();
          document.querySelector('.pomodoro-dot').classList.remove('active');
          Toast.success('Focus session complete! Take a 5-minute break. ☕', 'Pomodoro Completed');
        }
      }, 1000);
    }
  },

  resetPomodoro() {
    clearInterval(this.pomodoroTimer);
    this.pomodoroIsRunning = false;
    this.pomodoroSecondsLeft = 25 * 60;
    this.updatePomodoroDisplay();
    document.querySelector('.pomodoro-dot').classList.remove('active');
    Toast.info('Pomodoro timer reset');
  },

  updatePomodoroDisplay() {
    const min = Math.floor(this.pomodoroSecondsLeft / 60);
    const sec = this.pomodoroSecondsLeft % 60;
    const timeFormatted = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    const el = document.getElementById('pomodoro-time-text');
    if (el) el.textContent = timeFormatted;
  },

  // Settings & Profile Form
  populateSettingsForm() {
    const user = Auth.getUser();
    if (!user) return;

    const nameInput = document.getElementById('settings-name');
    if (nameInput) nameInput.value = user.name || '';

    const emailInput = document.getElementById('settings-email');
    if (emailInput) emailInput.value = user.email || '';

    const bioInput = document.getElementById('settings-bio');
    if (bioInput) bioInput.value = user.bio || '';

    const avatarInput = document.getElementById('settings-avatar');
    if (avatarInput) avatarInput.value = user.avatar || '';
  },

  async handleProfileUpdate(e) {
    e.preventDefault();
    const name = document.getElementById('settings-name').value.trim();
    const bio = document.getElementById('settings-bio').value.trim();
    const avatar = document.getElementById('settings-avatar').value.trim();

    try {
      await Auth.updateProfile({ name, bio, avatar });
      this.renderUserInfo();
    } catch (err) {
      // Toast shown in auth.js
    }
  },

  async handlePasswordUpdate(e) {
    e.preventDefault();
    const current = document.getElementById('settings-current-pwd').value;
    const newPwd = document.getElementById('settings-new-pwd').value;
    const confirmPwd = document.getElementById('settings-confirm-pwd').value;

    if (newPwd !== confirmPwd) {
      Toast.error('New passwords do not match');
      return;
    }

    try {
      await Auth.changePassword(current, newPwd);
      document.getElementById('settings-password-form').reset();
    } catch (err) {
      // Toast shown in auth.js
    }
  },

  // Keyboard Shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignore if user is currently typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        if (e.key === 'Escape') {
          e.target.blur();
        }
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        Tasks.openCreateModal();
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.focus();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        Auth.toggleTheme();
      } else if (e.key === '?') {
        e.preventDefault();
        App.openShortcutsModal();
      } else if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach((m) => m.classList.remove('active'));
      }
    });
  },

  openShortcutsModal() {
    const modal = document.getElementById('shortcuts-modal');
    if (modal) modal.classList.add('active');
  },

  closeShortcutsModal() {
    const modal = document.getElementById('shortcuts-modal');
    if (modal) modal.classList.remove('active');
  },

  setupEventListeners() {
    // Close modals on overlay backdrop click
    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });
  },
};

window.App = App;

document.addEventListener('DOMContentLoaded', () => {
  if (
    !window.location.pathname.includes('login.html') &&
    !window.location.pathname.includes('register.html') &&
    !window.location.pathname.endsWith('index.html') &&
    window.location.pathname !== '/'
  ) {
    App.init();
  }
});
