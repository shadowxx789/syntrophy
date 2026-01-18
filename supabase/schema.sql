-- 凝序 Syntropy - Supabase Database Schema
-- Phase 5: User System
-- Run this in Supabase SQL Editor to set up the database

-- ============================================
-- 1. USER PROFILES (extends Supabase Auth)
-- ============================================
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only CRUD their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. PROJECTS TABLE
-- ============================================
CREATE TABLE public.projects (
  id TEXT NOT NULL,                              -- PROJ-XXXX format
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  display_order INT DEFAULT 0,
  color TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,                        -- Soft delete
  PRIMARY KEY (id, user_id)
);

-- Create index for faster queries
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_updated_at ON public.projects(updated_at);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Users can only CRUD their own projects
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 3. TASKS TABLE
-- ============================================
CREATE TABLE public.tasks (
  id TEXT NOT NULL,                              -- SYN-2026-XXXX format
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id TEXT NOT NULL,
  content TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high') OR priority IS NULL),
  raw_command TEXT,                              -- Original AI command
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,                        -- Soft delete
  PRIMARY KEY (id, user_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_updated_at ON public.tasks(updated_at);
CREATE INDEX idx_tasks_status ON public.tasks(status);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Users can only CRUD their own tasks
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 4. SYNC METADATA TABLE
-- ============================================
CREATE TABLE public.sync_metadata (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  last_sync_at TIMESTAMPTZ,
  device_id TEXT,
  sync_version INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.sync_metadata ENABLE ROW LEVEL SECURITY;

-- Users can only CRUD their own sync metadata
CREATE POLICY "Users can view own sync_metadata" ON public.sync_metadata
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync_metadata" ON public.sync_metadata
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync_metadata" ON public.sync_metadata
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sync_metadata_updated_at
  BEFORE UPDATE ON public.sync_metadata
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 6. SYNC HELPER FUNCTION
-- ============================================

-- Function to get changes since last sync
CREATE OR REPLACE FUNCTION public.get_changes_since(
  p_user_id UUID,
  p_since TIMESTAMPTZ
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id TEXT,
  data JSONB,
  is_deleted BOOLEAN
) AS $$
BEGIN
  -- Return tasks changed since timestamp
  RETURN QUERY
  SELECT 
    'task'::TEXT as entity_type,
    t.id as entity_id,
    to_jsonb(t) as data,
    (t.deleted_at IS NOT NULL) as is_deleted
  FROM public.tasks t
  WHERE t.user_id = p_user_id
    AND t.updated_at > p_since;

  -- Return projects changed since timestamp
  RETURN QUERY
  SELECT 
    'project'::TEXT as entity_type,
    p.id as entity_id,
    to_jsonb(p) as data,
    (p.deleted_at IS NOT NULL) as is_deleted
  FROM public.projects p
  WHERE p.user_id = p_user_id
    AND p.updated_at > p_since;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
