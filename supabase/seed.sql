-- =============================================================================
-- seed.sql - Development seed data.
-- Apply manually after migrations to populate a usable demo environment.
-- =============================================================================

-- Sample athletes (no linked user accounts; created by an operator).
insert into public.athletes (id, name, rank, affiliation, gender, weight_kg) values
  ('11111111-1111-7111-8111-111111111111', '田中太郎', 'Black',    '横浜空手クラブ', 'male',   72.5),
  ('22222222-2222-7222-8222-222222222222', '鈴木花子', '2nd Dan',  '東京武道館',     'female', 58.0),
  ('33333333-3333-7333-8333-333333333333', '佐藤健',   'Black',    '大阪格闘技院',   'male',   80.2),
  ('44444444-4444-7444-8444-444444444444', '山本美咲', 'Brown',    '京都空手道場',   'female', 60.5);

-- Sample tournament.
insert into public.tournaments (id, name, date, status) values
  ('aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa', '2026 春季空手選手権', '2026-05-30', 'Draft');

-- A category within that tournament.
insert into public.tournament_categories
  (id, tournament_id, age_division, gender, weight_class, match_type)
values
  ('bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb',
   'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa',
   'SENIOR', 'male', '-75kg', 'Kumite');
