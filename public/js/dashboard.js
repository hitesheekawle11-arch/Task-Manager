/**
 * Dashboard & Analytics Visualizer Module
 */

const Dashboard = {
  stats: null,

  async fetchAndRender() {
    try {
      const res = await API.get('/tasks/stats/summary');
      if (res.success) {
        this.stats = res.data;
        this.renderStatsCards();
        this.renderOverdueBanner();
        this.renderCharts();
        this.renderRecentLists();
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    }
  },

  renderStatsCards() {
    if (!this.stats) return;
    const s = this.stats;

    // Stat cards injection
    const totalEl = document.getElementById('stat-total-tasks');
    if (totalEl) totalEl.textContent = s.totalTasks;

    const inProgressEl = document.getElementById('stat-in-progress');
    if (inProgressEl) inProgressEl.textContent = s.inProgressTasks;

    const completedEl = document.getElementById('stat-completed');
    if (completedEl) completedEl.textContent = s.completedTasks;

    const overdueEl = document.getElementById('stat-overdue');
    if (overdueEl) overdueEl.textContent = s.overdueTasks;

    const highPrioEl = document.getElementById('stat-high-prio');
    if (highPrioEl) highPrioEl.textContent = s.highPriorityTasks;

    const completionRateEl = document.getElementById('stat-completion-rate');
    if (completionRateEl) completionRateEl.textContent = `${s.completionPercentage}%`;

    const progressFillEl = document.getElementById('stat-progress-fill');
    if (progressFillEl) progressFillEl.style.width = `${s.completionPercentage}%`;

    // Also update sidebar counters if present
    const sidebarAllCount = document.getElementById('sidebar-all-count');
    if (sidebarAllCount) sidebarAllCount.textContent = s.totalTasks;
  },

  renderOverdueBanner() {
    const bannerContainer = document.getElementById('overdue-banner-container');
    if (!bannerContainer) return;

    if (this.stats && this.stats.overdueTasks > 0) {
      bannerContainer.innerHTML = `
        <div class="alert-banner">
          <div class="alert-banner-left">
            <span class="alert-banner-icon">⚠️</span>
            <div class="alert-banner-text">
              <h4>${this.stats.overdueTasks} Overdue Task${this.stats.overdueTasks > 1 ? 's' : ''} Require Attention</h4>
              <p>These tasks passed their deadlines without completion. Review and reschedule or complete them.</p>
            </div>
          </div>
          <button class="btn btn-sm btn-danger" onclick="Tasks.applyQuickFilter('overdue')">View Overdue</button>
        </div>
      `;
    } else {
      bannerContainer.innerHTML = '';
    }
  },

  renderCharts() {
    if (!this.stats) return;
    const s = this.stats;

    // 1. Weekly Productivity Bar Chart
    const weeklyContainer = document.getElementById('weekly-chart-bars');
    if (weeklyContainer && s.weeklyProductivity) {
      const maxCompleted = Math.max(...s.weeklyProductivity.map((w) => w.completed), 1);
      
      weeklyContainer.innerHTML = s.weeklyProductivity
        .map((day) => {
          const heightPercent = Math.round((day.completed / maxCompleted) * 100);
          const barHeight = Math.max(heightPercent, 4); // minimum visible nub
          return `
            <div class="bar-col">
              <span class="bar-val">${day.completed > 0 ? day.completed : ''}</span>
              <div class="bar-track" title="${day.date}: ${day.completed} completed">
                <div class="bar-fill" style="height: ${barHeight}%;"></div>
              </div>
              <span class="bar-label">${day.day}</span>
            </div>
          `;
        })
        .join('');
    }

    // 2. Status Breakdown Progress Bars
    const statusContainer = document.getElementById('status-breakdown-container');
    if (statusContainer && s.tasksByStatus) {
      const total = s.totalTasks || 1;
      const statuses = [
        { key: 'To Do', label: 'To Do', color: '#94a3b8' },
        { key: 'In Progress', label: 'In Progress', color: '#3b82f6' },
        { key: 'Completed', label: 'Completed', color: '#10b981' },
      ];

      statusContainer.innerHTML = statuses
        .map((st) => {
          const count = s.tasksByStatus[st.key] || 0;
          const pct = Math.round((count / total) * 100);
          return `
            <div class="dist-item">
              <div class="dist-label-row">
                <span>${st.label}</span>
                <span style="color:var(--text-muted);">${count} (${pct}%)</span>
              </div>
              <div class="dist-bar">
                <div class="dist-fill" style="width: ${pct}%; background: ${st.color};"></div>
              </div>
            </div>
          `;
        })
        .join('');
    }

    // 3. Priority Breakdown Progress Bars
    const priorityContainer = document.getElementById('priority-breakdown-container');
    if (priorityContainer && s.tasksByPriority) {
      const activeTotal = (s.totalTasks - (s.tasksByStatus['Archived'] || 0)) || 1;
      const priorities = [
        { key: 'Urgent', label: 'Urgent', color: '#ef4444' },
        { key: 'High', label: 'High', color: '#f59e0b' },
        { key: 'Medium', label: 'Medium', color: '#3b82f6' },
        { key: 'Low', label: 'Low', color: '#10b981' },
      ];

      priorityContainer.innerHTML = priorities
        .map((p) => {
          const count = s.tasksByPriority[p.key] || 0;
          const pct = Math.round((count / activeTotal) * 100);
          return `
            <div class="dist-item">
              <div class="dist-label-row">
                <span>${p.label}</span>
                <span style="color:var(--text-muted);">${count} (${pct}%)</span>
              </div>
              <div class="dist-bar">
                <div class="dist-fill" style="width: ${pct}%; background: ${p.color};"></div>
              </div>
            </div>
          `;
        })
        .join('');
    }
  },

  renderRecentLists() {
    if (!this.stats) return;
    const s = this.stats;

    // Tasks Due Today List
    const todayList = document.getElementById('dashboard-due-today-list');
    if (todayList) {
      if (!s.tasksDueToday || s.tasksDueToday.length === 0) {
        todayList.innerHTML = `<div style="padding:1.5rem;text-align:center;color:var(--text-muted);font-size:0.875rem;">🎉 No tasks due today! You're all caught up.</div>`;
      } else {
        todayList.innerHTML = s.tasksDueToday
          .map((task) => this.renderMiniTaskRow(task))
          .join('');
      }
    }

    // Recently Created List
    const recentCreatedList = document.getElementById('dashboard-recent-created-list');
    if (recentCreatedList) {
      if (!s.recentlyCreated || s.recentlyCreated.length === 0) {
        recentCreatedList.innerHTML = `<div style="padding:1.5rem;text-align:center;color:var(--text-muted);font-size:0.875rem;">No tasks created yet.</div>`;
      } else {
        recentCreatedList.innerHTML = s.recentlyCreated
          .map((task) => this.renderMiniTaskRow(task))
          .join('');
      }
    }

    // Recently Completed List
    const recentCompletedList = document.getElementById('dashboard-recent-completed-list');
    if (recentCompletedList) {
      if (!s.recentlyCompleted || s.recentlyCompleted.length === 0) {
        recentCompletedList.innerHTML = `<div style="padding:1.5rem;text-align:center;color:var(--text-muted);font-size:0.875rem;">No tasks completed recently.</div>`;
      } else {
        recentCompletedList.innerHTML = s.recentlyCompleted
          .map((task) => this.renderMiniTaskRow(task))
          .join('');
      }
    }
  },

  renderMiniTaskRow(task) {
    const isCompleted = task.status === 'Completed';
    const prioClass = {
      Low: 'badge-low',
      Medium: 'badge-med',
      High: 'badge-high',
      Urgent: 'badge-urgent',
    }[task.priority] || 'badge-med';

    return `
      <div class="task-item" style="padding: 0.75rem 1rem;">
        <div class="task-item-left">
          <input 
            type="checkbox" 
            class="task-checkbox" 
            ${isCompleted ? 'checked' : ''} 
            onchange="Tasks.toggleTaskComplete('${task._id}', this.checked)"
          />
          <div class="task-main-info">
            <span class="task-title ${isCompleted ? 'completed' : ''}" onclick="Tasks.openDetailModal('${task._id}')">${task.title}</span>
            <div class="task-meta-row">
              <span class="badge ${prioClass}" style="font-size:0.65rem;">${task.priority}</span>
              ${task.category ? `<span style="color:${task.category.color};font-weight:600;">${task.category.icon || '📁'} ${task.category.name}</span>` : ''}
            </div>
          </div>
        </div>
        <button class="btn btn-icon btn-secondary btn-sm" onclick="Tasks.openDetailModal('${task._id}')">👁️</button>
      </div>
    `;
  },
};

window.Dashboard = Dashboard;
