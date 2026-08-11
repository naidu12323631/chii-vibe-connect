
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  plan_time TIMESTAMPTZ,
  max_participants INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans viewable by authenticated" ON public.plans
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create their own plans" ON public.plans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plans" ON public.plans
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plans" ON public.plans
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.plan_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.plan_participants TO authenticated;
GRANT ALL ON public.plan_participants TO service_role;

ALTER TABLE public.plan_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants viewable by authenticated" ON public.plan_participants
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join plans" ON public.plan_participants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave plans" ON public.plan_participants
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
