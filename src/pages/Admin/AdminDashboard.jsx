import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import {
  CalendarIcon,
  CoinIcon,
  LeafIcon,
  LocationIcon,
  RejectedIcon,
  SuccessIcon,
} from "../../components/SankalpoIcons";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

import "./AdminDashboard.css";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState("");
  const [challengeDraft, setChallengeDraft] = useState({
    title: "",
    description: "",
    reward: 0,
    start_date: "",
    end_date: "",
    instructions: "",
    proof_requirements: "",
    important_notes: "",
    status: "published",
  });

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
              reward,
              instructions,
              proof_requirements,
              important_notes
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

        const { data: challengeData, error: challengeError } = await supabase
          .from("challenges")
          .select("*")
          .order("start_date", { ascending: false });

        if (challengeError) {
          throw challengeError;
        }

        setChallenges(challengeData || []);
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

  function selectChallenge(challengeId) {
    setSelectedChallengeId(challengeId);

    if (!challengeId) {
      setChallengeDraft({
        title: "",
        description: "",
        reward: 0,
        start_date: "",
        end_date: "",
        instructions: "",
        proof_requirements: "",
        important_notes: "",
        status: "published",
      });
      return;
    }

    const challenge = challenges.find((item) => item.id === challengeId);
    if (!challenge) return;

    setChallengeDraft({
      title: challenge.title || "",
      description: challenge.description || "",
      reward: challenge.reward ?? 0,
      start_date: challenge.start_date || "",
      end_date: challenge.end_date || "",
      instructions: challenge.instructions || "",
      proof_requirements: challenge.proof_requirements || "",
      important_notes: challenge.important_notes || "",
      status: challenge.status || "published",
    });
  }

  function updateChallengeDraft(field, value) {
    setChallengeDraft((current) => ({ ...current, [field]: value }));
  }

  async function saveChallenge(event) {
    event.preventDefault();
    setError("");

    if (!challengeDraft.title.trim() || !challengeDraft.description.trim()) {
      setError("Title and description are required.");
      return;
    }

    const payload = {
      title: challengeDraft.title.trim(),
      description: challengeDraft.description.trim(),
      reward: Number(challengeDraft.reward) || 0,
      start_date: challengeDraft.start_date,
      end_date: challengeDraft.end_date,
      instructions: challengeDraft.instructions.trim(),
      proof_requirements: challengeDraft.proof_requirements.trim(),
      important_notes: challengeDraft.important_notes.trim(),
      status: challengeDraft.status,
    };

    try {
      const result = selectedChallengeId
        ? await supabase
            .from("challenges")
            .update(payload)
            .eq("id", selectedChallengeId)
        : await supabase
            .from("challenges")
            .insert(payload)
            .select()
            .single();

      if (result.error) {
        throw result.error;
      }

      setChallenges((current) => {
        if (selectedChallengeId) {
          return current.map((challenge) =>
            challenge.id === selectedChallengeId
              ? { ...challenge, ...payload }
              : challenge
          );
        }
        return [
          { id: result.data?.id || "new", ...payload },
          ...current,
        ];
      });

      if (!selectedChallengeId && result.data?.id) {
        setSelectedChallengeId(result.data.id);
      }
      setError("");
    } catch (err) {
      setError(err.message || "Unable to save the challenge.");
    }
  }

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

        {/* CHALLENGE EDITOR */}

        <section className="admin-section challenge-editor-section">
          <div className="admin-section-heading">
            <div>
              <p className="admin-label">CHALLENGE CONTENT</p>
              <h2>Create or edit challenge guidance</h2>
            </div>
          </div>

          <form className="challenge-editor" onSubmit={saveChallenge}>
            <label>
              Challenge
              <select
                value={selectedChallengeId}
                onChange={(event) => selectChallenge(event.target.value)}
              >
                <option value="">New challenge</option>
                {challenges.map((challenge) => (
                  <option key={challenge.id} value={challenge.id}>
                    {challenge.title || "Untitled challenge"}
                  </option>
                ))}
              </select>
            </label>

            <div className="challenge-editor-grid">
              <label>
                Title
                <input
                  value={challengeDraft.title}
                  onChange={(event) => updateChallengeDraft("title", event.target.value)}
                  placeholder="Challenge title"
                  required
                />
              </label>
              <label>
                Reward
                <input
                  type="number"
                  min="0"
                  value={challengeDraft.reward}
                  onChange={(event) => updateChallengeDraft("reward", event.target.value)}
                />
              </label>
              <label>
                Start date
                <input
                  type="datetime-local"
                  value={challengeDraft.start_date}
                  onChange={(event) => updateChallengeDraft("start_date", event.target.value)}
                />
              </label>
              <label>
                End date
                <input
                  type="datetime-local"
                  value={challengeDraft.end_date}
                  onChange={(event) => updateChallengeDraft("end_date", event.target.value)}
                />
              </label>
            </div>

            <label>
              Description
              <textarea
                value={challengeDraft.description}
                onChange={(event) => updateChallengeDraft("description", event.target.value)}
                rows="3"
                required
              />
            </label>

            <label>
              Instructions
              <textarea
                value={challengeDraft.instructions}
                onChange={(event) => updateChallengeDraft("instructions", event.target.value)}
                rows="4"
                placeholder="Exactly what the user should do."
              />
            </label>

            <div className="challenge-editor-grid">
              <label>
                Proof requirements
                <textarea
                  value={challengeDraft.proof_requirements}
                  onChange={(event) => updateChallengeDraft("proof_requirements", event.target.value)}
                  rows="4"
                  placeholder="What should be visible in the proof photo?"
                />
              </label>
              <label>
                Important notes
                <textarea
                  value={challengeDraft.important_notes}
                  onChange={(event) => updateChallengeDraft("important_notes", event.target.value)}
                  rows="4"
                  placeholder="Avoid rejection reasons and important exceptions."
                />
              </label>
            </div>

            <div className="challenge-editor-actions">
              <label>
                Status
                <select
                  value={challengeDraft.status}
                  onChange={(event) => updateChallengeDraft("status", event.target.value)}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
              <button type="submit" className="save-challenge-button">
                Save challenge
              </button>
            </div>
          </form>
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
                <LeafIcon size={36} strokeWidth={1.6} />
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
              <CoinIcon size={17} strokeWidth={1.8} />
              Reward
            </span>

            <strong>
              {submission.challenges
                ?.reward ?? 0}{" "}
              Eco-Coins
            </strong>
          </div>

          <div>
            <span>
              <LocationIcon size={17} strokeWidth={1.8} />
              Location
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
              <CalendarIcon size={17} strokeWidth={1.8} />
              Submitted
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
                : <>
                    <SuccessIcon size={17} strokeWidth={2} />
                    Approve
                  </>}
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
                : <>
                    <RejectedIcon size={17} strokeWidth={2} />
                    Reject
                  </>}
            </button>

          </div>

        )}

      </div>

    </article>
  );
}