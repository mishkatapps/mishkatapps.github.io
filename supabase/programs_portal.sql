-- =====================================================================
--  بوابة البرامج — مخطط قاعدة البيانات (مشروع Supabase: mishkatapps-budget)
--  شغّل هذا الملف كاملاً مرة واحدة من SQL Editor ثم اضغط Run.
--  يعتمد على الدالة الموجودة public.is_app_owner() وجدول public.app_owners.
--  يمكن تشغيله أكثر من مرة دون ضرر.
-- =====================================================================

-- 1) الإعدادات: ظهور البوابة أو إخفاؤها
create table if not exists public.portal_settings (
  id          int primary key default 1 check (id = 1),
  visible     boolean not null default false,
  updated_at  timestamptz not null default now()
);
insert into public.portal_settings (id) values (1) on conflict (id) do nothing;

-- 2) المسموح لهم بالدخول (الاسم والرمز)
create table if not exists public.portal_users (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 1 and 120),
  code        text not null unique check (length(trim(code)) between 4 and 40),
  active      boolean not null default true,
  note        text,
  created_at  timestamptz not null default now(),
  last_login  timestamptz
);

-- 3) جلسات الدخول (كل متصفح يحصل على هوية مجهولة من Supabase تُربط بالمستخدم بعد الرمز الصحيح)
create table if not exists public.portal_sessions (
  uid         uuid primary key,
  user_id     uuid not null references public.portal_users(id) on delete cascade,
  started_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  user_agent  text
);

-- 4) سجل النشاط
create table if not exists public.portal_events (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  user_id     uuid references public.portal_users(id) on delete set null,
  user_name   text,
  uid         uuid,
  action      text not null,
  item        text,
  detail      jsonb,
  user_agent  text
);
create index if not exists portal_events_at_idx   on public.portal_events (at desc);
create index if not exists portal_events_user_idx on public.portal_events (user_id, at desc);
create index if not exists portal_events_uid_idx  on public.portal_events (uid, at desc);

-- لا قراءة ولا كتابة مباشرة لأي جدول؛ كل التعامل عبر الدوال أدناه
alter table public.portal_settings enable row level security;
alter table public.portal_users    enable row level security;
alter table public.portal_sessions enable row level security;
alter table public.portal_events   enable row level security;
revoke all on public.portal_settings, public.portal_users, public.portal_sessions, public.portal_events from anon, authenticated;

-- ---------------------------------------------------------------------
--  دوال الزائر (البوابة)
-- ---------------------------------------------------------------------

-- هل البوابة ظاهرة؟ (تستخدمها الصفحة الرئيسية لإظهار الرابط)
create or replace function public.portal_status()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select visible from public.portal_settings where id = 1), false);
$$;

-- هل لهذا المتصفح جلسة صالحة؟ (تستخدمها سياسة التخزين)
create or replace function public.portal_session_ok()
returns boolean language sql stable security definer set search_path = public as $$
  select public.portal_status() and exists (
    select 1 from public.portal_sessions s join public.portal_users u on u.id = s.user_id
    where s.uid = auth.uid() and s.expires_at > now() and u.active);
$$;

