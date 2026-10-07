import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

import "./Dashboard.css";

export default function Dashboard() {
  const {
    user,
    loading: authLoading,
    signOut,
  } = useAuth();

  const [profile, setProfile] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        // =========================================
        // LOAD PROFILE
        // =========================================

        const profileResult = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        // =========================================
        // LOAD CURRENT CHALLENGE
        // =========================================

        const challengeResult = await supabase
          .from("challenges")
          .select("*")
          .eq("status", "published")
          .order("start_date", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        // =========================================
        // LOAD USER SUBMISSIONS
        // =========================================

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
          .order("created_at", {
            ascending: false,
          });

        // =========================================
        // PROFILE ERROR
        // =========================================

        if (profileResult.error) {
          console.error(
            "Profile loading error:",
            profileResult.error
          );

          setError(profileResult.error.message);
        } else {
          setProfile(profileResult.data);
        }

        // =========================================
        // CHALLENGE ERROR
        // =========================================

        if (challengeResult.error) {
          console.error(
            "Challenge loading error:",
            challengeResult.error
          );
        } else {
          setChallenge(
            challengeResult.data
          );
        }

        // =========================================
        // SUBMISSION ERROR
        // =========================================

        if (submissionResult.error) {
          console.error(
            "Submission loading error:",
            submissionResult.error
          );

          setError(
            submissionResult.error.message
          );
        } else {
          setSubmissions(
            submissionResult.data || []
          );
        }
      } catch (err) {
        console.error(
          "Dashboard loading error:",
          err
        );

        setError(
          "Something went wrong while loading your dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [user, authLoading]);

  // =========================================
  // AUTH LOADING
  // =========================================

  if (authLoading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-container">
          <p>Checking your account...</p>
        </div>
      </main>
    );
  }

  // =========================================
  // NOT LOGGED IN
  // =========================================

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  // =========================================
  // DASHBOARD LOADING
  // =========================================

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-container">
          <p>Loading Sankalpo...</p>
        </div>
      </main>
    );
  }

  // =========================================
  // USER INFORMATION
  // =========================================

  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    "Changemaker";

  const firstName =
    displayName.split(" ")[0];

  // =========================================
  // LOGOUT
  // =========================================

  async function handleLogout() {
    await signOut();
  }

  // =========================================
  // SUBMISSION COUNTS
  // =========================================

  const pendingSubmissions =
    submissions.filter(
      (item) => item.status === "pending"
    );

  const approvedSubmissions =
    submissions.filter(
      (item) => item.status === "approved"
    );

  const rejectedSubmissions =
    submissions.filter(
      (item) => item.status === "rejected"
    );

  return (
    <main className="dashboard-page">

      <div className="dashboard-container">

        {/* =========================================
            HEADER
        ========================================= */}

        <header className="dashboard-header">

          <div>

            <p className="dashboard-eyebrow">
              SANKALPO / DASHBOARD
            </p>

            <h1>
              Good to see you, {firstName} 🌱
            </h1>

            <p>
              One small action this week can create
              real environmental impact.
            </p>

          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>

        </header>


        {/* =========================================
            ERROR
        ========================================= */}

        {error && (
          <div className="dashboard-error">
            {error}
          </div>
        )}


        {/* =========================================
            STATISTICS
        ========================================= */}

        <section className="dashboard-stats">

          <div className="stat-card">

            <div>
              <h3>
                Eco-Coins
              </h3>

              <strong>
                {profile?.eco_coins ?? 0}
              </strong>
            </div>

            <span>
              🪙
            </span>

          </div>


          <div className="stat-card">

            <div>
              <h3>
                Actions Completed
              </h3>

              <strong>
                {profile?.total_actions ?? 0}
              </strong>
            </div>

            <span>
              ✓
            </span>

          </div>


          <div className="stat-card">

            <div>
              <h3>
                Trees Planted
              </h3>

              <strong>
                {profile?.trees_planted ?? 0}
              </strong>
            </div>

            <span>
              🌳
            </span>

          </div>

        </section>


        {/* =========================================
            WEEKLY CHALLENGE
        ========================================= */}

        <section className="challenge-section">

          <div className="section-heading">

            <div>

              <p className="section-label">
                THIS WEEK
              </p>

              <h2>
                Community Challenge
              </h2>

            </div>

          </div>


          {challenge ? (

            <div className="challenge-card">

              <div className="challenge-icon">
                🌱
              </div>

              <div className="challenge-content">

                <p className="challenge-week">
                  WEEKLY ECO CHALLENGE
                </p>

                <h2>
                  {challenge.title}
                </h2>

                <p>
                  {challenge.description}
                </p>

                <div className="challenge-meta">

                  <span>
                    🪙 {challenge.reward} Eco-Coins
                  </span>

                  <span>
                    📅 Ends {challenge.end_date}
                  </span>

                </div>

                <Link
                  to={`/challenge/${challenge.id}`}
                  className="primary-button"
                >
                  View Challenge →
                </Link>

              </div>

            </div>

          ) : (

            <div className="empty-challenge">

              <div>
                🌿
              </div>

              <h3>
                No weekly challenge yet
              </h3>

              <p>
                Your next environmental challenge
                will appear here.
              </p>

            </div>

          )}

        </section>


        {/* =========================================
            SUBMISSION STATUS
        ========================================= */}

        <section className="submission-status-section">

          <div className="section-heading">

            <div>

              <p className="section-label">
                YOUR ACTIVITY
              </p>

              <h2>
                Submission Status
              </h2>

            </div>

            <div className="submission-summary">

              {pendingSubmissions.length > 0 && (
                <span className="summary-pending">
                  {pendingSubmissions.length} pending
                </span>
              )}

              {approvedSubmissions.length > 0 && (
                <span className="summary-approved">
                  {approvedSubmissions.length} approved
                </span>
              )}

              {rejectedSubmissions.length > 0 && (
                <span className="summary-rejected">
                  {rejectedSubmissions.length} rejected
                </span>
              )}

            </div>

          </div>


          {submissions.length === 0 ? (

            <div className="submission-empty">

              <div className="submission-empty-icon">
                🌱
              </div>

              <h3>
                No submissions yet
              </h3>

              <p>
                Complete this week's challenge
                and submit your proof here.
              </p>

            </div>

          ) : (

            <div className="submission-list">

              {submissions.map(
                (submission) => (

                  <SubmissionStatusCard
                    key={submission.id}
                    submission={submission}
                  />

                )
              )}

            </div>

          )}

        </section>


        {/* =========================================
            PERSONAL IMPACT
        ========================================= */}

        <section className="impact-section">

          <div className="dashboard-card">

            <p className="section-label">
              YOUR IMPACT
            </p>

            <h2>
              Every action counts.
            </h2>

            <div className="impact-grid">

              <div>

                <span>
                  🌳
                </span>

                <strong>
                  {profile?.trees_planted ?? 0}
                </strong>

                <small>
                  Trees planted
                </small>

              </div>


              <div>

                <span>
                  🗑️
                </span>

                <strong>
                  {profile?.waste_cleaned ?? 0}
                </strong>

                <small>
                  Kg waste cleaned
                </small>

              </div>


              <div>

                <span>
                  🌍
                </span>

                <strong>
                  {profile?.total_actions ?? 0}
                </strong>

                <small>
                  Verified actions
                </small>

              </div>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}


