create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'admin');
create type public.order_status as enum ('pending', 'under_review', 'paid', 'rejected', 'cancelled');
create type public.payment_method as enum ('bank_transfer', 'gift_card');
create type public.support_status as enum ('open', 'answered', 'closed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  venue text not null,
  starts_at timestamptz not null,
  price_cents integer not null check (price_cents > 0),
  capacity integer not null check (capacity > 0),
  image_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  event_id uuid not null references public.events(id),
  quantity integer not null check (quantity between 1 and 10),
  unit_price_cents integer not null check (unit_price_cents > 0),
  total_cents integer generated always as (quantity * unit_price_cents) stored,
  status public.order_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_submissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id),
  method public.payment_method not null,
  reference text,
  amount_cents integer not null check (amount_cents > 0),
  evidence_path text,
  status public.order_status not null default 'under_review',
  admin_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (
    (method = 'bank_transfer' and reference is not null and length(trim(reference)) > 0)
    or (method = 'gift_card' and reference is null)
  )
);

create table public.gift_card_submissions (
  id uuid primary key default gen_random_uuid(),
  payment_submission_id uuid not null references public.payment_submissions(id) on delete cascade,
  customer_id uuid not null references public.profiles(id),
  issuer text not null,
  card_code text not null,
  amount_cents integer not null check (amount_cents > 0),
  image_path text not null,
  created_at timestamptz not null default now()
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id),
  event_id uuid not null references public.events(id),
  qr_token uuid not null unique default gen_random_uuid(),
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  subject text not null,
  status public.support_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  support_ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  message text not null check (length(trim(message)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index orders_event_status_idx on public.orders(event_id, status);
create index payment_submissions_order_idx on public.payment_submissions(order_id);
create index tickets_customer_idx on public.tickets(customer_id);
create index support_tickets_customer_idx on public.support_tickets(customer_id, updated_at desc);
create index support_messages_ticket_idx on public.support_messages(support_ticket_id, created_at);

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create function public.touch_support_ticket()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.support_tickets set updated_at = now() where id = new.support_ticket_id;
  return new;
end;
$$;

create trigger auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger support_tickets_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();
create trigger support_message_created after insert on public.support_messages
  for each row execute function public.touch_support_ticket();

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.orders enable row level security;
alter table public.payment_submissions enable row level security;
alter table public.gift_card_submissions enable row level security;
alter table public.tickets enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

create policy "Customers can view own profile; admins can view all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Customers can edit own contact details"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and role = 'customer')
  with check (id = (select auth.uid()) and role = 'customer');
create policy "Admins can edit customer contact details"
  on public.profiles for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Published events are public; admins can manage all"
  on public.events for select
  using (published or (select public.is_admin()));
create policy "Admins can create events"
  on public.events for insert to authenticated
  with check ((select public.is_admin()));
create policy "Admins can update events"
  on public.events for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "Admins can delete events"
  on public.events for delete to authenticated
  using ((select public.is_admin()));

create policy "Customers can view own orders; admins can view all"
  on public.orders for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));

create policy "Customers can view own payment submissions; admins can view all"
  on public.payment_submissions for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));
create policy "Customers can view own gift cards; admins can view all"
  on public.gift_card_submissions for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));

create policy "Customers can view own tickets; admins can view all"
  on public.tickets for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));

create policy "Customers can view own support tickets; admins can view all"
  on public.support_tickets for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));
create policy "Customers can open support tickets"
  on public.support_tickets for insert to authenticated
  with check (customer_id = (select auth.uid()));
create policy "Customers can view messages on own tickets; admins can view all"
  on public.support_messages for select to authenticated
  using (
    sender_id = (select auth.uid())
    or (select public.is_admin())
    or exists (
      select 1 from public.support_tickets st
      where st.id = support_ticket_id and st.customer_id = (select auth.uid())
    )
  );
create policy "Customers can reply to own open tickets"
  on public.support_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.support_tickets st
      where st.id = support_ticket_id
        and st.customer_id = (select auth.uid())
        and st.status <> 'closed'
    )
  );
create policy "Admins can reply to support tickets"
  on public.support_messages for insert to authenticated
  with check ((select public.is_admin()) and sender_id = (select auth.uid()));
