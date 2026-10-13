do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'community_posts'
      and column_name = 'author_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'community_posts'
      and column_name = 'user_id'
  ) then
    alter table public.community_posts rename column author_id to user_id;
  end if;
end;
$$;

drop policy if exists community_posts_select_own on public.community_posts;
drop policy if exists community_posts_insert_own on public.community_posts;
drop policy if exists community_posts_update_own on public.community_posts;
drop policy if exists community_posts_delete_own on public.community_posts;

create policy community_posts_select_own on public.community_posts
for select using (auth.uid() = user_id);
create policy community_posts_insert_own on public.community_posts
for insert with check (auth.uid() = user_id);
create policy community_posts_update_own on public.community_posts
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);
create policy community_posts_delete_own on public.community_posts
for delete using (auth.uid() = user_id);