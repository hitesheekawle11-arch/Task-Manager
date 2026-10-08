# 🚀 TaskFlow Pro - Modern Task & Productivity Management Web Application

A full-stack, responsive Task Management workstation built with **Node.js**, **Express.js**, **MongoDB & Mongoose**, and **Vanilla HTML5/CSS3/JavaScript**. Features JWT authentication, role-based authorization, native HTML5 drag-and-drop Kanban boards, multi-criteria filtering, subtasks with progress tracking, dark/light modes, interactive monthly calendars, and executive dashboard analytics.

---

## 🌟 Highlights & Features

### 1. 🔐 Complete Authentication & User Security
- **Secure Registration & Login** with password hashing using `bcryptjs` (salt rounds: 10).
- **JWT Authentication** (`jsonwebtoken`) with `Bearer` header inspection and expiration handling.
- **Role-Based Access Control**:
  - `user`: Manage personal tasks, categories, subtasks, and profile.
  - `admin`: Elevated permissions to access the **Admin Console**, view all registered users, toggle active status, and monitor global metrics.
- User profile editing, avatar customization, and change password workflows.
- Auto-seeding of default user categories upon registration (*Work*, *Personal*, *College*, *Fitness*, *Freelance*).

### 2. 📋 Comprehensive Task Management (CRUD)
- **Status Pipeline**: `To Do`, `In Progress`, `Completed`, `Archived`.
- **Priority Tiering**: `Low` (Green), `Medium` (Blue), `High` (Amber), `Urgent` (Crimson pulsating badge).
- **Due Dates & Overdue Alerts**:
  - Visual color indicators for Overdue, Due Today, and Upcoming tasks.
  - Automatic banner highlighting overdue deliverables.
- **Subtasks & Progress Tracking**:
  - Interactive checklists with live completion progress bars (e.g. `3 / 5 subtasks completed`).
- **Additional Metadata**:
  - Tags support (e.g. `#frontend #backend #security #q2`).
  - Categories / Projects with custom color codes and icons.
  - Notes field and favorite (`isFavorite`) toggle.
  - Task duplication (`(Copy)`) and soft archive/restore.

### 3. 📌 Interactive Kanban Drag & Drop Board
- Native HTML5 Drag and Drop across 3 swimlanes: **To Do**, **In Progress**, and **Completed**.
- Dropping cards automatically dispatches `PATCH /api/tasks/:id/status` to synchronize MongoDB in real-time.
- Visual drop-zone feedback, ghost states, and subtask progress on cards.

### 4. 📊 Executive Dashboard & Visual Productivity Charts
- Dynamic metric cards: *Total Tasks*, *In Progress*, *Completed*, *Overdue*, *High & Urgent*, and *Completion Rate %*.
- **Weekly Productivity Bar Chart**: Real-time 7-day trend showing completed tasks by day.
- **Status & Priority Distribution Gauges**: Visual percentage meters.
- **Quick Action Lists**: Tasks Due Today, Recently Created, and Recently Completed.

### 5. 🔍 Multi-Criteria Search, Filter & Pagination
- Real-time search across Title, Description, and Tags.
- Simultaneous filtering by Status, Priority, Category, and Due Date status.
- Sorting options: Newest, Oldest, Due Date, Highest Priority, Recently Updated.
- Server-side pagination with dynamic page controls.

### 6. 📅 Interactive Monthly Calendar View
- Monthly grid visualization of upcoming deliverables and due dates.
- Color-coded priority badges with quick click-to-view modal.

### 7. 📁 Category & Project Management
- Full category CRUD with customizable HEX color pickers, emoji icons, and descriptions.
- Live task counters per category (Total, Pending, Completed).
- Automatic unlinking of tasks when a category is deleted.

### 8. 🍅 Pomodoro Focus Timer & Keyboard Shortcuts
- 25-minute deep-work focus timer in the header with Play/Pause, Reset, and completion chime alerts.
- Global productivity hotkeys:
  - `N`: Create new task
  - `/`: Focus search bar
  - `D`: Toggle Dark/Light mode
  - `?`: Open keyboard shortcuts cheat-sheet
  - `Esc`: Close modals

