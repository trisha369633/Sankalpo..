import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "../../lib/supabase";
import "./Challenges.css";

function formatDate(value) {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function isActiveChallenge(challenge) {
  if (!challenge.end_date) return true;
  return new Date(challenge.end_date).getTime() > Date.now();
}

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

  const activeChallenge = challenges.find(isActiveChallenge);
  const pastChallenges = challenges.filter(
    (challenge) => !isActiveChallenge(challenge)
  );

  return (
    <main className="challenges-page">
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
          <div className="challenge-section-stack">
            <section className="challenge-section">
              <div className="challenge-section-heading">
                <div>
                  <p className="section-label">THIS WEEK'S CHALLENGE</p>
                  <h2>Take action</h2>
                </div>
                <span className="section-count">
                  {activeChallenge ? "1 active" : "0 active"}
                </span>
              </div>

              {activeChallenge ? (
                <ChallengeCard challenge={activeChallenge} featured />
              ) : (
                <div className="empty-card">
                  <h2>No active challenge this week</h2>
                  <p>Check back when the next challenge is published.</p>
                </div>
              )}
            </section>

            <section className="challenge-section past-section">
              <div className="challenge-section-heading">
                <div>
                  <p className="section-label">PAST CHALLENGES</p>
                  <h2>Community history</h2>
                </div>
                <span className="section-count">{pastChallenges.length}</span>
              </div>

              {pastChallenges.length > 0 ? (
                <div className="past-challenge-grid">
                  {pastChallenges.map((challenge) => (
                    <ChallengeCard key={challenge.id} challenge={challenge} />
                  ))}
                </div>
              ) : (
                <div className="empty-card compact-empty">
                  <p>No past challenges yet.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function ChallengeCard({ challenge, featured = false }) {
  const [showDetails, setShowDetails] = useState(false);
  const instructions = challenge.instructions ||
    "Complete the action and submit clear proof of what you did.";
  const proofRequirements = challenge.proof_requirements ||
    "Upload a clear photo showing the completed environmental action.";
  const importantNotes = challenge.important_notes ||
    "Submissions without clear proof may be rejected.";

  return (
    <article className={`challenge-card${featured ? " featured" : ""}`}>
      <div className="challenge-card-main">
        <div className="challenge-card-topline">
          <span className="challenge-type">
            {featured ? "THIS WEEK'S CHALLENGE" : "PAST CHALLENGE"}
          </span>
          <span className="reward-pill">+{challenge.reward} Eco-Coins</span>
        </div>

        <h2>{challenge.title}</h2>
        <p className="challenge-description">{challenge.description}</p>

        <div className="challenge-date-row">
          <span>Starts {formatDate(challenge.start_date)}</span>
          <span>Ends {formatDate(challenge.end_date)}</span>
        </div>

        <div className="challenge-card-actions">
          <Link to={`/challenge/${challenge.id}`} className="take-challenge-button">
            Take Challenge
          </Link>
          <button
            type="button"
            className="details-toggle"
            onClick={() => setShowDetails((current) => !current)}
            aria-expanded={showDetails}
          >
            {showDetails ? "Hide details" : "View details"}
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="challenge-details-panel">
          <div className="challenge-detail-block">
            <h3>WHAT TO DO</h3>
            <p>{instructions}</p>
          </div>
          <div className="challenge-detail-block">
            <h3>PROOF REQUIREMENTS</h3>
            <p>{proofRequirements}</p>
          </div>
          <div className="challenge-detail-block">
            <h3>IMPORTANT NOTES</h3>
            <p>{importantNotes}</p>
          </div>
        </div>
      )}
    </article>
  );
}
