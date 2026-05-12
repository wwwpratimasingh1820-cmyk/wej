-- Migration: 00_init.sql

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  points INTEGER DEFAULT 0 CHECK (points >= 0),
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) NOT NULL,
  image_url TEXT NOT NULL,
  full_image_url TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  preview_text TEXT NOT NULL,
  is_curated BOOLEAN DEFAULT FALSE,
  duplicate_of UUID REFERENCES posts(id),
  jumpstart_phase SMALLINT DEFAULT 1,
  hidden BOOLEAN DEFAULT FALSE,
  report_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) NOT NULL,
  unlocker_id UUID REFERENCES users(id) NOT NULL,
  method TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  score INTEGER CHECK (score >= 1 AND score <= 5) NOT NULL,
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  related_post_id UUID REFERENCES posts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports table for tracking post reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) NOT NULL,
  reporter_id UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, reporter_id)
);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Profiles are viewable by everyone." ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON users FOR UPDATE USING (auth.uid() = id);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are viewable by everyone." ON posts FOR SELECT USING (true);
CREATE POLICY "Users can insert own posts." ON posts FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update own posts." ON posts FOR UPDATE USING (auth.uid() = creator_id);

ALTER TABLE reveals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reveals." ON reveals FOR SELECT USING (auth.uid() = unlocker_id);
-- Note: inserting to reveals is handled by edge function to prevent cheating

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ratings are viewable by everyone." ON ratings FOR SELECT USING (true);
-- Note: inserting rating can be done via RLS or Edge Function. Edge function is safer for calculating averages.

ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ledger entries." ON points_ledger FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own reports." ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Storage bucket creation (Requires superuser, but often done via Dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('post-images-public', 'post-images-public', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('post-images-private', 'post-images-private', false) ON CONFLICT DO NOTHING;

-- Trigger to create user automatically on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, username, avatar_url)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)), new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger for auto-hiding posts with >= 3 reports
CREATE OR REPLACE FUNCTION public.handle_new_report()
RETURNS trigger AS $$
DECLARE
  count_reports INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_reports FROM public.reports WHERE post_id = NEW.post_id;
  UPDATE public.posts SET report_count = count_reports WHERE id = NEW.post_id;
  IF count_reports >= 3 THEN
    UPDATE public.posts SET hidden = true WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_report_created
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_report();

-- Bayesian Rating Feed calculation
CREATE OR REPLACE FUNCTION get_feed(p_offset INTEGER DEFAULT 0, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID, creator_id UUID, image_url TEXT, preview_text TEXT, 
  is_curated BOOLEAN, created_at TIMESTAMPTZ, bayesian_rating FLOAT, rating_count BIGINT
) AS $$
DECLARE
  global_avg_rating FLOAT;
  m INTEGER := 5;
BEGIN
  SELECT COALESCE(AVG(score), 3.0) INTO global_avg_rating FROM ratings;
  
  RETURN QUERY
  SELECT 
    p.id, p.creator_id, p.image_url, p.preview_text, p.is_curated, p.created_at,
    CASE 
      WHEN COUNT(r.score) = 0 THEN global_avg_rating
      ELSE ((COUNT(r.score)::FLOAT / (COUNT(r.score)::FLOAT + m)) * AVG(r.score)) + 
           ((m::FLOAT / (COUNT(r.score)::FLOAT + m)) * global_avg_rating)
    END as bayesian_rating,
    COUNT(r.score) as rating_count
  FROM posts p
  LEFT JOIN ratings r ON p.id = r.post_id
  WHERE p.hidden = false
  GROUP BY p.id
  ORDER BY bayesian_rating DESC, p.created_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
