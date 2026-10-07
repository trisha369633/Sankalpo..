import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

import "./Dashboard.css";

const filters = [
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [activeFilter, setActiveFilter] = useState("approved");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const profileResult = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        const submissionResult = await supabase
          .from("submissions")
          .select(`
            *,
            challenges (
              title,
              reward
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (profileResult.error) {
          throw profileResult.error;
        }

        if (submissionResult.error) {
          throw submissionResult.error;
        }

        setProfile(profileResult.data);
        setSubmissions(submissionResult.data || []);
      } catch (err) {
        console.error("Dashboard loading error:", err);
        setError(err.message || "Something went wrong while loading your dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-container dashboard-loading">
          Checking your account...
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-container dashboard-loading">
          Loading Sankalpo...
        </div>
      </main>
    );
  }

  const pendingCount = submissions.filter(
    (submission) => submission.status === "pending"
  ).length;

  const visibleSubmissions = submissions.filter(
    (submission) => submission.status === activeFilter
  );

  const firstName = profile?.full_name
    ? profile.full_name.split(" ")[0]
    : user.email?.split("@")[0] || "there";

  const stats = [
    {
      label: "Eco-Coins",
      value: profile?.eco_coins ?? 0,
      detail: "earned",
      icon: "coin",
    },
    {
      label: "Actions",
      value: profile?.total_actions ?? 0,
      detail: "verified",
      icon: "check",
    },
    {
      label: "Trees",
      value: profile?.trees_planted ?? 0,
      detail: "planted",
      icon: "tree",
    },
    {
      label: "Waste",
      value: profile?.waste_cleaned ?? 0,
      detail: "kg cleaned",
      icon: "waste",
    },
  ];

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        {error && <div className="dashboard-error">{error}</div>}

        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">SANKALPO / DASHBOARD</p>
            <h1>Welcome back, {firstName}</h1>
            <p>Your environmental activity at a glance.</p>
          </div>
        </header>

        <section className="dashboard-stats" aria-label="Environmental activity summary">
          {stats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <div className="stat-card-copy">
                <span className="stat-card-label">{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.detail}</small>
              </div>
              <span className={`stat-icon stat-icon-${stat.icon}`} aria-hidden="true">
                {stat.icon === "coin" && "◉"}
                {stat.icon === "check" && "✓"}
                {stat.icon === "tree" && "♧"}
                {stat.icon === "waste" && "◌"}
              </span>
            </article>
          ))}
        </section>

        <section className="submission-section" aria-labelledby="submissions-title">
          <div className="submission-section-heading">
            <div>
              <p className="section-label">YOUR ACTIVITY</p>
              <h2 id="submissions-title">Your Submissions</h2>
            </div>
            {pendingCount > 0 && (
              <span className="pending-indicator">
                {pendingCount} pending
              </span>
            )}
          </div>

          <div className="filter-tabs" role="tablist" aria-label="Submission status">
            {filters.map((filter) => {
              const count = submissions.filter(
                (submission) => submission.status === filter.id
              ).length;

              return (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === filter.id}
                  className={`filter-tab${activeFilter === filter.id ? " active" : ""}`}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  {filter.id === "approved" && "✓"} {filter.label}
                  <span>{count}</span>
                </button>
              );
            })}
          </div>

          {visibleSubmissions.length === 0 ? (
            <div className="submission-empty">
              <span className="empty-icon">{activeFilter === "approved" ? "✓" : "↺"}</span>
              <h3>No {activeFilter} submissions</h3>
              <p>
                {activeFilter === "approved"
                  ? "Approved actions will appear here."
                  : "Rejected submissions will appear here with admin feedback."}
              </p>
            </div>
          ) : (
            <div className="submission-list">
              {visibleSubmissions.map((submission) => (
                <SubmissionCard key={submission.id} submission={submission} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SubmissionCard({ submission }) {
  const [proofUrl, setProofUrl] = useState("");
  const [proofLoading, setProofLoading] = useState(Boolean(submission.photo_url));
  const status = submission.status || "pending";
  const challengeTitle = submission.challenges?.title || "Environmental Action";
  const submittedDate = submission.created_at
    ? new Date(submission.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Unknown";

  useEffect(() => {
    let cancelled = false;

    async function loadProof() {
      if (!submission.photo_url) {
        setProofLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.storage
          .from("submission-proofs")
          .createSignedUrl(submission.photo_url, 3600);

        if (!cancelled && !error) {
          setProofUrl(data?.signedUrl || "");
        }
      } catch (err) {
        console.error("Proof thumbnail loading error:", err);
      } finally {
        if (!cancelled) setProofLoading(false);
      }
    }

    loadProof();
    return () => {
      cancelled = true;
    };
  }, [submission.photo_url]);

  return (
    <article className={`submission-card status-${status}`}>
      {proofUrl && (
        <button
          type="button"
          className="proof-thumbnail"
          onClick={() => window.open(proofUrl, "_blank", "noopener,noreferrer")}
          aria-label={`Open proof for ${challengeTitle}`}
        >
          <img src={proofUrl} alt={`Proof for ${challengeTitle}`} />
        </button>
      )}

      <div className="submission-card-main">
        <div className="submission-card-topline">
          <span className={`submission-status status-${status}`}>
            {status === "approved" ? "✓ Approved" : "Rejected"}
          </span>
          <time dateTime={submission.created_at}>{submittedDate}</time>
        </div>

        <h3>{challengeTitle}</h3>

        {status === "approved" ? (
          <div className="approved-summary">
            <span className="approved-reward">
              +{submission.challenges?.reward ?? 0} coins
            </span>
            <p>Verified environmental action</p>
          </div>
        ) : (
          <div className="rejected-summary">
            <div className="feedback-label">Admin feedback</div>
            <p>{submission.admin_note || "No rejection reason was provided."}</p>
            <Link
              to={`/challenge/${submission.challenge_id}`}
              className="resubmit-button"
            >
              Submit Again
            </Link>
          </div>
        )}
      </div>

      {proofLoading && (
        <div className="proof-loading" aria-label="Loading proof">
          Loading proof…
        </div>
      )}
    </article>
  );
}
