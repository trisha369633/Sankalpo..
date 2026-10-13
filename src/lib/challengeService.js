import { supabase } from "./supabase";

export function deduplicateChallengesByTitle(challenges) {
  const seenTitles = new Set();
  return (challenges || []).filter((challenge) => {
    const title = (challenge.title || "").trim().replace(/\s+/g, " ").toLowerCase();
    if (!title) return true;
    if (seenTitles.has(title)) return false;
    seenTitles.add(title);
    return true;
  });
}

export async function loadUserChallengeSubmissionStatuses(userId, challengeIds) {
  if (!userId) throw new Error("Please sign in to check challenge status.");

  const ids = [...new Set((challengeIds || []).filter(Boolean))];
  if (!ids.length) return {};

  const { data, error } = await supabase
    .from("submissions")
    .select("challenge_id, status, created_at")
    .eq("user_id", userId)
    .in("challenge_id", ids)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).reduce((statuses, submission) => {
    const currentStatus = statuses[submission.challenge_id];
    if (submission.status === "approved" || !currentStatus) {
      statuses[submission.challenge_id] = submission.status;
    }
    return statuses;
  }, {});
}