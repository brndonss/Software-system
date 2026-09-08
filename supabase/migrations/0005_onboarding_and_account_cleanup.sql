alter table public.customer_onboarding
  add column if not exists onboarding_data jsonb not null default '{}'::jsonb;

create table if not exists public.account_deletion_events (
  id uuid primary key default gen_random_uuid(),
  deleted_user_id uuid not null,
  customer_id uuid,
  deleted_at timestamptz not null default now(),
  reason text not null default 'self_service_delete',
  affected_records jsonb not null default '{}'::jsonb
);

create or replace function public.delete_customer_account_for_user(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_customer_id uuid;
  affected jsonb;
begin
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  select customer_id
  into target_customer_id
  from public.user_profiles
  where id = target_user_id
  limit 1;

  if target_customer_id is null then
    return false;
  end if;

  affected := jsonb_build_object(
    'customer_id', target_customer_id,
    'business_leads', (select count(*) from public.business_leads where customer_id = target_customer_id),
    'business_tasks', (select count(*) from public.business_tasks where customer_id = target_customer_id),
    'business_follow_ups', (select count(*) from public.business_follow_ups where customer_id = target_customer_id),
    'business_automations', (select count(*) from public.business_automations where customer_id = target_customer_id),
    'marketing_campaign_drafts', (select count(*) from public.marketing_campaign_drafts where customer_id = target_customer_id),
    'system_builds', (select count(*) from public.system_builds where customer_id = target_customer_id),
    'system_configurations', (select count(*) from public.system_configurations where customer_id = target_customer_id),
    'customer_onboarding', (select count(*) from public.customer_onboarding where customer_id = target_customer_id)
  );

  insert into public.account_deletion_events (deleted_user_id, customer_id, reason, affected_records)
  values (target_user_id, target_customer_id, 'self_service_delete', affected);

  delete from public.business_activity_log where customer_id = target_customer_id;
  delete from public.business_automations where customer_id = target_customer_id;
  delete from public.business_follow_ups where customer_id = target_customer_id;
  delete from public.business_leads where customer_id = target_customer_id;
  delete from public.business_tasks where customer_id = target_customer_id;
  delete from public.marketing_campaign_drafts where customer_id = target_customer_id;
  delete from public.system_configurations where customer_id = target_customer_id;
  delete from public.system_builds where customer_id = target_customer_id;
  delete from public.customer_onboarding where customer_id = target_customer_id;
  delete from public.user_profiles where id = target_user_id;

  delete from public.customers
  where id = target_customer_id
    and not exists (
      select 1 from public.user_profiles where customer_id = target_customer_id
    );

  return true;
end;
$$;

grant execute on function public.delete_customer_account_for_user(uuid) to service_role;
