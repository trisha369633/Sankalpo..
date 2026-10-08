export function aggregateVerifiedImpact(submissions = []) {
  const approved = submissions.filter(
    (submission) =>
      submission.status === "approved" &&
      submission.profiles?.role !== "admin" &&
      submission.role !== "admin"
  );

  const participants = new Set(
    approved
      .map((submission) => submission.user_id)
      .filter(Boolean)
  );

  const trees = approved.reduce((total, submission) => {
    const impactType = submission.challenges?.impact_type || submission.impact_type;
    const verifiedTrees = Number(submission.verified_trees ?? 0);
    return impactType === "trees" ? total + verifiedTrees : total;
  }, 0);

  const wasteKg = approved.reduce((total, submission) => {
    const impactType = submission.challenges?.impact_type || submission.impact_type;
    const verifiedWaste = Number(submission.verified_waste_kg ?? 0);
    return impactType === "waste" ? total + verifiedWaste : total;
  }, 0);

  return {
    actions: approved.length,
    trees,
    wasteKg: Math.round(wasteKg * 100) / 100,
    participants: participants.size,
  };
}

export function getChallengeProgress(submissions = [], challengeId) {
  const approved = submissions.filter(
    (submission) =>
      submission.status === "approved" &&
      submission.challenge_id === challengeId
  );

  const impact = aggregateVerifiedImpact(approved);
  return impact;
}

export function formatImpactNumber(value) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);
}
