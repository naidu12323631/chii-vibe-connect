
CREATE OR REPLACE FUNCTION public.is_plan_member(_plan_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.plans WHERE id = _plan_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.plan_participants WHERE plan_id = _plan_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_plan_host(_plan_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.plans WHERE id = _plan_id AND user_id = _user_id);
$$;

CREATE TABLE public.plan_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX plan_messages_plan_created_idx ON public.plan_messages (plan_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.plan_messages TO authenticated;
GRANT ALL ON public.plan_messages TO service_role;

ALTER TABLE public.plan_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view plan messages"
  ON public.plan_messages FOR SELECT
  TO authenticated
  USING (public.is_plan_member(plan_id, auth.uid()));

CREATE POLICY "Members can send plan messages"
  ON public.plan_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_plan_member(plan_id, auth.uid()));

CREATE POLICY "Sender or host can delete messages"
  ON public.plan_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_plan_host(plan_id, auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_messages;
ALTER TABLE public.plan_messages REPLICA IDENTITY FULL;
