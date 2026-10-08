import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import {
  ActionsIcon,
  ApprovedIcon,
  CoinIcon,
  RejectedIcon,
  TreeIcon,
  WasteIcon,
} from "../../components/SankalpoIcons";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

import "./Dashboard.css";

const submissionFilters = [
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
          .maybeSingle();

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

  const visibleSubmissions = submissions.filter(
    (submission) => submission.status === activeFilter
  );
  const activeFilterDetails = submissionFilters.find(
    (filter) => filter.id === activeFilter
  );

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        {error && <div className="dashboard-error">{error}</div>}

        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">SANKALPO / DASHBOARD</p>
            <h1>Your environmental activity at a glance.</h1>
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
                {stat.icon === "coin" && <CoinIcon size={19} strokeWidth={1.8} />}
                {stat.icon === "check" && <ActionsIcon size={19} strokeWidth={1.8} />}
                {stat.icon === "tree" && <TreeIcon size={19} strokeWidth={1.8} />}
                {stat.icon === "waste" && <WasteIcon size={19} strokeWidth={1.8} />}
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
            <span className="submission-count">
              {submissions.length} total
            </span>
          </div>

          <div className="submission-status-row" role="tablist" aria-label="Submission status">
            {submissionFilters.map((filter) => {
              const count = submissions.filter(
                (submission) => submission.status === filter.id
              ).length;

              return (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === filter.id}
                  className={`submission-status-filter${
                    activeFilter === filter.id ? " active" : ""
                  }`}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  <span className="filter-symbol" aria-hidden="true">
                    {filter.id === "approved"
                      ? <ApprovedIcon size={15} strokeWidth={2} />
                      : <RejectedIcon size={15} strokeWidth={2} />}
                  </span>
                  <span>{filter.label}</span>
                  <small>{count}</small>
                </button>
              );
            })}
          </div>

          <div className="submission-status-divider" aria-hidden="true" />

          <div className="submission-view">
            {visibleSubmissions.length === 0 ? (
              <div className="submission-empty">
                <span className="empty-icon" aria-hidden="true">
                  {activeFilter === "approved"
                    ? <ApprovedIcon size={20} strokeWidth={1.8} />
                    : <RejectedIcon size={20} strokeWidth={1.8} />}
                </span>
                <h3>No {activeFilter} submissions</h3>
                <p>
                  {activeFilter === "approved"
                    ? "Approved actions will appear here."
                    : "Rejected submissions will appear here with admin feedback."}
                </p>
              </div>
            ) : (
              <div className="submission-grid">
                {visibleSubmissions.map((submission) => (
                  <SubmissionCard
                    key={submission.id}
                    submission={submission}
                  />
                ))}
              </div>
            )}
          </div>

          <p className="visually-hidden" aria-live="polite">
            Showing {activeFilterDetails?.label.toLowerCase()} submissions.
          </p>
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
      <div className="submission-card-topline">
        <span className={`submission-status status-${status}`}>
          {status === "approved"
            ? <ApprovedIcon size={15} strokeWidth={2} />
            : <RejectedIcon size={15} strokeWidth={2} />}
          {status === "approved" ? "Approved" : "Rejected"}
        </span>
        <time dateTime={submission.created_at}>{submittedDate}</time>
      </div>

      <div className="submission-card-content">
        <h3>{challengeTitle}</h3>

        {status === "approved" ? (
          <div className="approved-summary">
            <span>+{submission.challenges?.reward ?? 0} Eco-Coins</span>
            <p>Verified environmental action</p>
          </div>
        ) : (
          <div className="rejected-summary">
            <div className="feedback-label">Admin feedback</div>
            <p>{submission.admin_note || "No rejection reason was provided."}</p>
            <Link to={`/challenge/${submission.challenge_id}`}>
              Submit Again
            </Link>
          </div>
        )}
      </div>

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

      {proofLoading && (
        <div className="proof-loading" aria-label="Loading proof">
          Loading proof…
        </div>
      )}
    </article>
  );
}