### 9. 🎨 Modern Responsive UI & Theming
- Sleek glassmorphic dark & light modes with smooth transitions.
- Persistent theme preference stored in `localStorage` and synchronized with user settings.
- Desktop sidebar navigation with mobile hamburger drawer menu.
- Reusable, animated Toast notification component.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express.js |
| **Database** | Supabase PostgreSQL (`@supabase/supabase-js`) |
| **Fallback Engine** | Embedded zero-config high-performance memory adapter (Zero-config local development if Supabase credentials are not yet configured) |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` |
| **Frontend** | HTML5, Modern CSS3 (Vanilla), Vanilla JavaScript (Modular ES6+) |
| **Icons & Fonts** | Google Fonts (*Plus Jakarta Sans*, *JetBrains Mono*) |

---

## 📁 Project Architecture

```
task-manager/
├── server.js                      # Express server entry point & middleware mounting
├── supabase_schema.sql            # Complete Supabase PostgreSQL schema (Tables, Indexes, Triggers, RLS)
├── package.json                   # Dependencies and npm scripts
├── .env                           # Environment variables
├── .env.example                   # Environment variable template
├── .gitignore                     # Git ignore rules
│
├── config/
│   ├── db.js                      # Database lifecycle manager & health verification
│   └── supabase.js                # Supabase client with remote connectivity & memory adapter
│
├── models/
│   ├── User.js                    # Supabase-backed User model (bcrypt hash, JWT methods)
│   ├── Task.js                    # Supabase-backed Task model (subtasks, status, priority, joins)
│   └── Category.js                # Supabase-backed Category model (user scoping, colors, icons)
│
├── controllers/
│   ├── authController.js          # Register, login, me, logout, default categories seed
│   ├── taskController.js          # Task CRUD, filters, status patches, stats, CSV export
│   ├── categoryController.js      # Category CRUD with task count aggregations
│   ├── userController.js          # Profile updates, password modification
│   └── adminController.js         # User moderation, activate/disable, platform metrics
│
├── routes/
│   ├── authRoutes.js              # /api/auth endpoints
│   ├── taskRoutes.js              # /api/tasks endpoints
│   ├── categoryRoutes.js          # /api/categories endpoints
│   ├── userRoutes.js              # /api/users endpoints
│   └── adminRoutes.js             # /api/admin endpoints
│
├── middleware/
│   ├── authMiddleware.js          # JWT verification & role authorization guards
│   ├── errorMiddleware.js         # Centralized error handler with Postgres error codes & 404 catcher
│   └── validationMiddleware.js    # Request body sanitization and format checks
│
├── scripts/
│   ├── seed.js                    # Database seeder with realistic demo tasks & users
│   └── test-migration.js          # End-to-end regression test suite
│
├── public/                        # Static frontend assets
│   ├── index.html                 # Landing page & feature showcase
│   ├── login.html                 # Sign-in portal with 1-click demo logins
│   ├── register.html              # Account creation with role selection
│   ├── dashboard.html             # Main workstation SPA (Kanban, List, Stats, Calendar)
│   ├── task.html                  # Deep-link standalone task viewer
│   │
│   ├── css/
│   │   ├── style.css              # Core design tokens, typography, modals, toasts, themes
│   │   ├── dashboard.css          # Metric cards, chart bars, tables, filters
│   │   ├── kanban.css             # Drag and drop swimlanes and card styles
│   │   └── responsive.css         # Mobile drawer navigation and responsive breakpoints
│   │
│   └── js/
│       ├── api.js                 # Centralized fetch client with JWT token injection
│       ├── auth.js                # Session management, authentication, theme switcher
│       ├── notifications.js       # Reusable Toast notification service
│       ├── dashboard.js           # Analytics charts, weekly trend bars, quick lists
│       ├── tasks.js               # Multi-filtering, pagination, subtasks, CRUD modals
│       ├── kanban.js              # HTML5 drag-and-drop Kanban controller
│       ├── calendar.js            # Monthly due-date calendar view
│       ├── categories.js          # Category creator, color pickers, and counters
│       ├── admin.js               # Admin metrics and user management table
│       └── app.js                 # Main router, Pomodoro timer, keyboard shortcuts
│
└── README.md                      # Comprehensive project documentation
```

---

## ⚡ Supabase Setup & Migration Guide

### 1. Apply PostgreSQL Schema in Supabase
1. Open your **Supabase Dashboard** (https://supabase.com/dashboard).
2. Navigate to the **SQL Editor** tab on the left sidebar.
3. Open [`supabase_schema.sql`](file:///c:/Users/ENET29/Task%20manager/supabase_schema.sql), copy its contents, paste them into the SQL Editor, and click **Run**.
4. This script sets up:
   - `users`, `categories`, and `tasks` tables with primary keys (`UUID` via `gen_random_uuid()`)
   - Foreign key constraints with `ON DELETE CASCADE` and `ON DELETE SET NULL`
   - High-performance B-tree & GIN indexes
   - Automatic `updated_at` and `completed_at` database triggers
   - Row Level Security (RLS) policies

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase project API credentials from **Project Settings -> API**:

```ini
PORT=5000
NODE_ENV=development

