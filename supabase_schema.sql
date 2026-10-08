-- ==============================================================================
-- TASKFLOW PRO: Supabase PostgreSQL Schema
-- ==============================================================================
-- This script sets up all tables, foreign keys, constraints, indexes, triggers,
-- and Row Level Security (RLS) policies for TaskFlow Pro.
--
-- How to apply:
-- 1. Open your Supabase Project Dashboard (https://supabase.com/dashboard)
-- 2. Go to the "SQL Editor" tab on the left sidebar
-- 3. Click "New Query", paste the entire contents of this file, and click "Run"
-- ==============================================================================

-- Enable UUID extension for auto-generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. DROP EXISTING OBJECTS (Optional clean slate for migrations)
-- ==============================================================================
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP FUNCTION IF EXISTS update_timestamp CASCADE;
DROP FUNCTION IF EXISTS sync_task_completed_at CASCADE;

-- ==============================================================================
-- 2. USERS TABLE
-- ==============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    bio VARCHAR(200) DEFAULT '',
    theme_preference VARCHAR(10) DEFAULT 'dark' CHECK (theme_preference IN ('dark', 'light')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. CATEGORIES TABLE
-- ==============================================================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(40) NOT NULL,
    color VARCHAR(20) DEFAULT '#6366f1',
    description VARCHAR(150) DEFAULT '',
    icon VARCHAR(10) DEFAULT '📁',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT categories_user_id_name_unique UNIQUE (user_id, name)
);

-- ==============================================================================
-- 4. TASKS TABLE
-- ==============================================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    title VARCHAR(120) NOT NULL,
    description TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'To Do' CHECK (status IN ('To Do', 'In Progress', 'Completed', 'Archived')),
    priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    due_date TIMESTAMPTZ DEFAULT NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    subtasks JSONB DEFAULT '[]'::jsonb,
    notes TEXT DEFAULT '',
    is_favorite BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. PERFORMANCE INDEXES
-- ==============================================================================
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Categories
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_name ON categories(name);

-- Tasks
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_category_id ON tasks(category_id);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_user_priority ON tasks(user_id, priority);
CREATE INDEX idx_tasks_user_due_date ON tasks(user_id, due_date);
CREATE INDEX idx_tasks_user_created_at ON tasks(user_id, created_at DESC);
CREATE INDEX idx_tasks_is_favorite ON tasks(user_id, is_favorite);
CREATE INDEX idx_tasks_tags_gin ON tasks USING GIN (tags);

-- ==============================================================================
-- 6. AUTOMATED TIMESTAMP & STATUS TRIGGERS
-- ==============================================================================
-- Universal updated_at timestamp refresher
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Automatically maintain completed_at when task status changes
CREATE OR REPLACE FUNCTION sync_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Completed' AND OLD.status IS DISTINCT FROM 'Completed' THEN
        NEW.completed_at = COALESCE(NEW.completed_at, NOW());
    ELSIF NEW.status <> 'Completed' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tasks_completed_at
BEFORE INSERT OR UPDATE OF status ON tasks
FOR EACH ROW EXECUTE FUNCTION sync_task_completed_at();

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow full backend service access (Backend uses service role key or API keys)
CREATE POLICY "Full access for service role on users"
    ON users FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Full access for service role on categories"
    ON categories FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Full access for service role on tasks"
    ON tasks FOR ALL
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to manage their own categories & tasks if queried directly via Supabase client with auth headers
CREATE POLICY "Users can view own record"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can manage own categories"
    ON categories FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own tasks"
    ON tasks FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
