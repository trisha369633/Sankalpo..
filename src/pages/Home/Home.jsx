import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import "./Home.css";

export default function Home() {
  const { profile } = useAuth();
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
            <h1>Good to see you, {displayName} 🌱</h1>
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
            <p className="section-label">YOUR IMPACT</p>
            <h2>Keep the momentum going.</h2>
            <div className="impact-list">
              <div>
                <strong>{profile?.eco_coins ?? 0}</strong>
                <span>Eco-Coins</span>
              </div>
              <div>
                <strong>{profile?.total_actions ?? 0}</strong>
                <span>Actions completed</span>
              </div>
              <div>
                <strong>{profile?.trees_planted ?? 0}</strong>
                <span>Trees planted</span>
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
