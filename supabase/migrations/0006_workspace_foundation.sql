create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  status text not null default 'draft' check (status in ('draft', 'ready_for_review', 'active', 'archived')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index workspaces_customer_id_idx
  on public.workspaces(customer_id);

create index workspaces_customer_status_idx
  on public.workspaces(customer_id, status);

create index workspaces_customer_created_at_idx
  on public.workspaces(customer_id, created_at desc);

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

alter table public.workspaces enable row level security;

create policy "Users can read their workspaces"
on public.workspaces for select to authenticated
using (
  customer_id = (select public.current_customer_id())
);

create policy "Owners can create their workspaces"
on public.workspaces for insert to authenticated
with check (
  (select public.is_customer_owner(customer_id))
  and created_by = (select auth.uid())
);

create policy "Owners can update their workspaces"
on public.workspaces for update to authenticated
using (
  (select public.is_customer_owner(customer_id))
)
with check (
  (select public.is_customer_owner(customer_id))
);

create table public.onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid null references public.workspaces(id) on delete set null,
  status text not null default 'in_progress' check (status in ('in_progress', 'awaiting_input', 'completed', 'abandoned')),
  version integer not null default 1 check (version >= 1),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_question_key text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index onboarding_sessions_customer_id_idx
  on public.onboarding_sessions(customer_id);

create index onboarding_sessions_workspace_id_idx
  on public.onboarding_sessions(workspace_id);

create index onboarding_sessions_customer_status_idx
  on public.onboarding_sessions(customer_id, status);

create index onboarding_sessions_customer_started_at_idx
  on public.onboarding_sessions(customer_id, started_at desc);

create trigger onboarding_sessions_set_updated_at
before update on public.onboarding_sessions
for each row execute function public.set_updated_at();

alter table public.onboarding_sessions enable row level security;

create policy "Users can read their onboarding sessions"
on public.onboarding_sessions for select to authenticated
using (
  customer_id = (select public.current_customer_id())
);

create policy "Owners can create their onboarding sessions"
on public.onboarding_sessions for insert to authenticated
with check (
  (select public.is_customer_owner(customer_id))
  and created_by = (select auth.uid())
);

create policy "Owners can update their onboarding sessions"
on public.onboarding_sessions for update to authenticated
using (
  (select public.is_customer_owner(customer_id))
)
with check (
  (select public.is_customer_owner(customer_id))
);

create table public.onboarding_answers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  onboarding_session_id uuid not null references public.onboarding_sessions(id) on delete cascade,
  question_key text not null check (char_length(trim(question_key)) between 1 and 120),
  answer_json jsonb not null default '{}'::jsonb,
  normalized_facts jsonb not null default '{}'::jsonb,
  answer_status text not null default 'answered' check (answer_status in ('answered', 'updated', 'superseded', 'rejected')),
  is_latest boolean not null default true,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index onboarding_answers_customer_id_idx
  on public.onboarding_answers(customer_id);

create index onboarding_answers_session_id_idx
  on public.onboarding_answers(onboarding_session_id);

create index onboarding_answers_session_question_idx
  on public.onboarding_answers(onboarding_session_id, question_key);

create index onboarding_answers_customer_question_idx
  on public.onboarding_answers(customer_id, question_key);

create unique index onboarding_answers_latest_per_question
  on public.onboarding_answers(onboarding_session_id, question_key)
  where is_latest = true;

create trigger onboarding_answers_set_updated_at
before update on public.onboarding_answers
for each row execute function public.set_updated_at();

alter table public.onboarding_answers enable row level security;

create policy "Users can read their onboarding answers"
on public.onboarding_answers for select to authenticated
using (
  customer_id = (select public.current_customer_id())
);

create policy "Owners can create their onboarding answers"
on public.onboarding_answers for insert to authenticated
with check (
  (select public.is_customer_owner(customer_id))
);

create policy "Owners can update their onboarding answers"
on public.onboarding_answers for update to authenticated
using (
  (select public.is_customer_owner(customer_id))
)
with check (
  (select public.is_customer_owner(customer_id))
);

create table public.workspace_blueprints (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  onboarding_session_id uuid null references public.onboarding_sessions(id) on delete set null,
  version integer not null default 1 check (version >= 1),
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'rejected', 'archived')),
  source text not null default 'onboarding' check (source in ('onboarding', 'manual', 'merge')),
  business_summary jsonb not null default '{}'::jsonb,
  extracted_facts jsonb not null default '{}'::jsonb,
  blueprint jsonb not null default '{}'::jsonb,
  validation_errors jsonb,
  review_notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz
);

create index workspace_blueprints_customer_id_idx
  on public.workspace_blueprints(customer_id);

create index workspace_blueprints_workspace_id_idx
  on public.workspace_blueprints(workspace_id);

create index workspace_blueprints_customer_status_idx
  on public.workspace_blueprints(customer_id, status);

create index workspace_blueprints_created_at_idx
  on public.workspace_blueprints(customer_id, created_at desc);

create unique index workspace_blueprints_unique_version_per_workspace
  on public.workspace_blueprints(workspace_id, version);

create trigger workspace_blueprints_set_updated_at
before update on public.workspace_blueprints
for each row execute function public.set_updated_at();

alter table public.workspace_blueprints enable row level security;

create policy "Users can read their workspace blueprints"
on public.workspace_blueprints for select to authenticated
using (
  customer_id = (select public.current_customer_id())
);

create policy "Owners can create their workspace blueprints"
on public.workspace_blueprints for insert to authenticated
with check (
  (select public.is_customer_owner(customer_id))
  and created_by = (select auth.uid())
);

create policy "Owners can update their workspace blueprints"
on public.workspace_blueprints for update to authenticated
using (
  (select public.is_customer_owner(customer_id))
)
with check (
  (select public.is_customer_owner(customer_id))
);
