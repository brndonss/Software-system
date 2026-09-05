create table public.business_leads (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  lead_name text not null check (char_length(trim(lead_name)) between 1 and 200),
  lead_source text not null default 'website' check (lead_source in ('website', 'referral', 'social', 'paid_ads', 'other')),
  status text not null default 'new' check (status in ('new', 'qualified', 'follow_up', 'closed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_tasks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed')),
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_follow_ups (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  related_type text not null default 'lead' check (related_type in ('lead', 'customer')),
  related_id uuid,
  title text not null check (char_length(trim(title)) between 1 and 200),
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed')),
  scheduled_for timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_activity_log (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  automation text not null default 'system',
  action text not null,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed', 'paused')),
  result_summary text,
  approval_status text not null default 'approved' check (approval_status in ('pending', 'approved', 'rejected', 'paused', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create table public.business_automations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  automation_key text not null,
  title text not null,
  description text,
  problem text,
  workflow text,
  status text not null default 'recommended' check (status in ('recommended', 'active', 'paused', 'rejected')),
  enabled boolean not null default false,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected', 'paused', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.marketing_campaign_drafts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null,
  objective text,
  target_audience text,
  ad_copy text,
  creative_concept text,
  suggested_budget text,
  landing_page_concept text,
  tracking_plan text,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'published')),
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected', 'paused', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index business_leads_customer_id_idx on public.business_leads(customer_id);
create index business_tasks_customer_id_idx on public.business_tasks(customer_id);
create index business_follow_ups_customer_id_idx on public.business_follow_ups(customer_id);
create index business_activity_log_customer_id_idx on public.business_activity_log(customer_id);
create index business_automations_customer_id_idx on public.business_automations(customer_id);
create index marketing_campaign_drafts_customer_id_idx on public.marketing_campaign_drafts(customer_id);

create trigger business_leads_set_updated_at before update on public.business_leads for each row execute function public.set_updated_at();
create trigger business_tasks_set_updated_at before update on public.business_tasks for each row execute function public.set_updated_at();
create trigger business_follow_ups_set_updated_at before update on public.business_follow_ups for each row execute function public.set_updated_at();
create trigger business_automations_set_updated_at before update on public.business_automations for each row execute function public.set_updated_at();
create trigger marketing_campaign_drafts_set_updated_at before update on public.marketing_campaign_drafts for each row execute function public.set_updated_at();

alter table public.business_leads enable row level security;
alter table public.business_tasks enable row level security;
alter table public.business_follow_ups enable row level security;
alter table public.business_activity_log enable row level security;
alter table public.business_automations enable row level security;
alter table public.marketing_campaign_drafts enable row level security;

create policy "Owners can read their leads" on public.business_leads for select to authenticated using ((select public.is_customer_owner(customer_id)));
create policy "Owners can create their leads" on public.business_leads for insert to authenticated with check ((select public.is_customer_owner(customer_id)));
create policy "Owners can update their leads" on public.business_leads for update to authenticated using ((select public.is_customer_owner(customer_id))) with check ((select public.is_customer_owner(customer_id)));

create policy "Owners can read their tasks" on public.business_tasks for select to authenticated using ((select public.is_customer_owner(customer_id)));
create policy "Owners can create their tasks" on public.business_tasks for insert to authenticated with check ((select public.is_customer_owner(customer_id)));
create policy "Owners can update their tasks" on public.business_tasks for update to authenticated using ((select public.is_customer_owner(customer_id))) with check ((select public.is_customer_owner(customer_id)));

create policy "Owners can read their follow-ups" on public.business_follow_ups for select to authenticated using ((select public.is_customer_owner(customer_id)));
create policy "Owners can create their follow-ups" on public.business_follow_ups for insert to authenticated with check ((select public.is_customer_owner(customer_id)));
create policy "Owners can update their follow-ups" on public.business_follow_ups for update to authenticated using ((select public.is_customer_owner(customer_id))) with check ((select public.is_customer_owner(customer_id)));

create policy "Owners can read their activity" on public.business_activity_log for select to authenticated using ((select public.is_customer_owner(customer_id)));
create policy "Owners can create their activity" on public.business_activity_log for insert to authenticated with check ((select public.is_customer_owner(customer_id)));

create policy "Owners can read their automations" on public.business_automations for select to authenticated using ((select public.is_customer_owner(customer_id)));
create policy "Owners can create their automations" on public.business_automations for insert to authenticated with check ((select public.is_customer_owner(customer_id)));
create policy "Owners can update their automations" on public.business_automations for update to authenticated using ((select public.is_customer_owner(customer_id))) with check ((select public.is_customer_owner(customer_id)));

create policy "Owners can read campaign drafts" on public.marketing_campaign_drafts for select to authenticated using ((select public.is_customer_owner(customer_id)));
create policy "Owners can create campaign drafts" on public.marketing_campaign_drafts for insert to authenticated with check ((select public.is_customer_owner(customer_id)));
create policy "Owners can update campaign drafts" on public.marketing_campaign_drafts for update to authenticated using ((select public.is_customer_owner(customer_id))) with check ((select public.is_customer_owner(customer_id)));
