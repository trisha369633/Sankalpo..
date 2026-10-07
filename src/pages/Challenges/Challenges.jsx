import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "../../lib/supabase";
import "./Challenges.css";

export default function Challenges() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadChallenges() {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("status", "published")
        .order("start_date", { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setChallenges(data || []);
      }

      setLoading(false);
    }

    loadChallenges();
  }, []);

  return (
    <div className="challenges-page">
      <div className="challenges-container">
        <header className="page-heading">
          <div>
            <p className="section-label">COMMUNITY ACTIONS</p>
            <h1>Challenges</h1>
            <p>
              Complete a meaningful environmental action, submit proof, and
              earn Eco-Coins after review.
            </p>
          </div>
        </header>

        {error && <div className="page-error">{error}</div>}

        {loading ? (
          <div className="loading-card">Loading challenges...</div>
        ) : challenges.length === 0 ? (
          <div className="empty-card">
            <h2>No published challenges yet</h2>
            <p>Check back soon for the next weekly mission.</p>
          </div>
        ) : (
          <section className="challenge-list">
            {challenges.map((item, index) => (
              <article className="challenge-list-card" key={item.id}>
                <div className="challenge-index">0{index + 1}</div>
                <div className="challenge-list-content">
                  <div className="challenge-list-title">
                    <div>
                      <p className="challenge-type">
                        {index === 0 ? "THIS WEEK'S CHALLENGE" : "PAST CHALLENGE"}
                      </p>
                      <h2>{item.title}</h2>
                    </div>
                    <span className="reward-pill">
                      {item.reward} Eco-Coins
                    </span>
                  </div>
                  <p>{item.description}</p>
                  <div className="challenge-meta">
                    <span>Ends {item.end_date}</span>
                    <Link to={`/challenge/${item.id}`}>
                      View challenge →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
