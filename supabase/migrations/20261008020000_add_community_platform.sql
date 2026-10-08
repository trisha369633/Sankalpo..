create extension if not exists pgcrypto;

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  post_type text not null default 'action'
    check (post_type in ('action', 'problem', 'success', 'achievement')),
  title text not null,
  description text,
  location text,
  photo_url text,
  before_photo_url text,
  after_photo_url text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  verification_note text,
  verified_by_id uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.environmental_problems (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  problem_type text not null default 'other',
  location text,
  photo_url text,
  status text not null default 'reported'
    check (status in ('reported', 'action_taken', 'under_review', 'resolved')),
  before_photo_url text,
  after_photo_url text,
  resolved_at timestamptz,
  resolved_by_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null default 'support'
    check (reaction_type in ('support', 'inspired')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'dismissed', 'removed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_note text
);

create table if not exists public.problem_reports (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.environmental_problems(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_note text
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  blocked_by_owner boolean not null default false,
  blocked_by_participant boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.monthly_rewards (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  rank integer not null check (rank between 1 and 5),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_status text not null default 'pending'
    check (reward_status in ('pending', 'confirmed', 'delivered')),
  reward_note text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (month, rank)
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists community_posts_updated_at on public.community_posts;
create trigger community_posts_updated_at before update on public.community_posts
for each row execute function public.set_updated_at();

drop trigger if exists environmental_problems_updated_at on public.environmental_problems;
create trigger environmental_problems_updated_at before update on public.environmental_problems
for each row execute function public.set_updated_at();

alter table public.community_posts enable row level security;
alter table public.environmental_problems enable row level security;
alter table public.community_post_reactions enable row level security;
alter table public.community_comments enable row level security;
alter table public.post_reports enable row level security;
alter table public.problem_reports enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.monthly_rewards enable row level security;

create policy community_posts_select_public on public.community_posts
for select using (verification_status = 'verified');
create policy community_posts_select_own on public.community_posts
for select using (auth.uid() = author_id);
create policy community_posts_select_admin on public.community_posts
for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy community_posts_insert_own on public.community_posts
for insert with check (auth.uid() = author_id);
create policy community_posts_update_own on public.community_posts
for update using (auth.uid() = author_id)
with check (auth.uid() = author_id);
create policy community_posts_update_admin on public.community_posts
for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy community_posts_delete_own on public.community_posts
for delete using (auth.uid() = author_id);

create policy environmental_problems_select_public on public.environmental_problems
for select using (true);
create policy environmental_problems_insert_own on public.environmental_problems
for insert with check (auth.uid() = author_id);
create policy environmental_problems_update_own on public.environmental_problems
for update using (auth.uid() = author_id)
with check (auth.uid() = author_id);
create policy environmental_problems_update_admin on public.environmental_problems
for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy environmental_problems_delete_own on public.environmental_problems
for delete using (auth.uid() = author_id);

create policy reactions_manage_own on public.community_post_reactions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy comments_manage_own on public.community_comments
for all using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy reports_insert_own on public.post_reports
for insert with check (auth.uid() = reporter_id);
create policy reports_select_own on public.post_reports
for select using (auth.uid() = reporter_id);
create policy reports_select_admin on public.post_reports
for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy reports_update_admin on public.post_reports
for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy problem_reports_insert_own on public.problem_reports
for insert with check (auth.uid() = reporter_id);
create policy problem_reports_select_own on public.problem_reports
for select using (auth.uid() = reporter_id);
create policy problem_reports_select_admin on public.problem_reports
for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy problem_reports_update_admin on public.problem_reports
for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy conversations_insert_own on public.conversations
for insert with check (auth.uid() = owner_id);
create policy conversations_manage_own on public.conversations
for all using (auth.uid() in (owner_id, participant_id))
with check (auth.uid() in (owner_id, participant_id));
create policy messages_select_participant on public.messages
for select using (
  auth.uid() = sender_id
  or exists (
    select 1 from public.conversations
    where conversations.id = messages.conversation_id
      and auth.uid() in (conversations.owner_id, conversations.participant_id)
  )
);
create policy messages_insert_sender on public.messages
for insert with check (auth.uid() = sender_id);
create policy monthly_rewards_select_public on public.monthly_rewards
for select using (published = true);
create policy monthly_rewards_admin_manage on public.monthly_rewards
for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
