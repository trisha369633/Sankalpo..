import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "../../lib/supabase";

import "./Leaderboard.css";

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadLeaderboard() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          eco_coins,
          total_actions,
          trees_planted,
          waste_cleaned
        `)
        .order("eco_coins", {
          ascending: false,
        })
        .order("total_actions", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Leaderboard loading error:",
          error
        );

        setError(
          "Unable to load the leaderboard."
        );
      } else {
        setUsers(data || []);
      }

      setLoading(false);
    }

    loadLeaderboard();
  }, []);

  return (
    <main className="leaderboard-page">
      <div className="leaderboard-container">

        <header className="leaderboard-header">
          <div>
            <p className="leaderboard-eyebrow">
              SANKALPO / COMMUNITY
            </p>

            <h1>
              Eco Champions 🏆
            </h1>

            <p>
              Every verified action brings you
              closer to the top.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="back-dashboard-button"
          >
            ← Dashboard
          </Link>
        </header>

        {error && (
          <div className="leaderboard-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="leaderboard-loading">
            <p>Loading Eco Champions...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="leaderboard-empty">
            <div>🌱</div>

            <h2>
              No champions yet
            </h2>

            <p>
              Complete a challenge and become
              the first Eco Champion.
            </p>
          </div>
        ) : (
          <>
            {/* TOP 3 */}

            <section className="top-champions">
              {users.slice(0, 3).map(
                (user, index) => (
                  <div
                    key={user.id}
                    className={`champion-card champion-${index + 1}`}
                  >
                    <div className="champion-rank">
                      {index === 0 && "🥇"}
                      {index === 1 && "🥈"}
                      {index === 2 && "🥉"}
                    </div>

                    <div className="champion-avatar">
                      {user.full_name
                        ?.charAt(0)
                        ?.toUpperCase() || "U"}
                    </div>

                    <h2>
                      {user.full_name ||
                        "Eco Champion"}
                    </h2>

                    <strong>
                      {user.eco_coins ?? 0}
                    </strong>

                    <span>
                      Eco-Coins
                    </span>

                    <div className="champion-actions">
                      <span>
                        🌱 {user.total_actions ?? 0}
                        {" "}actions
                      </span>

                      <span>
                        🌳 {user.trees_planted ?? 0}
                      </span>
                    </div>
                  </div>
                )
              )}
            </section>

            {/* FULL LEADERBOARD */}

            <section className="leaderboard-list-section">
              <div className="leaderboard-section-heading">
                <div>
                  <p className="section-label">
                    COMMUNITY RANKING
                  </p>

                  <h2>
                    All Eco Champions
                  </h2>
                </div>

                <span>
                  {users.length} participants
                </span>
              </div>

              <div className="leaderboard-list">
                {users.map(
                  (user, index) => (
                    <article
                      key={user.id}
                      className="leaderboard-row"
                    >
                      <div className="rank-number">
                        {index + 1}
                      </div>

                      <div className="leaderboard-avatar">
                        {user.full_name
                          ?.charAt(0)
                          ?.toUpperCase() || "U"}
                      </div>

                      <div className="leaderboard-user">
                        <h3>
                          {user.full_name ||
                            "Eco Champion"}
                        </h3>

                        <p>
                          {user.total_actions ?? 0}
                          {" "}verified actions
                        </p>
                      </div>

                      <div className="leaderboard-impact">
                        <span>
                          🌳
                          {" "}
                          {user.trees_planted ?? 0}
                        </span>

                        <span>
                          🗑️
                          {" "}
                          {user.waste_cleaned ?? 0}
                        </span>
                      </div>

                      <div className="leaderboard-coins">
                        <strong>
                          {user.eco_coins ?? 0}
                        </strong>

                        <span>
                          Eco-Coins
                        </span>
                      </div>
                    </article>
                  )
                )}
              </div>
            </section>
          </>
        )}

      </div>
    </main>
  );
}