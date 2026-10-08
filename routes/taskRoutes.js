const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  toggleTaskArchive,
  duplicateTask,
  toggleFavorite,
  updateSubtasks,
  getTaskStats,
  exportTasksCSV,
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');
const { validateTask } = require('../middleware/validationMiddleware');

router.use(protect);

// Specialized endpoints before parameterized /:id
router.get('/stats/summary', getTaskStats);
router.get('/export/csv', exportTasksCSV);

// Standard task collection routes
router.route('/')
  .get(getTasks)
  .post(validateTask, createTask);

// Task individual operations
router.route('/:id')
  .get(getTaskById)
  .put(validateTask, updateTask)
  .delete(deleteTask);

// Quick status and toggle endpoints
router.patch('/:id/status', updateTaskStatus);
router.patch('/:id/archive', toggleTaskArchive);
router.patch('/:id/favorite', toggleFavorite);
router.patch('/:id/subtasks', updateSubtasks);
router.post('/:id/duplicate', duplicateTask);

module.exports = router;
