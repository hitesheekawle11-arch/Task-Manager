/**
 * Interactive Monthly Task Calendar View
 */

const CalendarView = {
  currentDate: new Date(),
  tasks: [],

  async loadCalendar() {
    try {
      const res = await API.get('/tasks', { limit: 150, archived: 'false' });
      if (res.success) {
        this.tasks = res.data;
        this.renderCalendar();
      }
    } catch (err) {
      console.error('Failed to load calendar tasks:', err);
    }
  },

  renderCalendar() {
    const container = document.getElementById('calendar-view-container');
    if (!container) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    let calendarHtml = `
      <div class="stat-card" style="padding:1.5rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;">
          <h3 style="font-size:1.25rem;">📅 ${monthNames[month]} ${year}</h3>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="CalendarView.prevMonth()">← Prev</button>
            <button class="btn btn-outline btn-sm" onclick="CalendarView.today()">Today</button>
            <button class="btn btn-secondary btn-sm" onclick="CalendarView.nextMonth()">Next →</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(7, 1fr);gap:0.5rem;text-align:center;font-weight:700;color:var(--text-muted);font-size:0.8125rem;margin-bottom:0.75rem;">
          <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(7, 1fr);gap:0.5rem;">
    `;

    // Empty spaces before first day
    for (let i = 0; i < firstDay; i++) {
      calendarHtml += `<div style="background:var(--bg-tertiary);opacity:0.3;min-height:90px;border-radius:var(--radius-md);"></div>`;
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && today.getDate() === day;
      const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Find tasks due on this day
      const dayTasks = this.tasks.filter((t) => {
        if (!t.dueDate) return false;
        return t.dueDate.startsWith(dayDateStr);
      });

      calendarHtml += `
        <div style="background:var(--bg-secondary);border:1px solid ${isToday ? 'var(--primary)' : 'var(--border-subtle)'};border-radius:var(--radius-md);min-height:90px;padding:0.5rem;display:flex;flex-direction:column;gap:0.25rem;overflow:hidden;${isToday ? 'box-shadow:0 0 10px var(--primary-glow);' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem;">
            <span style="font-size:0.8125rem;font-weight:${isToday ? '800' : '600'};color:${isToday ? 'var(--primary)' : 'var(--text-primary)'};">${day}</span>
            ${dayTasks.length > 0 ? `<span class="badge badge-med" style="font-size:0.6rem;padding:0.1rem 0.35rem;">${dayTasks.length}</span>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:0.25rem;overflow-y:auto;max-height:65px;">
            ${dayTasks
              .map(
                (t) => `
              <div 
                onclick="Tasks.openDetailModal('${t._id}')" 
                style="font-size:0.6875rem;padding:0.15rem 0.4rem;background:${t.status === 'Completed' ? 'var(--success-bg)' : 'var(--bg-tertiary)'};color:${t.status === 'Completed' ? 'var(--success)' : 'var(--text-primary)'};border-radius:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;border-left:3px solid ${t.priority === 'Urgent' ? 'var(--danger)' : t.priority === 'High' ? 'var(--warning)' : 'var(--primary)'};"
                title="${t.title}"
              >
                ${t.title}
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    }

    calendarHtml += `</div></div>`;
    container.innerHTML = calendarHtml;
  },

  prevMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.renderCalendar();
  },

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.renderCalendar();
  },

  today() {
    this.currentDate = new Date();
    this.renderCalendar();
  },
};

window.CalendarView = CalendarView;
