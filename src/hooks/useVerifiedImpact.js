import { useEffect, useState } from "react";

import { aggregateVerifiedImpact } from "../lib/impact";
import { loadVerifiedSubmissions } from "../lib/impactService";

export function useVerifiedImpact() {
  const [impact, setImpact] = useState({
    actions: 0,
    trees: 0,
    wasteKg: 0,
    participants: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadImpact() {
      try {
        const submissions = await loadVerifiedSubmissions();
        if (!cancelled) {
          setImpact(aggregateVerifiedImpact(submissions));
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load verified impact.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadImpact();
    return () => {
      cancelled = true;
    };
  }, []);

  return { impact, loading, error };
}
