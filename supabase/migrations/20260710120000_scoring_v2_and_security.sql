-- =============================================================================
-- 0003_scoring_v2_and_security.sql
-- Aligns the schema with the NexTep scoring model and hardens the DB:
--   * scoring_events: unified `c` penalty, target/technique/penalty_reason/remaining_ms
--   * matches.win_reason: new WinReason set
--   * pgcrypto explicit, profiles auto-provisioning trigger
--   * rename current_role() -> app_current_role() (avoids the reserved name)
-- RPCs and bracket advancement live in the companion migration (0004).
-- Additive only; the two prior migrations are unchanged.
-- =============================================================================

-- gen_random_uuid() depends on pgcrypto. Supabase enables it by default, but be
-- explicit so a fresh database and CI both work.
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- scoring_events: migrate to the unified `c` penalty model.
-- -----------------------------------------------------------------------------
-- Add the new columns first so we can set penalty_reason while migrating kinds.
alter table public.scoring_events
  add column if not exists target         text check (target is null or target in ('jodan', 'chudan')),
  add column if not exists penalty_reason text check (
    penalty_reason is null or penalty_reason in
    ('atesugi', 'jogai', 'time_wasting', 'mubobi', 'grabbing', 'other', 'ten_count')
  ),
  add column if not exists remaining_ms   int not null default 0 check (remaining_ms >= 0);

-- Migrate every legacy kind the old CHECK allowed so no row violates the new
-- CHECK. c1/c2 collapse to an ordinary `c`; the terminal DQ kinds
-- (hansoku/kiken/shikkaku) become a `c` with reason 'ten_count' (= instant DQ,
-- c += 5 in the domain model), preserving "this side was disqualified".
update public.scoring_events
  set kind = 'c', penalty_reason = coalesce(penalty_reason, 'other')
  where kind in ('c1', 'c2');
update public.scoring_events
  set kind = 'c', penalty_reason = 'ten_count'
  where kind in ('hansoku', 'kiken', 'shikkaku');

alter table public.scoring_events drop constraint if exists scoring_events_kind_check;
alter table public.scoring_events
  add constraint scoring_events_kind_check
  check (kind in ('ippon', 'waza_ari', 'yuko', 'c'));

-- technique was free text; constrain it to the mock's tsuki/keri (nullable).
alter table public.scoring_events drop constraint if exists scoring_events_technique_check;
alter table public.scoring_events
  add constraint scoring_events_technique_check
  check (technique is null or technique in ('tsuki', 'keri'));

-- A `c` event must carry a reason.
alter table public.scoring_events drop constraint if exists scoring_events_penalty_reason_required;
alter table public.scoring_events
  add constraint scoring_events_penalty_reason_required
  check (kind <> 'c' or penalty_reason is not null);

-- -----------------------------------------------------------------------------
-- matches.win_reason: adopt the new WinReason set.
-- -----------------------------------------------------------------------------
alter table public.matches drop constraint if exists matches_win_reason_check;
alter table public.matches
  add constraint matches_win_reason_check
  check (win_reason is null or win_reason in
    ('point_gap', 'target_score', 'time_up', 'hansoku',
     'senshu', 'ippon_count', 'wazaari_count', 'hantei'));

-- -----------------------------------------------------------------------------
-- Rename current_role() -> app_current_role().
-- `current_role` collides with a SQL reserved word; schema-qualification worked
-- but the rename removes the footgun. RLS policies are re-pointed in 0004.
-- -----------------------------------------------------------------------------
create or replace function public.app_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- -----------------------------------------------------------------------------
-- Auto-provision a profile when an auth user is created.
-- Every self-service signup is provisioned as 'athlete' (least privilege),
-- regardless of any client-supplied metadata role — a public signup must never
-- be able to grant itself operator/coach. Elevation to operator/coach is a
-- deliberate admin action: run supabase/seed.sql (or an UPDATE) to promote a
-- known account. See supabase/README.md for the bootstrap procedure.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display text := coalesce(
    new.raw_user_meta_data->>'display_name',
    split_part(new.email, '@', 1),
    'User'
  );
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, 'athlete', display)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
