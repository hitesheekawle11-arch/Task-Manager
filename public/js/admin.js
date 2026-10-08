/**
 * Admin Console Controller
 * High-level system statistics, user management, and moderation controls
 */

const Admin = {
  stats: null,
  users: [],

  async loadAdminData() {
    if (!Auth.isAdmin()) {
      Toast.error('Admin privilege required to access this section');
      if (window.App) App.switchView('dashboard');
      return;
    }

    try {
      const [statsRes, usersRes] = await Promise.all([
        API.get('/admin/stats'),
        API.get('/admin/users'),
      ]);

      if (statsRes.success) {
        this.stats = statsRes.data;
        this.renderStats();
      }

      if (usersRes.success) {
        this.users = usersRes.data;
        this.renderUsers();
      }
    } catch (err) {
      Toast.error(err.message, 'Admin Access Error');
    }
  },

  renderStats() {
    if (!this.stats) return;
    const s = this.stats;

    const totalUsersEl = document.getElementById('admin-stat-total-users');
    if (totalUsersEl) totalUsersEl.textContent = s.totalUsers;

    const activeUsersEl = document.getElementById('admin-stat-active-users');
    if (activeUsersEl) activeUsersEl.textContent = s.activeUsers;

    const totalTasksEl = document.getElementById('admin-stat-total-tasks');
    if (totalTasksEl) totalTasksEl.textContent = s.totalTasks;

    const completedTasksEl = document.getElementById('admin-stat-completed-tasks');
    if (completedTasksEl) completedTasksEl.textContent = s.completedTasks;
  },

  renderUsers() {
    const tableBody = document.getElementById('admin-users-table-body');
    if (!tableBody) return;

    const currentUser = Auth.getUser();

    if (this.users.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;">No users found in database.</td></tr>`;
      return;
    }

    tableBody.innerHTML = this.users
      .map((u) => {
        const isSelf = currentUser && currentUser.id === u._id;
        const total = u.tasksCount ? u.tasksCount.total : 0;
        const completed = u.tasksCount ? u.tasksCount.completed : 0;
        const pending = u.tasksCount ? u.tasksCount.pending : 0;

        return `
          <tr style="border-bottom:1px solid var(--border-glass);">
            <td style="padding:1rem 1.25rem;">
              <div style="display:flex;align-items:center;gap:0.75rem;">
                <div class="user-avatar" style="width:34px;height:34px;font-size:0.75rem;">
                  ${u.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style="font-weight:700;color:var(--text-primary);">${u.name} ${isSelf ? '<span class="badge badge-med" style="font-size:0.6rem;">You</span>' : ''}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted);">${u.email}</div>
                </div>
              </div>
            </td>
            <td style="padding:1rem 1.25rem;">
              <span class="badge ${u.role === 'admin' ? 'badge-urgent' : 'badge-med'}" style="font-size:0.7rem;">
                ${u.role}
              </span>
            </td>
            <td style="padding:1rem 1.25rem;">
              <span class="badge ${u.isActive ? 'badge-low' : 'badge-urgent'}" style="font-size:0.7rem;">
                ${u.isActive ? 'Active' : 'Disabled'}
              </span>
            </td>
            <td style="padding:1rem 1.25rem;font-size:0.8125rem;">
              <strong>${total}</strong> total (${completed} done, ${pending} pending)
            </td>
            <td style="padding:1rem 1.25rem;font-size:0.75rem;color:var(--text-muted);">
              ${new Date(u.createdAt).toLocaleDateString()}
            </td>
            <td style="padding:1rem 1.25rem;text-align:right;">
              ${
                isSelf
                  ? '<span style="font-size:0.75rem;color:var(--text-muted);">Primary Admin</span>'
                  : `
                <div style="display:inline-flex;gap:0.5rem;">
                  <button 
                    class="btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}" 
                    onclick="Admin.toggleUserStatus('${u._id}')"
                  >
                    ${u.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button 
                    class="btn btn-sm btn-danger" 
                    onclick="Admin.confirmDeleteUser('${u._id}', '${u.name.replace(/'/g, "\\'")}')"
                  >
                    Delete
                  </button>
                </div>
              `
              }
            </td>
          </tr>
        `;
      })
      .join('');
  },

  async toggleUserStatus(userId) {
    try {
      const res = await API.patch(`/admin/users/${userId}/status`, {});
      Toast.success(res.message);
      this.loadAdminData();
    } catch (err) {
      Toast.error(err.message);
    }
  },

  async confirmDeleteUser(userId, name) {
    if (!confirm(`Are you sure you want to completely delete user "${name}" and all their tasks? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await API.delete(`/admin/users/${userId}`);
      Toast.success(res.message);
      this.loadAdminData();
    } catch (err) {
      Toast.error(err.message);
    }
  },
};

window.Admin = Admin;