/* =========================================
   SUBMISSION STATUS CARD
========================================= */

function SubmissionStatusCard({
  submission,
}) {
  const challengeTitle =
    submission.challenges?.title ||
    "Weekly Challenge";

  const reward =
    submission.challenges?.reward ?? 0;

  const submittedDate =
    submission.created_at
      ? new Date(
          submission.created_at
        ).toLocaleDateString()
      : "Unknown";

  const status =
    submission.status || "pending";

  return (
    <article
      className={`submission-status-card status-${status}`}
    >

      {/* TOP */}

      <div className="submission-status-top">

        <div>

          <p className="submission-date">
            Submitted {submittedDate}
          </p>

          <h3>
            {challengeTitle}
          </h3>

        </div>


        <div
          className={`submission-status-badge status-badge-${status}`}
        >

          {status === "pending" && (
            <>
              🟡 Under Review
            </>
          )}

          {status === "approved" && (
            <>
              🟢 Approved
            </>
          )}

          {status === "rejected" && (
            <>
              🔴 Rejected
            </>
          )}

        </div>

      </div>


      {/* PENDING */}

      {status === "pending" && (

        <div className="submission-message pending-message">

          <strong>
            Your submission is being reviewed.
          </strong>

          <p>
            Our admin will verify your proof.
            You will receive your Eco-Coins
            after approval.
          </p>

        </div>

      )}


      {/* APPROVED */}

      {status === "approved" && (

        <div className="submission-message approved-message">

          <strong>
            🎉 Your action has been verified!
          </strong>

          <p>
            You earned{" "}
            <strong>
              {reward} Eco-Coins
            </strong>{" "}
            for this challenge.
          </p>

        </div>

      )}


      {/* REJECTED */}

      {status === "rejected" && (

        <div className="submission-message rejected-message">

          <strong>
            Your submission was not approved.
          </strong>

          {submission.admin_note ? (

            <div className="rejection-reason">

              <span>
                ADMIN FEEDBACK
              </span>

              <p>
                {submission.admin_note}
              </p>

            </div>

          ) : (

            <p>
              No rejection reason was provided.
            </p>

          )}

          <Link
            to={`/challenge/${submission.challenge_id}`}
            className="resubmit-button"
          >
            Submit Again →
          </Link>

        </div>

      )}

    </article>
  );
}