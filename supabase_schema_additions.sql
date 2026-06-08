-- Table for registered mobile application users
CREATE TABLE IF NOT EXISTS public.mobile_users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  picture TEXT,
  provider TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en-IN',
  theme TEXT NOT NULL DEFAULT 'dark',
  notifications BOOLEAN NOT NULL DEFAULT true,
  subscription_plan TEXT NOT NULL DEFAULT 'basic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for guest login activities
CREATE TABLE IF NOT EXISTS public.guest_login_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name TEXT NOT NULL,
  login_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mobile_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_login_activity ENABLE ROW LEVEL SECURITY;

-- Allow open read and write access policies for backend/service-role API
CREATE POLICY "Allow service-role read users" ON public.mobile_users FOR SELECT USING (true);
CREATE POLICY "Allow service-role write users" ON public.mobile_users FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow service-role read guest_activities" ON public.guest_login_activity FOR SELECT USING (true);
CREATE POLICY "Allow service-role write guest_activities" ON public.guest_login_activity FOR ALL USING (true) WITH CHECK (true);
