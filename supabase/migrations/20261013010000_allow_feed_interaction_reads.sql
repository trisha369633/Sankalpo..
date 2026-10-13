drop policy if exists reactions_select_visible_posts on public.community_post_reactions;
create policy reactions_select_visible_posts on public.community_post_reactions
for select using (
  exists (
    select 1
    from public.community_posts
    where community_posts.id = community_post_reactions.post_id
      and (
        community_posts.verification_status = 'verified'
        or community_posts.user_id = auth.uid()
      )
  )
);

drop policy if exists comments_select_visible_posts on public.community_comments;
create policy comments_select_visible_posts on public.community_comments
for select using (
  exists (
    select 1
    from public.community_posts
    where community_posts.id = community_comments.post_id
      and (
        community_posts.verification_status = 'verified'
        or community_posts.user_id = auth.uid()
      )
  )
);