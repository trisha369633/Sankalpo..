import { supabase } from "./supabase";

const postFields = `*,
  author:profiles(full_name, avatar_url),
  reactions:community_post_reactions(id, reaction_type, user_id),
  comments:community_comments(id, author_id, text, created_at, author:profiles(full_name, avatar_url))`;

export async function loadCommunityPosts() {
  const { data, error } = await supabase
    .from("community_posts")
    .select(postFields)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createCommunityPost({ title, description, postType, location }) {
  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      author_id: (await supabase.auth.getUser()).data.user.id,
      title,
      description,
      post_type: postType,
      location,
      verification_status: "pending",
    })
    .select("id, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function toggleCommunityReaction(postId, reactionType) {
  const { data: user } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to react.");

  const { data: existing } = await supabase
    .from("community_post_reactions")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .eq("reaction_type", reactionType)
    .maybeSingle();

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
    .insert({
      post_id: postId,
      user_id: user.id,
      reaction_type: reactionType,
    });

  if (error) throw error;
  return { created: true };
}

export async function addCommunityComment(postId, text) {
  const { data: user } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to comment.");

  const { data, error } = await supabase
    .from("community_comments")
    .insert({
      post_id: postId,
      author_id: user.id,
      text,
    })
    .select("id, created_at, text, author_id")
    .single();

  if (error) throw error;
  return data;
}

export async function reportCommunityPost(postId, reason) {
  const { data: user } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to report.");

  const { error } = await supabase.from("post_reports").insert({
    post_id: postId,
    reporter_id: user.id,
    reason,
    status: "pending",
  });

  if (error) throw error;
  return true;
}

export async function loadProblems() {
  const { data, error } = await supabase
    .from("environmental_problems")
    .select("*, author:profiles(full_name, avatar_url)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createProblem({ title, description, problemType, location }) {
  const { data: user } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to report a problem.");

  const { data, error } = await supabase
    .from("environmental_problems")
    .insert({
      author_id: user.id,
      title,
      description,
      problem_type: problemType,
      location,
      status: "reported",
    })
    .select("id, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function reportProblem(problemId, reason) {
  const { data: user } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to report.");

  const { error } = await supabase.from("problem_reports").insert({
    problem_id: problemId,
    reporter_id: user.id,
    reason,
    status: "pending",
  });

  if (error) throw error;
  return true;
}

export async function createConversation(participantId) {
  const { data: user } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to message.");
  if (!participantId || participantId === user.id) {
    throw new Error("Choose a different participant.");
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      owner_id: user.id,
      participant_id: participantId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function loadMessages(conversationId) {
  const { data, error } = await supabase
    .from("messages")
    .select("*, sender:profiles(full_name, avatar_url)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function sendMessage(conversationId, content) {
  const { data: user } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to message.");

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
    })
    .select("id, content, created_at, sender_id")
    .single();

  if (error) throw error;
  return data;
}
