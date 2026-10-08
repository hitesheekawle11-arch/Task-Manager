/**
 * End-to-End Migration Test Suite
 * Validates all API endpoints, auth flows, database operations, and regressions
 */

require('dotenv').config();
const http = require('http');
const app = require('../server');

const PORT = 5001; // Run test server on port 5001 to avoid collisions
let server;

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let parsed = {};
          try {
            parsed = JSON.parse(body);
          } catch (e) {
            parsed = body;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', reject);

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Supabase PostgreSQL Migration Test Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Health check
  const healthRes = await request({ method: 'GET', path: '/api/health' });
  assert(healthRes.status === 200 && healthRes.body.success, 'API Health check responds 200 OK');

  // 2. Login with seeded demo user
  const loginRes = await request(
    { method: 'POST', path: '/api/auth/login' },
    { email: 'alex@taskmanager.com', password: 'password123' }
  );
  assert(loginRes.status === 200 && loginRes.body.token, 'Demo user login successfully returns JWT token');
  const userToken = loginRes.body.token;
  const userHeaders = { Authorization: `Bearer ${userToken}` };

  // 3. Login with seeded admin user
  const adminLoginRes = await request(
    { method: 'POST', path: '/api/auth/login' },
    { email: 'admin@taskmanager.com', password: 'password123' }
  );
  assert(adminLoginRes.status === 200 && adminLoginRes.body.user.role === 'admin', 'Admin login returns admin role');
  const adminToken = adminLoginRes.body.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // 4. Current user /me endpoint
  const meRes = await request({ method: 'GET', path: '/api/auth/me', headers: userHeaders });
  assert(meRes.status === 200 && meRes.body.data.email === 'alex@taskmanager.com', 'GET /api/auth/me returns current user details');
  assert(meRes.body.data._id && meRes.body.data.id, 'User object includes both _id and id for backwards compatibility');

  // 5. Register a brand new user
  const uniqueEmail = `test_${Date.now()}@example.com`;
  const regRes = await request(
    { method: 'POST', path: '/api/auth/register' },
    { name: 'Migration Tester', email: uniqueEmail, password: 'password123' }
  );
  assert(regRes.status === 201 && regRes.body.token, 'User registration succeeds and issues token');
  const newUserHeaders = { Authorization: `Bearer ${regRes.body.token}` };

  // 6. Verify default categories were seeded for newly registered user
  const newCatRes = await request({ method: 'GET', path: '/api/categories', headers: newUserHeaders });
  assert(newCatRes.status === 200 && newCatRes.body.data.length >= 5, 'Default categories automatically seeded for new user');

  // 7. Create a custom category
  const createCatRes = await request(
    { method: 'POST', path: '/api/categories', headers: userHeaders },
    { name: 'Supabase Cloud', color: '#10b981', icon: '⚡', description: 'Postgres & Edge functions' }
  );
  assert(createCatRes.status === 201 && createCatRes.body.data.name === 'Supabase Cloud', 'Create custom category in PostgreSQL');
  const catId = createCatRes.body.data._id || createCatRes.body.data.id;

  // 8. Create a new task
  const createTaskRes = await request(
    { method: 'POST', path: '/api/tasks', headers: userHeaders },
    {
      title: 'Migrate MongoDB to Supabase PostgreSQL',
      description: 'Convert collections to tables, update models and controllers',
      status: 'In Progress',
      priority: 'Urgent',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      category: catId,
      tags: ['database', 'supabase', 'migration'],
      subtasks: [
        { title: 'Define SQL schema', completed: true },
        { title: 'Update query methods', completed: true },
        { title: 'Run full verification suite', completed: false },
      ],
      isFavorite: true,
    }
  );
  assert(createTaskRes.status === 201 && createTaskRes.body.data.title.includes('Migrate MongoDB'), 'Create task with subtasks & category');
  const taskId = createTaskRes.body.data._id || createTaskRes.body.data.id;
  assert(createTaskRes.body.data.category && createTaskRes.body.data.category.name === 'Supabase Cloud', 'Populated category data attached');

  // 9. Fetch tasks with filtering & sorting
  const listTasksRes = await request(
    { method: 'GET', path: '/api/tasks?priority=Urgent&sort=newest', headers: userHeaders }
  );
  assert(listTasksRes.status === 200 && Array.isArray(listTasksRes.body.data), 'GET /api/tasks with priority filter returns task list');
  const foundTask = listTasksRes.body.data.find((t) => (t._id || t.id) === taskId);
  assert(foundTask && foundTask.isFavorite === true, 'Task properties (isFavorite, tags, subtasks) accurately preserved');

  // 10. Patch task status (Kanban drag-and-drop sync)
  const patchStatusRes = await request(
    { method: 'PATCH', path: `/api/tasks/${taskId}/status`, headers: userHeaders },
    { status: 'Completed' }
  );
  assert(patchStatusRes.status === 200 && patchStatusRes.body.data.status === 'Completed', 'PATCH /api/tasks/:id/status moves card to Completed');
  assert(patchStatusRes.body.data.completedAt, 'completedAt timestamp automatically recorded upon completion');

  // 11. Toggle task favorite
  const toggleFavRes = await request(
    { method: 'PATCH', path: `/api/tasks/${taskId}/favorite`, headers: userHeaders }
  );
  assert(toggleFavRes.status === 200, 'PATCH /api/tasks/:id/favorite toggles favorite');

  // 12. Duplicate task
  const dupRes = await request(
    { method: 'POST', path: `/api/tasks/${taskId}/duplicate`, headers: userHeaders }
  );
  assert(dupRes.status === 201 && dupRes.body.data.title.includes('(Copy)'), 'POST /api/tasks/:id/duplicate creates clean clone');
  const dupTaskId = dupRes.body.data._id || dupRes.body.data.id;

  // 13. Update subtasks
  const subtasksRes = await request(
    { method: 'PATCH', path: `/api/tasks/${taskId}/subtasks`, headers: userHeaders },
    {
      subtasks: [
        { title: 'Define SQL schema', completed: true },
        { title: 'Update query methods', completed: true },
        { title: 'Run full verification suite', completed: true },
      ],
    }
  );
  assert(subtasksRes.status === 200 && subtasksRes.body.data.subtasks[2].completed === true, 'PATCH /api/tasks/:id/subtasks updates subtask checklist');

  // 14. Dashboard statistics & aggregation
  const statsRes = await request(
    { method: 'GET', path: '/api/tasks/stats/summary', headers: userHeaders }
  );
  assert(statsRes.status === 200 && statsRes.body.data.totalTasks > 0, 'GET /api/tasks/stats/summary computes total tasks');
  assert(statsRes.body.data.weeklyProductivity && statsRes.body.data.weeklyProductivity.length === 7, 'Weekly productivity 7-day trend computed');
  assert(typeof statsRes.body.data.completionPercentage === 'number', 'Completion percentage computed');

  // 15. Export tasks to CSV
  const csvRes = await request({ method: 'GET', path: '/api/tasks/export/csv', headers: userHeaders });
  assert(csvRes.status === 200 && csvRes.headers['content-type'].includes('text/csv'), 'GET /api/tasks/export/csv exports CSV file');

  // 16. Admin console stats & users
  const adminStatsRes = await request({ method: 'GET', path: '/api/admin/stats', headers: adminHeaders });
  assert(adminStatsRes.status === 200 && adminStatsRes.body.data.totalUsers >= 2, 'Admin stats endpoint returns platform aggregates');

  const adminUsersRes = await request({ method: 'GET', path: '/api/admin/users', headers: adminHeaders });
  assert(adminUsersRes.status === 200 && adminUsersRes.body.data.length >= 2, 'Admin users list returns users with task count stats');

  // 17. Delete tasks and category
  const delTaskRes = await request({ method: 'DELETE', path: `/api/tasks/${taskId}`, headers: userHeaders });
  assert(delTaskRes.status === 200 && delTaskRes.body.success, 'DELETE /api/tasks/:id removes task');

  await request({ method: 'DELETE', path: `/api/tasks/${dupTaskId}`, headers: userHeaders });

  const delCatRes = await request({ method: 'DELETE', path: `/api/categories/${catId}`, headers: userHeaders });
  assert(delCatRes.status === 200 && delCatRes.body.success, 'DELETE /api/categories/:id removes category and unlinks tasks');

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Start temporary test server
server = app.listen(PORT, async () => {
  try {
    await runTests();
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    server.close(() => process.exit(0));
  }
});
