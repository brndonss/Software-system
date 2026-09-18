create or replace function public.save_onboarding_answer(
  p_session_id uuid,
  p_customer_id uuid,
  p_question_key text,
  p_answer_json jsonb,
  p_normalized_facts jsonb
)
returns table (
  id uuid,
  customer_id uuid,
  onboarding_session_id uuid,
  question_key text,
  answer_json jsonb,
  normalized_facts jsonb,
  answer_status text,
  is_latest boolean,
  version integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  session_status text;
  previous_id uuid;
  answer_version integer;
begin
  if p_customer_id is distinct from public.current_customer_id()
    or not public.is_customer_owner(p_customer_id) then
    raise exception 'customer scope forbidden' using errcode = '42501';
  end if;

  select status
  into session_status
  from public.onboarding_sessions
  where id = p_session_id
    and customer_id = p_customer_id
  for update;

  if not found then
    raise exception 'onboarding session not found' using errcode = 'P0002';
  end if;

  if session_status in ('completed', 'abandoned') then
    raise exception 'onboarding session is not writable' using errcode = 'P0003';
  end if;

  select id, version
  into previous_id, answer_version
  from public.onboarding_answers
  where onboarding_session_id = p_session_id
    and customer_id = p_customer_id
    and question_key = p_question_key
    and is_latest = true
  for update;

  if found then
    update public.onboarding_answers
    set is_latest = false,
        answer_status = case when answer_status in ('answered', 'updated') then 'superseded' else answer_status end,
        updated_at = now()
    where id = previous_id;
  else
    answer_version := 0;
  end if;

  insert into public.onboarding_answers (
    customer_id,
    onboarding_session_id,
    question_key,
    answer_json,
    normalized_facts,
    answer_status,
    is_latest,
    version
  )
  values (
    p_customer_id,
    p_session_id,
    p_question_key,
    p_answer_json,
    p_normalized_facts,
    'answered',
    true,
    answer_version + 1
  )
  returning
    onboarding_answers.id,
    onboarding_answers.customer_id,
    onboarding_answers.onboarding_session_id,
    onboarding_answers.question_key,
    onboarding_answers.answer_json,
    onboarding_answers.normalized_facts,
    onboarding_answers.answer_status,
    onboarding_answers.is_latest,
    onboarding_answers.version,
    onboarding_answers.created_at,
    onboarding_answers.updated_at
  into id, customer_id, onboarding_session_id, question_key, answer_json, normalized_facts, answer_status, is_latest, version, created_at, updated_at;

  update public.onboarding_sessions
  set status = 'awaiting_input',
      last_question_key = p_question_key
  where onboarding_sessions.id = p_session_id
    and onboarding_sessions.customer_id = p_customer_id;

  return next;
end;
$$;

grant execute on function public.save_onboarding_answer(uuid, uuid, text, jsonb, jsonb) to authenticated;