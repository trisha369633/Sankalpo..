import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { LeafIcon } from "../../components/SankalpoIcons";
import { useAuth } from "../../context/AuthContext";
import { useVerifiedImpact } from "../../hooks/useVerifiedImpact";
import { formatImpactNumber } from "../../lib/impact";
import { supabase } from "../../lib/supabase";
import "./Home.css";

export default function Home() {
  const { profile } = useAuth();
  const { impact, loading: impactLoading } = useVerifiedImpact();
  const [challenge, setChallenge] = useState(null);

  useEffect(() => {
    async function loadChallenge() {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("status", "published")
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error) {
        setChallenge(data);
      }
    }

    loadChallenge();
  }, []);

  const displayName =
    profile?.full_name ||
    profile?.email?.split("@")[0] ||
    "Changemaker";

  return (
    <div className="home-page">
      <div className="home-container">
        <section className="welcome-card">
          <div>
            <p className="section-label">YOUR WEEK</p>
            <h1>
              Good to see you, {displayName}
              <LeafIcon size={22} strokeWidth={1.7} />
            </h1>
            <p className="welcome-copy">
              Make one meaningful environmental action and turn it into
              lasting community impact.
            </p>
          </div>
          <Link className="primary-button" to="/dashboard">
            View my activity
          </Link>
        </section>

        <section className="home-grid">
          <article className="mission-card">
            <div className="mission-card-heading">
              <div>
                <p className="section-label">THIS WEEK'S MISSION</p>
                <h2>{challenge?.title || "Weekly challenge"}</h2>
              </div>
              <span className="coin-pill">
                {challenge?.reward ?? 0} Eco-Coins
              </span>
            </div>

            <p>{challenge?.description || "Your next action is coming soon."}</p>

            <div className="mission-actions">
              {challenge ? (
                <Link className="primary-button" to={`/challenge/${challenge.id}`}>
                  Take the challenge
                </Link>
              ) : (
                <Link className="primary-button" to="/challenges">
                  View challenges
                </Link>
              )}
              <span>Ends {challenge?.end_date || "soon"}</span>
            </div>
          </article>

          <aside className="impact-card">
            <p className="section-label">VERIFIED IMPACT</p>
            <h2>Community progress, not self-reports.</h2>
            <div className="impact-list">
              <div>
                <strong>{impactLoading ? "—" : formatImpactNumber(impact.actions)}</strong>
                <span>Approved actions</span>
              </div>
              <div>
                <strong>{impactLoading ? "—" : formatImpactNumber(impact.trees)}</strong>
                <span>Verified trees</span>
              </div>
              <div>
                <strong>{impactLoading ? "—" : formatImpactNumber(impact.wasteKg)}</strong>
                <span>kg verified waste</span>
              </div>
            </div>
          </aside>
        </section>

        <section className="community-card">
          <div>
            <p className="section-label">COMMUNITY</p>
            <h2>See the Eco Champions</h2>
            <p>
              Compare your verified environmental actions with the Sankalpo
              community.
            </p>
          </div>
          <Link className="secondary-button" to="/leaderboard">
            View leaderboard
          </Link>
        </section>
      </div>
    </div>
  );
}
