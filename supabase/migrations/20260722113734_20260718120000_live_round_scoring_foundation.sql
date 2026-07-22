/*
  AthletiGolf live round scoring foundation.

  Add this as a new Supabase migration in:
  supabase/migrations/20260718120000_live_round_scoring_foundation.sql

  This is intentionally additive. Existing rounds and round_holes keep working.
*/

alter table public.rounds
  add column if not exists visibility text not null default 'private',
  add column if not exists live_status text not null default 'not_started',
  add column if not exists started_at timestamptz,
  add column if not exists finished_at timestamptz,
  add column if not exists share_token uuid default gen_random_uuid();

alter table public.rounds
  drop constraint if exists rounds_visibility_check;
alter table public.rounds
  add constraint rounds_visibility_check
  check (visibility in ('private', 'friends', 'team', 'public'));

alter table public.rounds
  drop constraint if exists rounds_live_status_check;
alter table public.rounds
  add constraint rounds_live_status_check
  check (live_status in ('not_started', 'live', 'paused', 'finished'));

create table if not exists public.round_sides (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  name text,
  side_type text not null default 'individual',
  side_order integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.round_sides
  drop constraint if exists round_sides_side_type_check;
alter table public.round_sides
  add constraint round_sides_side_type_check
  check (side_type in ('individual', 'pair', 'team'));

create table if not exists public.round_players (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  side_id uuid references public.round_sides(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  invited_by uuid references public.profiles(id) on delete set null default auth.uid(),
  player_type text not null default 'guest',
  display_name text not null,
  handicap numeric,
  course_handicap integer,
  playing_handicap integer,
  tee_name text,
  tee_colour text,
  player_order integer not null default 1,
  is_owner boolean not null default false,
  can_edit_scores boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.round_players
  drop constraint if exists round_players_player_type_check;
alter table public.round_players
  add constraint round_players_player_type_check
  check (player_type in ('owner', 'friend', 'guest'));

create table if not exists public.round_player_holes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  round_player_id uuid not null references public.round_players(id) on delete cascade,
  side_id uuid references public.round_sides(id) on delete set null,
  hole_number integer not null,
  gross_score integer,
  net_score integer,
  stableford_points integer,
  strokes_received integer not null default 0,
  picked_up boolean not null default false,
  conceded boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (round_player_id, hole_number)
);

create table if not exists public.round_games (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  game_type text not null default 'stroke_play',
  scoring_basis text not null default 'gross',
  handicap_mode text not null default 'none',
  name text,
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.round_games
  drop constraint if exists round_games_game_type_check;
alter table public.round_games
  add constraint round_games_game_type_check
  check (game_type in (
    'stroke_play',
    'medal',
    'stableford',
    'match_play',
    'skins',
    'four_ball_stroke',
    'four_ball_match',
    'foursomes',
    'scramble',
    'greensomes',
    'nassau',
    'custom'
  ));

alter table public.round_games
  drop constraint if exists round_games_scoring_basis_check;
alter table public.round_games
  add constraint round_games_scoring_basis_check
  check (scoring_basis in ('gross', 'net', 'points', 'holes', 'skins', 'custom'));

alter table public.round_games
  drop constraint if exists round_games_handicap_mode_check;
alter table public.round_games
  add constraint round_games_handicap_mode_check
  check (handicap_mode in ('none', 'full', 'allowance', 'course_handicap', 'manual'));

alter table public.round_games
  drop constraint if exists round_games_status_check;
alter table public.round_games
  add constraint round_games_status_check
  check (status in ('active', 'finished', 'cancelled'));

create table if not exists public.round_game_holes (
  id uuid primary key default gen_random_uuid(),
  round_game_id uuid not null references public.round_games(id) on delete cascade,
  round_id uuid not null references public.rounds(id) on delete cascade,
  hole_number integer not null,
  winning_player_id uuid references public.round_players(id) on delete set null,
  winning_side_id uuid references public.round_sides(id) on delete set null,
  result_label text,
  carryover_count integer not null default 0,
  points jsonb not null default '{}'::jsonb,
  match_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (round_game_id, hole_number)
);

create table if not exists public.round_game_results (
  id uuid primary key default gen_random_uuid(),
  round_game_id uuid not null references public.round_games(id) on delete cascade,
  round_id uuid not null references public.rounds(id) on delete cascade,
  round_player_id uuid references public.round_players(id) on delete cascade,
  side_id uuid references public.round_sides(id) on delete cascade,
  position integer,
  total_gross integer,
  total_net integer,
  total_points integer,
  holes_won integer,
  skins_won integer,
  result_label text,
  result_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.round_watchers (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  watcher_user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'follower',
  can_comment boolean not null default true,
  invited_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (round_id, watcher_user_id)
);

alter table public.round_watchers
  drop constraint if exists round_watchers_role_check;
alter table public.round_watchers
  add constraint round_watchers_role_check
  check (role in ('follower', 'coach', 'team', 'admin'));

create table if not exists public.round_comments (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  hole_number integer,
  author_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  comment_type text not null default 'comment',
  body text,
  media_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.round_comments
  drop constraint if exists round_comments_comment_type_check;
alter table public.round_comments
  add constraint round_comments_comment_type_check
  check (comment_type in ('comment', 'coach_note', 'post_round_review'));

create table if not exists public.round_reactions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  author_user_id uuid references public.profiles(id) on delete cascade default auth.uid(),
  target_type text not null default 'round',
  target_id uuid,
  hole_number integer,
  reaction text not null,
  created_at timestamptz not null default now(),
  unique (round_id, author_user_id, target_type, target_id, hole_number, reaction)
);

alter table public.round_reactions
  drop constraint if exists round_reactions_target_type_check;
alter table public.round_reactions
  add constraint round_reactions_target_type_check
  check (target_type in ('round', 'hole', 'player_hole', 'comment', 'media'));

alter table public.round_reactions
  drop constraint if exists round_reactions_reaction_check;
alter table public.round_reactions
  add constraint round_reactions_reaction_check
  check (reaction in ('like', 'fire', 'poop'));

create table if not exists public.round_media (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  hole_number integer,
  uploaded_by uuid references public.profiles(id) on delete set null default auth.uid(),
  media_type text not null default 'image',
  url text not null,
  caption text,
  created_at timestamptz not null default now()
);

alter table public.round_media
  drop constraint if exists round_media_media_type_check;
alter table public.round_media
  add constraint round_media_media_type_check
  check (media_type in ('image', 'video'));

create index if not exists idx_rounds_visibility_live_status on public.rounds (visibility, live_status, created_at desc);
create index if not exists idx_rounds_share_token on public.rounds (share_token);
create index if not exists idx_round_sides_round_id on public.round_sides (round_id);
create index if not exists idx_round_players_round_id on public.round_players (round_id, player_order);
create index if not exists idx_round_players_user_id on public.round_players (user_id);
create index if not exists idx_round_player_holes_round_id on public.round_player_holes (round_id, hole_number);
create index if not exists idx_round_player_holes_player_id on public.round_player_holes (round_player_id, hole_number);
create index if not exists idx_round_games_round_id on public.round_games (round_id, status);
create index if not exists idx_round_game_holes_round_game_id on public.round_game_holes (round_game_id, hole_number);
create index if not exists idx_round_game_results_round_game_id on public.round_game_results (round_game_id);
create index if not exists idx_round_watchers_user_id on public.round_watchers (watcher_user_id);
create index if not exists idx_round_comments_round_id on public.round_comments (round_id, created_at desc);
create index if not exists idx_round_reactions_round_id on public.round_reactions (round_id, created_at desc);
create index if not exists idx_round_media_round_id on public.round_media (round_id, created_at desc);

alter table public.round_sides enable row level security;
alter table public.round_players enable row level security;
alter table public.round_player_holes enable row level security;
alter table public.round_games enable row level security;
alter table public.round_game_holes enable row level security;
alter table public.round_game_results enable row level security;
alter table public.round_watchers enable row level security;
alter table public.round_comments enable row level security;
alter table public.round_reactions enable row level security;
alter table public.round_media enable row level security;

create or replace function public.can_view_round(target_round_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.rounds r
    where r.id = target_round_id
      and (
        r.user_id = auth.uid()
        or r.visibility = 'public'
        or exists (
          select 1
          from public.round_watchers rw
          where rw.round_id = r.id
            and rw.watcher_user_id = auth.uid()
        )
        or (
          r.visibility = 'friends'
          and exists (
            select 1
            from public.friend_connections fc
            where fc.status = 'accepted'
              and (
                (fc.requester_id = auth.uid() and fc.receiver_id = r.user_id)
                or (fc.receiver_id = auth.uid() and fc.requester_id = r.user_id)
              )
          )
        )
      )
  );
$$;

create or replace function public.owns_round(target_round_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.rounds r
    where r.id = target_round_id
      and r.user_id = auth.uid()
  );
$$;

grant execute on function public.can_view_round(uuid) to authenticated;
grant execute on function public.owns_round(uuid) to authenticated;
revoke execute on function public.can_view_round(uuid) from anon;
revoke execute on function public.owns_round(uuid) from anon;

drop policy if exists "round_sides_select_viewable" on public.round_sides;
create policy "round_sides_select_viewable" on public.round_sides for select to authenticated using (public.can_view_round(round_id));
drop policy if exists "round_sides_owner_write" on public.round_sides;
create policy "round_sides_owner_write" on public.round_sides for all to authenticated using (public.owns_round(round_id)) with check (public.owns_round(round_id));

drop policy if exists "round_players_select_viewable" on public.round_players;
create policy "round_players_select_viewable" on public.round_players for select to authenticated using (public.can_view_round(round_id));
drop policy if exists "round_players_owner_write" on public.round_players;
create policy "round_players_owner_write" on public.round_players for all to authenticated using (public.owns_round(round_id) or user_id = auth.uid()) with check (public.owns_round(round_id) or user_id = auth.uid());

drop policy if exists "round_player_holes_select_viewable" on public.round_player_holes;
create policy "round_player_holes_select_viewable" on public.round_player_holes for select to authenticated using (public.can_view_round(round_id));
drop policy if exists "round_player_holes_owner_write" on public.round_player_holes;
create policy "round_player_holes_owner_write" on public.round_player_holes for all to authenticated
using (
  public.owns_round(round_id)
  or exists (
    select 1 from public.round_players rp
    where rp.id = round_player_id
      and rp.user_id = auth.uid()
      and rp.can_edit_scores = true
  )
)
with check (
  public.owns_round(round_id)
  or exists (
    select 1 from public.round_players rp
    where rp.id = round_player_id
      and rp.user_id = auth.uid()
      and rp.can_edit_scores = true
  )
);

drop policy if exists "round_games_select_viewable" on public.round_games;
create policy "round_games_select_viewable" on public.round_games for select to authenticated using (public.can_view_round(round_id));
drop policy if exists "round_games_owner_write" on public.round_games;
create policy "round_games_owner_write" on public.round_games for all to authenticated using (public.owns_round(round_id)) with check (public.owns_round(round_id));

drop policy if exists "round_game_holes_select_viewable" on public.round_game_holes;
create policy "round_game_holes_select_viewable" on public.round_game_holes for select to authenticated using (public.can_view_round(round_id));
drop policy if exists "round_game_holes_owner_write" on public.round_game_holes;
create policy "round_game_holes_owner_write" on public.round_game_holes for all to authenticated using (public.owns_round(round_id)) with check (public.owns_round(round_id));

drop policy if exists "round_game_results_select_viewable" on public.round_game_results;
create policy "round_game_results_select_viewable" on public.round_game_results for select to authenticated using (public.can_view_round(round_id));
drop policy if exists "round_game_results_owner_write" on public.round_game_results;
create policy "round_game_results_owner_write" on public.round_game_results for all to authenticated using (public.owns_round(round_id)) with check (public.owns_round(round_id));

drop policy if exists "round_watchers_select_own_or_owner" on public.round_watchers;
create policy "round_watchers_select_own_or_owner" on public.round_watchers for select to authenticated using (public.owns_round(round_id) or watcher_user_id = auth.uid());
drop policy if exists "round_watchers_owner_write" on public.round_watchers;
create policy "round_watchers_owner_write" on public.round_watchers for all to authenticated using (public.owns_round(round_id)) with check (public.owns_round(round_id));

drop policy if exists "round_comments_select_viewable" on public.round_comments;
create policy "round_comments_select_viewable" on public.round_comments for select to authenticated using (public.can_view_round(round_id));
drop policy if exists "round_comments_insert_allowed" on public.round_comments;
create policy "round_comments_insert_allowed" on public.round_comments for insert to authenticated
with check (author_user_id = auth.uid() and public.can_view_round(round_id));
drop policy if exists "round_comments_author_or_owner_update" on public.round_comments;
create policy "round_comments_author_or_owner_update" on public.round_comments for update to authenticated using (author_user_id = auth.uid() or public.owns_round(round_id)) with check (author_user_id = auth.uid() or public.owns_round(round_id));
drop policy if exists "round_comments_author_or_owner_delete" on public.round_comments;
create policy "round_comments_author_or_owner_delete" on public.round_comments for delete to authenticated using (author_user_id = auth.uid() or public.owns_round(round_id));

drop policy if exists "round_reactions_select_viewable" on public.round_reactions;
create policy "round_reactions_select_viewable" on public.round_reactions for select to authenticated using (public.can_view_round(round_id));
drop policy if exists "round_reactions_author_write" on public.round_reactions;
create policy "round_reactions_author_write" on public.round_reactions for all to authenticated using (author_user_id = auth.uid()) with check (author_user_id = auth.uid() and public.can_view_round(round_id));

drop policy if exists "round_media_select_viewable" on public.round_media;
create policy "round_media_select_viewable" on public.round_media for select to authenticated using (public.can_view_round(round_id));
drop policy if exists "round_media_uploader_or_owner_write" on public.round_media;
create policy "round_media_uploader_or_owner_write" on public.round_media for all to authenticated using (uploaded_by = auth.uid() or public.owns_round(round_id)) with check (uploaded_by = auth.uid() and public.can_view_round(round_id));
