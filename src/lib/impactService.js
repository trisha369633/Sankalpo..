import { supabase } from "./supabase";

export async function loadVerifiedSubmissions() {
  const { data, error } = await supabase
    .from("submissions")
    .select(`
      id,
      user_id,
      challenge_id,
      status,
      created_at,
      verified_trees,
      verified_waste_kg,
      reported_waste_kg,
      admin_note,
      profiles (full_name, role),
      challenges (
        id,
        title,
        impact_type,
        target_value,
        target_unit,
        reward
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function loadApprovalHistory(userId) {
  const { data, error } = await supabase
    .from("submissions")
    .select(`
      id,
      challenge_id,
      status,
      created_at,
      admin_note,
      verified_trees,
      verified_waste_kg,
      reported_waste_kg,
      challenges (
        id,
        title,
        impact_type,
        reward
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}
