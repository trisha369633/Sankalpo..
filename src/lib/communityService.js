import { supabase } from "./supabase";

export function normalizeCommunityImageUrl(imageUrl) {
  if (typeof imageUrl !== "string") return null;

  const value = imageUrl.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;

  const storagePath = value.replace(/^\/+/, "");
  if (!storagePath || /:\/\//.test(storagePath)) return null;

  const { data } = supabase.storage.from("submission-proofs").getPublicUrl(storagePath);
  return data?.publicUrl || null;
}

async function getProfiles(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", ids);
  if (error) throw error;
  return Object.fromEntries((data || []).map((profile) => [profile.id, profile]));
}

export async function loadCommunityPosts() {
  const { data: posts, error: postsError } = await supabase
    .from("community_posts")
    .select("id, user_id, post_type, title, description, location, photo_url, verification_status, created_at, updated_at")
    .order("created_at", { ascending: false });
  if (postsError) throw postsError;

  const postList = posts || [];
  const postIds = postList.map((post) => post.id);
  if (!postIds.length) return [];

  const [reactionResult, commentResult] = await Promise.all([
    supabase
      .from("community_post_reactions")
      .select("id, post_id, user_id, reaction_type")
      .in("post_id", postIds),
    supabase
      .from("community_comments")
      .select("id, post_id, author_id, text, created_at")
      .in("post_id", postIds),
  ]);
  if (reactionResult.error) throw reactionResult.error;
  if (commentResult.error) throw commentResult.error;

  const commentList = commentResult.data || [];
  const profiles = await getProfiles([
    ...postList.map((post) => post.user_id),
    ...commentList.map((comment) => comment.author_id),
  ]);

  const reactionsByPost = new Map();
  for (const reaction of reactionResult.data || []) {
    const list = reactionsByPost.get(reaction.post_id) || [];
    list.push(reaction);
    reactionsByPost.set(reaction.post_id, list);
  }

  const commentsByPost = new Map();
  for (const comment of commentList) {
    const list = commentsByPost.get(comment.post_id) || [];
    list.push({ ...comment, author: profiles[comment.author_id] || null });
    commentsByPost.set(comment.post_id, list);
  }

  return postList.map((post) => ({
    ...post,
    author: profiles[post.user_id] || null,
    reactions: reactionsByPost.get(post.id) || [],
    comments: commentsByPost.get(post.id) || [],
  }));
}

export async function createCommunityPost({ content, postType, location, imageUrl }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Please sign in to publish a post.");

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      user_id: auth.user.id,
      title: content.trim().slice(0, 100),
      description: content.trim(),
      post_type: postType || "action",
      location: location.trim() || null,
      photo_url: imageUrl || null,
      verification_status: "pending",
    })
    .select("id, user_id, title, description, post_type, location, photo_url, verification_status, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function updateCommunityPost(postId, updates) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Please sign in to edit this post.");

  const updateData = { ...updates };
  if (typeof updateData.content === "string") {
    updateData.description = updateData.content.trim();
    updateData.title = updateData.content.trim().slice(0, 100);
    delete updateData.content;
  }

  const { data, error } = await supabase
    .from("community_posts")
    .update(updateData)
    .eq("id", postId)
    .eq("user_id", auth.user.id)
    .select("id, title, description, post_type, location, photo_url, updated_at")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCommunityPost(postId) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Please sign in to delete this post.");

  const { error } = await supabase
    .from("community_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", auth.user.id);
  if (error) throw error;
  return true;
}

export async function toggleCommunityReaction(postId) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Please sign in to react.");

  const { data: existing, error: selectError } = await supabase
    .from("community_post_reactions")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    const { error } = await supabase
      .from("community_post_reactions")
      .delete()
      .eq("id", existing.id);
    if (error) throw error;
    return { created: false };
  }

  const { error } = await supabase
    .from("community_post_reactions")
    .insert({ post_id: postId, user_id: auth.user.id, reaction_type: "support" });
  if (error) throw error;
  return { created: true };
}

export async function addCommunityComment(postId, content) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Please sign in to comment.");

  const { data, error } = await supabase
    .from("community_comments")
    .insert({
      post_id: postId,
      author_id: auth.user.id,
      text: content.trim(),
    })
    .select("id, post_id, author_id, text, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function uploadCommunityImage(file, userId) {
  if (!file) throw new Error("Choose an image to upload.");
  if (!file.type.startsWith("image/")) throw new Error("Only image files are supported.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Images must be smaller than 8 MB.");

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const unique = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const filePath = `${userId}/${unique}.${extension}`;
  const { data, error } = await supabase.storage
    .from("submission-proofs")
    .upload(filePath, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) throw new Error(`Image upload failed: ${error.message || "The submission-proofs bucket is unavailable."}`);

  const { data: publicUrl } = supabase.storage.from("submission-proofs").getPublicUrl(data.path);
  return publicUrl.publicUrl;
}