-- الدخول بالرمز
create or replace function public.portal_login(p_code text, p_ua text default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_user public.portal_users; v_fails int;
begin
  if v_uid is null then return json_build_object('ok', false, 'reason', 'no_session'); end if;
  if not public.portal_status() then return json_build_object('ok', false, 'reason', 'closed'); end if;
  select count(*) into v_fails from public.portal_events
    where uid = v_uid and action = 'login_failed' and at > now() - interval '15 minutes';
  if v_fails >= 8 then return json_build_object('ok', false, 'reason', 'locked'); end if;
  select * into v_user from public.portal_users where code = trim(p_code) and active limit 1;
  if v_user.id is null then
    insert into public.portal_events (uid, action, detail, user_agent)
      values (v_uid, 'login_failed', json_build_object('length', length(coalesce(p_code, ''))), left(p_ua, 300));
    return json_build_object('ok', false, 'reason', 'wrong');
  end if;
  insert into public.portal_sessions (uid, user_id, expires_at, user_agent)
    values (v_uid, v_user.id, now() + interval '12 hours', left(p_ua, 300))
    on conflict (uid) do update set user_id = excluded.user_id, started_at = now(), expires_at = excluded.expires_at, user_agent = excluded.user_agent;
  update public.portal_users set last_login = now() where id = v_user.id;
  insert into public.portal_events (user_id, user_name, uid, action, user_agent)
    values (v_user.id, v_user.name, v_uid, 'login', left(p_ua, 300));
  return json_build_object('ok', true, 'name', v_user.name);
end $$;

-- من أنا؟ (عند فتح الصفحة لاحقاً)
create or replace function public.portal_me()
returns json language sql stable security definer set search_path = public as $$
  select case when not public.portal_status() then json_build_object('ok', false, 'reason', 'closed')
    else coalesce((select json_build_object('ok', true, 'name', u.name, 'expires', s.expires_at)
      from public.portal_sessions s join public.portal_users u on u.id = s.user_id
      where s.uid = auth.uid() and s.expires_at > now() and u.active), json_build_object('ok', false, 'reason', 'no_session')) end;
$$;

-- تسجيل نشاط (مشاهدة قسم، فتح مقرر، تنزيل ملف، …)
create or replace function public.portal_log(p_action text, p_item text default null, p_detail jsonb default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_user public.portal_users;
begin
  if p_action not in ('view', 'open_course', 'view_presentation', 'download', 'open_file', 'search', 'logout', 'heartbeat') then return false; end if;
  select u.* into v_user from public.portal_sessions s join public.portal_users u on u.id = s.user_id
    where s.uid = auth.uid() and s.expires_at > now() and u.active;
  if v_user.id is null or not public.portal_status() then return false; end if;
  insert into public.portal_events (user_id, user_name, uid, action, item, detail)
    values (v_user.id, v_user.name, auth.uid(), p_action, left(p_item, 300), p_detail);
  if p_action = 'logout' then delete from public.portal_sessions where uid = auth.uid(); end if;
  return true;
end $$;

-- ---------------------------------------------------------------------
--  دوال المدير (صاحب التطبيق فقط)
-- ---------------------------------------------------------------------
create or replace function public.portal_admin_get()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_app_owner() then raise exception 'not_owner'; end if;
  return json_build_object(
    'visible', public.portal_status(),
    'users', coalesce((select json_agg(x order by x.created_at desc) from (
      select u.id, u.name, u.code, u.active, u.note, u.created_at, u.last_login,
        (select count(*) from public.portal_events e where e.user_id = u.id and e.action = 'login') as logins,
        (select count(*) from public.portal_events e where e.user_id = u.id and e.action = 'download') as downloads,
        (select max(at) from public.portal_events e where e.user_id = u.id) as last_activity
      from public.portal_users u) x), '[]'::json),
    'stats', json_build_object(
      'logins_today', (select count(*) from public.portal_events where action = 'login' and at > date_trunc('day', now())),
      'downloads_total', (select count(*) from public.portal_events where action = 'download'),
      'failed_today', (select count(*) from public.portal_events where action = 'login_failed' and at > date_trunc('day', now())),
      'active_sessions', (select count(*) from public.portal_sessions where expires_at > now())));
end $$;

create or replace function public.portal_set_visible(p_visible boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_owner() then raise exception 'not_owner'; end if;
  update public.portal_settings set visible = p_visible, updated_at = now() where id = 1;
  return p_visible;
end $$;

create or replace function public.portal_user_save(p_id uuid, p_name text, p_code text, p_active boolean, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_app_owner() then raise exception 'not_owner'; end if;
  if p_id is null then
    insert into public.portal_users (name, code, active, note) values (trim(p_name), trim(p_code), coalesce(p_active, true), p_note) returning id into v_id;
  else
    update public.portal_users set name = trim(p_name), code = trim(p_code), active = coalesce(p_active, true), note = p_note where id = p_id returning id into v_id;
    if not coalesce(p_active, true) then delete from public.portal_sessions where user_id = p_id; end if;
  end if;
  return v_id;
end $$;

create or replace function public.portal_user_delete(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_owner() then raise exception 'not_owner'; end if;
  delete from public.portal_users where id = p_id;
  return true;
end $$;

create or replace function public.portal_events_list(p_from timestamptz default null, p_to timestamptz default null,
  p_user uuid default null, p_action text default null, p_limit int default 500)
returns setof public.portal_events language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_app_owner() then raise exception 'not_owner'; end if;
  return query select * from public.portal_events e
    where (p_from is null or e.at >= p_from) and (p_to is null or e.at < p_to)
      and (p_user is null or e.user_id = p_user) and (p_action is null or e.action = p_action)
    order by e.at desc limit least(greatest(coalesce(p_limit, 500), 1), 5000);
end $$;

grant execute on function public.portal_status()                       to anon, authenticated;
grant execute on function public.portal_session_ok()                   to authenticated;
grant execute on function public.portal_login(text, text)              to authenticated;
grant execute on function public.portal_me()                           to authenticated;
grant execute on function public.portal_log(text, text, jsonb)         to authenticated;
grant execute on function public.portal_admin_get()                    to authenticated;
grant execute on function public.portal_set_visible(boolean)           to authenticated;
grant execute on function public.portal_user_save(uuid, text, text, boolean, text) to authenticated;
grant execute on function public.portal_user_delete(uuid)              to authenticated;
grant execute on function public.portal_events_list(timestamptz, timestamptz, uuid, text, int) to authenticated;

-- ---------------------------------------------------------------------
--  التخزين الخاص بملفات البرامج
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
  values ('programs', 'programs', false, 52428800)
  on conflict (id) do update set public = false;

drop policy if exists "portal programs read"   on storage.objects;
drop policy if exists "portal programs owner read"   on storage.objects;
drop policy if exists "portal programs owner insert" on storage.objects;
drop policy if exists "portal programs owner update" on storage.objects;
drop policy if exists "portal programs owner delete" on storage.objects;

create policy "portal programs read" on storage.objects for select to authenticated
  using (bucket_id = 'programs' and public.portal_session_ok());
create policy "portal programs owner read" on storage.objects for select to authenticated
  using (bucket_id = 'programs' and public.is_app_owner());
create policy "portal programs owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'programs' and public.is_app_owner());
create policy "portal programs owner update" on storage.objects for update to authenticated
  using (bucket_id = 'programs' and public.is_app_owner()) with check (bucket_id = 'programs' and public.is_app_owner());
create policy "portal programs owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'programs' and public.is_app_owner());
