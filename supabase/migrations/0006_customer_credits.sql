create table public.customer_credit_balances (
  customer_id uuid primary key references public.customers(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  amount bigint not null check (amount <> 0),
  transaction_type text not null check (transaction_type in ('purchase', 'usage', 'adjustment', 'refund')),
  description text,
  reference_id text,
  created_at timestamptz not null default now()
);

create index customer_credit_transactions_customer_id_created_at_idx on public.customer_credit_transactions(customer_id, created_at desc);

create trigger customer_credit_balances_set_updated_at
before update on public.customer_credit_balances
for each row execute function public.set_updated_at();

alter table public.customer_credit_balances enable row level security;
alter table public.customer_credit_transactions enable row level security;

create policy "Owners can read their credit balance" on public.customer_credit_balances for select to authenticated using ((select public.is_customer_owner(customer_id)));

create policy "Owners can read their credit transactions" on public.customer_credit_transactions for select to authenticated using ((select public.is_customer_owner(customer_id)));

create function public.spend_customer_credits(
  p_customer_id uuid,
  p_amount bigint,
  p_description text default null,
  p_reference_id text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance bigint;
begin
  if p_amount <= 0 then
    raise exception 'p_amount must be greater than zero';
  end if;

  update public.customer_credit_balances
  set balance = balance - p_amount
  where customer_id = p_customer_id
    and balance >= p_amount
  returning balance into v_new_balance;

  if v_new_balance is null then
    raise exception 'Insufficient credits for customer %', p_customer_id;
  end if;

  insert into public.customer_credit_transactions (customer_id, amount, transaction_type, description, reference_id)
  values (p_customer_id, -p_amount, 'usage', p_description, p_reference_id);

  return v_new_balance;
end;
$$;

revoke all on function public.spend_customer_credits(uuid, bigint, text, text) from public;