# Supabase PostgreSQL Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here
SUPABASE_ANON_KEY=your-supabase-anon-key-here

# JWT Authentication
JWT_SECRET=super_secret_jwt_key_task_manager_2026_secure
JWT_EXPIRE=7d
```

> **Note on Zero-Config Local Development:** If `SUPABASE_URL` is not yet configured or in test mode, the application automatically uses an embedded high-performance memory adapter that emulates the Supabase PostgREST query engine. This guarantees instant local testing!

---

## 🚀 Installation & Running

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd "Task manager"
npm install
```

### 2. Seed Demo Accounts & Data (Optional)
The application auto-seeds when starting on an empty database, but you can also manually run:
```bash
npm run seed
```

#### Demo Credentials:
- **Regular User:** `alex@taskmanager.com` / `password123`
- **Admin Director:** `admin@taskmanager.com` / `password123`

### 3. Start the Server
For development with nodemon auto-reload:
```bash
npm run dev
```

For standard production execution:
```bash
npm start
```

Open your browser at: **`http://localhost:5000`**

---

## 📡 RESTful API Documentation

All protected routes require the `Authorization: Bearer <token>` header.

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register user (`name, email, password, role`) |
| `POST` | `/api/auth/login` | Public | Sign in user (`email, password`) |
| `GET` | `/api/auth/me` | Private | Retrieve current user profile |
| `POST` | `/api/auth/logout` | Private | Invalidate session |

### User Profile (`/api/users`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/users/profile` | Private | Get profile details |
| `PUT` | `/api/users/profile` | Private | Update name, bio, avatar, theme |
| `PUT` | `/api/users/password` | Private | Update password (`currentPassword, newPassword`) |

### Tasks (`/api/tasks`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/tasks` | Private | Get tasks (supports `search, status, priority, category, tag, dueFilter, sort, page, limit`) |
| `POST` | `/api/tasks` | Private | Create a task |
| `GET` | `/api/tasks/stats/summary`| Private | Retrieve comprehensive dashboard metrics & weekly trends |
| `GET` | `/api/tasks/export/csv` | Private | Download all user tasks as CSV spreadsheet |
| `GET` | `/api/tasks/:id` | Private | Get single task by ID |
| `PUT` | `/api/tasks/:id` | Private | Update task details |
| `DELETE` | `/api/tasks/:id` | Private | Delete a task |
| `PATCH` | `/api/tasks/:id/status` | Private | Update status (`To Do, In Progress, Completed, Archived`) |
| `PATCH` | `/api/tasks/:id/archive`| Private | Toggle task archived state |
| `PATCH` | `/api/tasks/:id/favorite`| Private | Toggle task favorite state |
| `PATCH` | `/api/tasks/:id/subtasks`| Private | Update subtasks array checklist |
| `POST` | `/api/tasks/:id/duplicate`| Private | Duplicate task |

### Categories (`/api/categories`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/categories` | Private | List categories with task count aggregations |
| `POST` | `/api/categories` | Private | Create category (`name, color, icon, description`) |
| `PUT` | `/api/categories/:id` | Private | Update category |
| `DELETE` | `/api/categories/:id` | Private | Delete category and unlink assigned tasks |

### Admin Console (`/api/admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/admin/stats` | Admin | Retrieve platform-wide user and task metrics |
| `GET` | `/api/admin/users` | Admin | List all registered users with task activity |
| `PATCH` | `/api/admin/users/:id/status` | Admin | Toggle user active/disabled status |
| `DELETE` | `/api/admin/users/:id` | Admin | Delete user and all associated records |

---

## 📸 Screenshots & UI Previews
*(Place your application screenshots in `public/assets/` and link here)*
- **Executive Dashboard:** Weekly productivity bar charts, distribution gauges, overdue alert banners.
- **Kanban Board:** Native drag-and-drop swimlanes with real-time sync.
- **Tasks Filter View:** Multi-select filtering, tags, subtask progress, and pagination.
- **Dark & Light Modes:** Tailored color palettes for high contrast and visual appeal.

---

## 🔮 Future Improvements
1. **Real-time Collaboration:** WebSockets via Socket.IO for multi-user boards.
2. **File Attachments:** S3 / Cloudinary integration for task attachment uploads.
3. **Recurring Tasks:** Automatic weekly/monthly scheduled recurrence.
4. **Push Reminders:** Browser Notification API for deadlines due within 1 hour.

---

## 📄 License
MIT License. Open for educational and commercial productivity software development.
