import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

import "./AdminDashboard.css";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    async function loadAdminData() {
      setLoading(true);
      setError("");

      console.log("LOGGED IN USER:", user.id);
      console.log("LOGGED IN EMAIL:", user.email);

      try {
        // =========================================
        // LOAD PROFILE
        // =========================================

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        console.log("PROFILE DATA:", profileData);
        console.log("PROFILE ERROR:", profileError);

        if (profileError) {
          throw profileError;
        }

        if (!profileData) {
          setError(
            "Your account does not have a profile in the profiles table."
          );

          setLoading(false);
          return;
        }

        setProfile(profileData);

        // =========================================
        // ADMIN CHECK
        // =========================================

        console.log("USER ROLE:", profileData.role);

        if (profileData.role !== "admin") {
          setError(
            `Admin access denied. Current role: ${profileData.role}`
          );

          setLoading(false);
          return;
        }

        // =========================================
        // LOAD SUBMISSIONS
        // =========================================

        const {
          data: submissionData,
          error: submissionError,
        } = await supabase
          .from("submissions")
          .select(`
            *,
            profiles (
              full_name,
              avatar_url
            ),
            challenges (
              title,
              reward
            )
          `)
          .order("created_at", {
            ascending: false,
          });

        if (submissionError) {
          throw submissionError;
        }

        console.log(
          "SUBMISSIONS:",
          submissionData
        );

        setSubmissions(submissionData || []);
      } catch (err) {
        console.error(
          "ADMIN DASHBOARD ERROR:",
          err
        );

        setError(
          err.message ||
            "Failed to load admin dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAdminData();
  }, [user, authLoading]);

  // =========================================
  // UPDATE SUBMISSION STATUS
  // =========================================

  async function handleStatusChange(
    submissionId,
    newStatus,
    adminNote = null
  ) {
    setActionLoading(submissionId);
    setError("");

    try {
      const updateData = {
        status: newStatus,
      };

      if (adminNote !== null) {
        updateData.admin_note = adminNote;
      }

      const {
        error: updateError,
      } = await supabase
        .from("submissions")
        .update(updateData)
        .eq("id", submissionId);

      if (updateError) {
        throw updateError;
      }

      setSubmissions((current) =>
        current.map((submission) =>
          submission.id === submissionId
            ? {
                ...submission,
                ...updateData,
              }
            : submission
        )
      );
    } catch (err) {
      console.error(
        "SUBMISSION UPDATE ERROR:",
        err
      );

      setError(
        err.message ||
          "Failed to update submission."
      );
    } finally {
      setActionLoading(null);
    }
  }

  // =========================================
  // APPROVE
  // =========================================

  async function handleApprove(submissionId) {
    await handleStatusChange(
      submissionId,
      "approved"
    );
  }

  // =========================================
  // REJECT
  // =========================================

  async function handleReject(submissionId) {
    const note = window.prompt(
      "Why are you rejecting this submission?"
    );

    if (note === null) {
      return;
    }

    const trimmedNote = note.trim();

    if (!trimmedNote) {
      setError(
        "Please provide a reason before rejecting."
      );
      return;
    }

    await handleStatusChange(
      submissionId,
      "rejected",
      trimmedNote
    );
  }

  // =========================================
  // AUTH LOADING
  // =========================================

  if (authLoading) {
    return (
      <main className="admin-page">
        <div className="admin-container">
          <p>Checking admin access...</p>
        </div>
      </main>
    );
  }

  // =========================================
  // NOT LOGGED IN
  // =========================================

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <main className="admin-page">
        <div className="admin-container">
          <p>Loading Admin Dashboard...</p>
        </div>
      </main>
    );
  }

  // =========================================
  // NO PROFILE
  // =========================================

  if (!profile) {
    return (
      <main className="admin-page">
        <div className="admin-container">
          <div className="admin-error">
            {error ||
              "Profile not found for this account."}
          </div>
        </div>
      </main>
    );
  }

  // =========================================
  // NOT ADMIN
  // =========================================

  if (profile.role !== "admin") {
    return (
      <main className="admin-page">
        <div className="admin-container">
          <div className="admin-error">
            {error ||
              `Access denied. Your role is "${profile.role}".`}
          </div>

          <button
            className="primary-button"
            onClick={() => {
              window.location.href =
                "/dashboard";
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  // =========================================
  // COUNTS
  // =========================================

  const pendingCount =
    submissions.filter(
      (item) => item.status === "pending"
    ).length;

  const approvedCount =
    submissions.filter(
      (item) => item.status === "approved"
    ).length;

  const rejectedCount =
    submissions.filter(
      (item) => item.status === "rejected"
    ).length;

  // =========================================
  // ADMIN UI
  // =========================================

  return (
    <main className="admin-page">
      <div className="admin-container">

        {/* HEADER */}

        <header className="admin-header">
          <div>
            <p className="admin-eyebrow">
              SANKALPO / ADMIN
            </p>

            <h1>Admin Dashboard</h1>

            <p>
              Review community actions and verify
              environmental impact.
            </p>
          </div>

          <div className="admin-badge">
            ADMIN
          </div>
        </header>

        {/* ERROR */}

        {error && (
          <div className="admin-error">
            {error}
          </div>
        )}

        {/* STATS */}

        <section className="admin-stats">

          <div className="admin-stat-card">
            <span>Pending</span>
            <strong>
              {pendingCount}
            </strong>
          </div>

          <div className="admin-stat-card">
            <span>Approved</span>
            <strong>
              {approvedCount}
            </strong>
          </div>

          <div className="admin-stat-card">
            <span>Rejected</span>
            <strong>
              {rejectedCount}
            </strong>
          </div>

          <div className="admin-stat-card">
            <span>Total</span>
            <strong>
              {submissions.length}
            </strong>
          </div>

        </section>

        {/* SUBMISSIONS */}

        <section className="admin-section">

          <div className="admin-section-heading">
            <div>
              <p className="admin-label">
                COMMUNITY SUBMISSIONS
              </p>

              <h2>
                Review Actions
              </h2>
            </div>
          </div>

          {submissions.length === 0 ? (

            <div className="admin-empty">

              <div className="admin-empty-icon">
                🌱
              </div>

              <h3>
                No submissions yet
              </h3>

              <p>
                When users complete the weekly
                challenge, their submissions will
                appear here.
              </p>

            </div>

          ) : (

            <div className="submission-list">

              {submissions.map(
                (submission) => (
                  <SubmissionCard
                    key={submission.id}
                    submission={submission}
                    actionLoading={
                      actionLoading
                    }
                    onApprove={
                      handleApprove
                    }
                    onReject={
                      handleReject
                    }
                  />
                )
              )}

            </div>

          )}

        </section>

      </div>
    </main>
  );
}


// =========================================
// SUBMISSION CARD
// =========================================

function SubmissionCard({
  submission,
  actionLoading,
  onApprove,
  onReject,
}) {
  const [photoUrl, setPhotoUrl] =
    useState(null);

  const [photoLoading, setPhotoLoading] =
    useState(true);

  // =========================================
  // LOAD PRIVATE PHOTO
  // =========================================

  useEffect(() => {
    async function loadPhoto() {
      if (!submission.photo_url) {
        setPhotoLoading(false);
        return;
      }

      try {
        const {
          data,
          error,
        } = await supabase.storage
          .from("submission-proofs")
          .createSignedUrl(
            submission.photo_url,
            3600
          );

        if (error) {
          console.error(
            "PHOTO URL ERROR:",
            error
          );
        } else {
          setPhotoUrl(
            data?.signedUrl || null
          );
        }
      } catch (err) {
        console.error(
          "PHOTO LOADING ERROR:",
          err
        );
      } finally {
        setPhotoLoading(false);
      }
    }

    loadPhoto();
  }, [submission.photo_url]);

  return (
    <article className="submission-card">

      {/* PHOTO */}

      <div className="submission-photo">

        {photoLoading ? (

          <div className="photo-placeholder">
            Loading photo...
          </div>

        ) : photoUrl ? (

          <img
            src={photoUrl}
            alt="Environmental action proof"
          />

        ) : (

          <div className="photo-placeholder">
            No photo
          </div>

        )}

      </div>

      {/* CONTENT */}

      <div className="submission-content">

        <div className="submission-top">

          <div>

            <p className="submission-user">
              {submission.profiles
                ?.full_name ||
                "Unknown user"}
            </p>

            <h3>
              {submission.challenges
                ?.title ||
                "Weekly Challenge"}
            </h3>

          </div>

          <span
            className={`status-badge status-${submission.status}`}
          >
            {submission.status}
          </span>

        </div>

        {/* DETAILS */}

        <div className="submission-details">

          <div>
            <span>
              🪙 Reward
            </span>

            <strong>
              {submission.challenges
                ?.reward ?? 0}{" "}
              Eco-Coins
            </strong>
          </div>

          <div>
            <span>
              📍 Location
            </span>

            <strong>
              {submission.latitude !== null &&
              submission.longitude !== null
                ? `${Number(
                    submission.latitude
                  ).toFixed(
                    5
                  )}, ${Number(
                    submission.longitude
                  ).toFixed(5)}`
                : "Not provided"}
            </strong>
          </div>

          <div>
            <span>
              📅 Submitted
            </span>

            <strong>
              {submission.created_at
                ? new Date(
                    submission.created_at
                  ).toLocaleString()
                : "Unknown"}
            </strong>
          </div>

        </div>

        {/* DESCRIPTION */}

        {submission.description && (
          <div className="submission-description">

            <span>
              Description
            </span>

            <p>
              {submission.description}
            </p>

          </div>
        )}

        {/* ADMIN NOTE */}

        {submission.admin_note && (
          <div className="admin-note">

            <span>
              Admin Note
            </span>

            <p>
              {submission.admin_note}
            </p>

          </div>
        )}

        {/* ACTION BUTTONS */}

        {submission.status ===
          "pending" && (

          <div className="submission-actions">

            <button
              className="approve-button"
              disabled={
                actionLoading ===
                submission.id
              }
              onClick={() =>
                onApprove(
                  submission.id
                )
              }
            >
              {actionLoading ===
              submission.id
                ? "Updating..."
                : "✓ Approve"}
            </button>

            <button
              className="reject-button"
              disabled={
                actionLoading ===
                submission.id
              }
              onClick={() =>
                onReject(
                  submission.id
                )
              }
            >
              {actionLoading ===
              submission.id
                ? "Updating..."
                : "✕ Reject"}
            </button>

          </div>

        )}

      </div>

    </article>
  );
}