create policy "Admins can update support tickets"
  on public.support_tickets for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create function public.create_order(p_event_id uuid, p_quantity integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_event public.events%rowtype;
  v_sold integer;
  v_order_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 10 then
    raise exception 'Ticket quantity must be between 1 and 10';
  end if;
  select * into v_event from public.events where id = p_event_id and published for update;
  if not found then raise exception 'Event is not available'; end if;
  if v_event.starts_at <= now() then raise exception 'Event has already started'; end if;
  select coalesce(sum(quantity), 0)::integer into v_sold
    from public.orders
    where event_id = p_event_id
      and (
        status in ('under_review', 'paid')
        or (status = 'pending' and expires_at > now())
      );
  if v_sold + p_quantity > v_event.capacity then raise exception 'Not enough tickets remain'; end if;
  insert into public.orders (customer_id, event_id, quantity, unit_price_cents)
    values (v_user_id, p_event_id, p_quantity, v_event.price_cents)
    returning id into v_order_id;
  return v_order_id;
end;
$$;

create function public.submit_payment(
  p_order_id uuid,
  p_method public.payment_method,
  p_reference text default null,
  p_evidence_path text default null,
  p_gift_cards jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_order public.orders%rowtype;
  v_event public.events%rowtype;
  v_payment_id uuid;
  v_gift_card jsonb;
  v_sum bigint := 0;
  v_reserved integer;
  v_count integer := 0;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select * into v_order from public.orders
    where id = p_order_id and customer_id = v_user_id for update;
  if not found or v_order.status not in ('pending', 'rejected')
    or (v_order.status = 'pending' and v_order.expires_at <= now()) then
    raise exception 'Order is not available for payment';
  end if;
  if v_order.status = 'rejected' then
    select * into v_event from public.events where id = v_order.event_id for update;
    if not found or v_event.starts_at <= now() then raise exception 'Event is no longer available'; end if;
    select coalesce(sum(quantity), 0)::integer into v_reserved
      from public.orders
      where event_id = v_order.event_id
        and id <> v_order.id
        and (
          status in ('under_review', 'paid')
          or (status = 'pending' and expires_at > now())
        );
    if v_reserved + v_order.quantity > v_event.capacity then
      raise exception 'Not enough tickets remain to retry this order';
    end if;
  end if;

  if p_method = 'bank_transfer' then
    if length(trim(coalesce(p_reference, ''))) < 3 then raise exception 'Enter a valid transfer reference'; end if;
    if p_evidence_path is not null and split_part(p_evidence_path, '/', 1) <> v_user_id::text then
      raise exception 'Invalid evidence path';
    end if;
    if p_evidence_path is not null and not exists (
      select 1 from storage.objects
      where bucket_id = 'payment-evidence' and name = p_evidence_path
    ) then
      raise exception 'Payment evidence upload was not found';
    end if;
  else
    if p_gift_cards is null
      or jsonb_typeof(p_gift_cards) is distinct from 'array'
      or jsonb_array_length(p_gift_cards) < 1 then
      raise exception 'Add at least one gift card';
    end if;
    for v_gift_card in select value from jsonb_array_elements(p_gift_cards)
    loop
      if coalesce(v_gift_card->>'issuer', '') = ''
        or coalesce(v_gift_card->>'card_code', '') = ''
        or coalesce(v_gift_card->>'image_path', '') = ''
        or split_part(v_gift_card->>'image_path', '/', 1) <> v_user_id::text
        or not exists (
          select 1 from storage.objects
          where bucket_id = 'payment-evidence'
            and name = v_gift_card->>'image_path'
        )
        or coalesce((v_gift_card->>'amount_cents')::integer, 0) <= 0 then
        raise exception 'Gift cards need an issuer, code, positive value, and uploaded image';
      end if;
      v_sum := v_sum + (v_gift_card->>'amount_cents')::integer;
      v_count := v_count + 1;
    end loop;
    if v_count > 10 or v_sum <> v_order.total_cents then
      raise exception 'Gift card values must exactly match the order total';
    end if;
  end if;

  insert into public.payment_submissions
    (order_id, customer_id, method, reference, amount_cents, evidence_path)
  values (
    v_order.id,
    v_user_id,
    p_method,
    case when p_method = 'bank_transfer' then trim(p_reference) else null end,
    v_order.total_cents,
    p_evidence_path
  ) returning id into v_payment_id;

  if p_method = 'gift_card' then
    for v_gift_card in select value from jsonb_array_elements(p_gift_cards)
    loop
      insert into public.gift_card_submissions
        (payment_submission_id, customer_id, issuer, card_code, amount_cents, image_path)
      values (
        v_payment_id, v_user_id,
        trim(v_gift_card->>'issuer'), trim(v_gift_card->>'card_code'),
        (v_gift_card->>'amount_cents')::integer, v_gift_card->>'image_path'
      );
    end loop;
  end if;
  update public.orders set status = 'under_review' where id = v_order.id;
  return v_payment_id;
end;
$$;

create function public.approve_order(p_order_id uuid, p_approved boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  if not (select public.is_admin()) then raise exception 'Administrator access required'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status <> 'under_review' then raise exception 'Order is not awaiting review'; end if;

  update public.orders set
    status = case when p_approved then 'paid'::public.order_status else 'rejected'::public.order_status end
  where id = v_order.id;
  update public.payment_submissions set
    status = case when p_approved then 'paid'::public.order_status else 'rejected'::public.order_status end,
    admin_note = nullif(trim(coalesce(p_note, '')), ''),
    reviewed_at = now()
  where order_id = v_order.id and status = 'under_review';

  if p_approved then
    insert into public.tickets (order_id, customer_id, event_id)
    select v_order.id, v_order.customer_id, v_order.event_id
    from generate_series(1, v_order.quantity);
  end if;
end;
$$;

create function public.validate_ticket(p_qr_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.tickets%rowtype;
  v_event_name text;
begin
  if not (select public.is_admin()) then raise exception 'Administrator access required'; end if;
  select * into v_ticket from public.tickets where qr_token = p_qr_token for update;
  if not found then return jsonb_build_object('valid', false, 'message', 'Ticket not found'); end if;
  select name into v_event_name from public.events where id = v_ticket.event_id;
  if v_ticket.checked_in_at is not null then
    return jsonb_build_object(
      'valid', false, 'message', 'Ticket was already scanned',
      'event', v_event_name, 'checked_in_at', v_ticket.checked_in_at
    );
  end if;
  update public.tickets set checked_in_at = now() where id = v_ticket.id;
  return jsonb_build_object(
    'valid', true, 'message', 'Ticket validated',
    'event', v_event_name, 'checked_in_at', now()
  );
end;
$$;

create function public.get_admin_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select public.is_admin()) then raise exception 'Administrator access required'; end if;
  return jsonb_build_object(
    'customers', (select count(*) from public.profiles where role = 'customer'),
    'events', (select count(*) from public.events),
    'orders', (select count(*) from public.orders),
    'pending_payments', (select count(*) from public.orders where status = 'under_review'),
    'paid_revenue_cents', (select coalesce(sum(total_cents), 0) from public.orders where status = 'paid'),
    'tickets_issued', (select count(*) from public.tickets),
    'tickets_checked_in', (select count(*) from public.tickets where checked_in_at is not null)
  );
end;
$$;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.create_order(uuid, integer) from public, anon;
revoke execute on function public.submit_payment(uuid, public.payment_method, text, text, jsonb) from public, anon;
revoke execute on function public.approve_order(uuid, boolean, text) from public, anon;
revoke execute on function public.validate_ticket(uuid) from public, anon;
revoke execute on function public.get_admin_analytics() from public, anon;
revoke execute on function public.set_updated_at() from public, anon;
revoke execute on function public.create_profile_for_new_user() from public, anon;
revoke execute on function public.touch_support_ticket() from public, anon;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.create_order(uuid, integer) to authenticated;
grant execute on function public.submit_payment(uuid, public.payment_method, text, text, jsonb) to authenticated;
grant execute on function public.approve_order(uuid, boolean, text) to authenticated;
grant execute on function public.validate_ticket(uuid) to authenticated;
grant execute on function public.get_admin_analytics() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-evidence',
  'payment-evidence',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "Customers can upload payment evidence to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'payment-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Customers can view own payment evidence; admins can view all"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-evidence'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
    )
  );
