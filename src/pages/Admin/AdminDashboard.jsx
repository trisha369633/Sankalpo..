import { useEffect, useState } from "react";
import { X } from "lucide-react";
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

function normalizeChallengeTitle(title) {
  return (title || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export default function AdminDashboard() {
  const { user, profile, loading: authLoading } = useAuth();

  const [submissions, setSubmissions] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState("");
  const [activeTab, setActiveTab] = useState("create");
  const [deleteLoadingId, setDeleteLoadingId] = useState("");
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
  const [notice, setNotice] = useState("");

  function resetChallengeDraft() {
    setSelectedChallengeId("");
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
  }

  useEffect(() => {
    if (authLoading) return;

    if (!user || profile?.role !== "admin") {
      setLoading(false);
      return;
    }

    async function loadAdminData() {
      setLoading(true);
      setError("");

      try {
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
  }, [user, profile, authLoading]);

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
    setNotice("");

    if (!challengeDraft.title.trim() || !challengeDraft.description.trim()) {
      setError("Title and description are required.");
      return;
    }

    const titleKey = normalizeChallengeTitle(challengeDraft.title);
    const existingChallenge = challenges.find((challenge) => challenge.id === selectedChallengeId);
    const duplicate = challenges.find((challenge) => (
      challenge.id !== selectedChallengeId &&
      normalizeChallengeTitle(challenge.title) === titleKey
    ));
    if (duplicate && normalizeChallengeTitle(existingChallenge?.title) !== titleKey) {
      setError(`A challenge named "${duplicate.title}" already exists. Edit that challenge instead.`);
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
      setNotice(selectedChallengeId ? "Challenge updated." : "Challenge created.");
      setError("");
    } catch (err) {
      setError(err.message || "Unable to save the challenge.");
    }
  }

  async function deleteChallenge(challenge) {
    if (!window.confirm(`Delete "${challenge.title}"? This cannot be undone.`)) return;

    setDeleteLoadingId(challenge.id);
    setError("");
    setNotice("");
    try {
      const { data: linkedSubmissions, error: submissionsError } = await supabase
        .from("submissions")
        .select("id")
        .eq("challenge_id", challenge.id)
        .limit(1);
      if (submissionsError) throw submissionsError;
      if (linkedSubmissions?.length) {
        throw new Error("This challenge has submissions and cannot be deleted without removing their history.");
      }

      const { error: deleteError } = await supabase
        .from("challenges")
        .delete()
        .eq("id", challenge.id);
      if (deleteError) throw deleteError;

      setChallenges((current) => current.filter((item) => item.id !== challenge.id));
      if (selectedChallengeId === challenge.id) resetChallengeDraft();
      setNotice(`Deleted "${challenge.title}".`);
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete this challenge.");
    } finally {
      setDeleteLoadingId("");
    }
  }

  function editChallenge(challengeId) {
    selectChallenge(challengeId);
    setNotice("");
    setError("");
    setActiveTab("create");
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

  if (profile?.role !== "admin") {
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
  const challengeTitleCounts = challenges.reduce((counts, challenge) => {
    const title = normalizeChallengeTitle(challenge.title);
    if (title) counts[title] = (counts[title] || 0) + 1;
    return counts;
  }, {});
  const publishedChallenges = challenges.filter(
    (challenge) => challenge.status === "published"
  );

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

            <p>Create weekly challenges and review member submissions.</p>
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
        {notice && <div className="admin-notice" role="status">{notice}</div>}
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

        <nav className="admin-tabs" role="tablist" aria-label="Challenge management">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "create"}
            className={activeTab === "create" ? "active" : ""}
            onClick={() => setActiveTab("create")}
          >
            Create Challenge
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "published"}
            className={activeTab === "published" ? "active" : ""}
            onClick={() => setActiveTab("published")}
          >
            Published Challenge
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "review"}
            className={activeTab === "review" ? "active" : ""}
            onClick={() => setActiveTab("review")}
          >
            Review Submissions
          </button>
        </nav>

        {/* CHALLENGE EDITOR */}

        {activeTab === "create" && (
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
                {selectedChallengeId ? "Update challenge" : "Create challenge"}
              </button>
              {selectedChallengeId && (
                <button type="button" className="cancel-challenge-button" onClick={resetChallengeDraft}>
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>
        )}

        {activeTab === "published" && (
          <section className="admin-section published-challenges-section">
            <div className="admin-section-heading">
              <div>
                <p className="admin-label">CHALLENGE MANAGEMENT</p>
                <h2>Published challenges</h2>
              </div>
              <span className="published-count">{publishedChallenges.length} published</span>
            </div>

            {publishedChallenges.length === 0 ? (
              <div className="admin-empty">
                <h3>No published challenges</h3>
                <p>Create a challenge and set its status to Published.</p>
              </div>
            ) : (
              <div className="published-challenge-list">
                {publishedChallenges.map((challenge) => {
                  const duplicate = challengeTitleCounts[normalizeChallengeTitle(challenge.title)] > 1;
                  return (
                    <article className="published-challenge-card" key={challenge.id}>
                      <div className="published-challenge-content">
                        <div className="published-challenge-heading">
                          <h3>{challenge.title || "Untitled challenge"}</h3>
                          {duplicate && <span className="duplicate-challenge-badge">Duplicate title</span>}
                        </div>
                        <p>{challenge.description}</p>
                        <div className="published-challenge-meta">
                          <span>+{challenge.reward ?? 0} Eco-Coins</span>
                          <span>{challenge.start_date || "No start date"}</span>
                          <span>{challenge.end_date || "No end date"}</span>
                        </div>
                      </div>
                      <div className="published-challenge-actions">
                        <button type="button" onClick={() => editChallenge(challenge.id)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="delete-challenge-button"
                          disabled={deleteLoadingId === challenge.id}
                          onClick={() => deleteChallenge(challenge)}
                        >
                          {deleteLoadingId === challenge.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* SUBMISSIONS */}

        {activeTab === "review" && (
        <section className="admin-section">
          <div className="admin-section-heading">
            <div>
              <p className="admin-label">WEEKLY CHALLENGE SUBMISSIONS</p>
              <h2>Review submissions</h2>
            </div>
          </div>
          {submissions.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty-icon">
                <LeafIcon size={36} strokeWidth={1.6} />
              </div>
              <h3>No submissions yet</h3>
              <p>Weekly challenge submissions will appear here for review.</p>
            </div>
          ) : (
            <div className="submission-list">
              {submissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  actionLoading={actionLoading}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </div>
          )}
        </section>
        )}
      </div>
    </main>
  );
}

function SubmissionCard({ submission, actionLoading, onApprove, onReject }) {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(true);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);

  useEffect(() => {
    if (!isPhotoOpen) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") setIsPhotoOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isPhotoOpen]);

  useEffect(() => {
    async function loadPhoto() {
      if (!submission.photo_url) {
        setPhotoLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.storage
          .from("submission-proofs")
          .createSignedUrl(submission.photo_url, 3600);
        if (error) throw error;
        setPhotoUrl(data?.signedUrl || null);
      } catch (error) {
        console.error("PHOTO LOADING ERROR:", error);
      } finally {
        setPhotoLoading(false);
      }
    }

    loadPhoto();
  }, [submission.photo_url]);

  return (
    <article className="submission-card">
      <div className="submission-photo">
        {photoLoading ? (
          <div className="photo-placeholder">Loading photo...</div>
        ) : photoUrl ? (
          <button
            className="submission-photo-trigger"
            type="button"
            onClick={() => setIsPhotoOpen(true)}
            aria-label="View proof image full size"
          >
            <img src={photoUrl} alt="Environmental action proof" />
          </button>
        ) : (
          <div className="photo-placeholder">No photo</div>
        )}
      </div>

      {isPhotoOpen && photoUrl && (
        <div
          className="admin-proof-lightbox-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsPhotoOpen(false);
          }}
        >
          <div className="admin-proof-lightbox" role="dialog" aria-modal="true" aria-label="Full-size submission proof">
            <button
              className="admin-proof-lightbox-close"
              type="button"
              onClick={() => setIsPhotoOpen(false)}
              aria-label="Close proof image"
            >
              <X size={22} />
            </button>
            <img src={photoUrl} alt="Environmental action proof, full size" />
          </div>
        </div>
      )}

      <div className="submission-content">
        <div className="submission-top">
          <div>
            <p className="submission-user">
              {submission.profiles?.full_name || "Unknown user"}
            </p>
            <h3>{submission.challenges?.title || "Weekly Challenge"}</h3>
          </div>
          <span className={`status-badge status-${submission.status}`}>
            {submission.status}
          </span>
        </div>

        <div className="submission-details">
          <div>
            <span><CoinIcon size={17} strokeWidth={1.8} /> Reward</span>
            <strong>{submission.challenges?.reward ?? 0} Eco-Coins</strong>
          </div>
          <div>
            <span><LocationIcon size={17} strokeWidth={1.8} /> Location</span>
            <strong>
              {submission.latitude != null && submission.longitude != null
                ? `${Number(submission.latitude).toFixed(5)}, ${Number(submission.longitude).toFixed(5)}`
                : "Not provided"}
            </strong>
          </div>
          <div>
            <span><CalendarIcon size={17} strokeWidth={1.8} /> Submitted</span>
            <strong>{submission.created_at ? new Date(submission.created_at).toLocaleString() : "Unknown"}</strong>
          </div>
        </div>

        {submission.description && (
          <div className="submission-description">
            <span>Description</span>
            <p>{submission.description}</p>
          </div>
        )}

        {submission.admin_note && (
          <div className="admin-note">
            <span>Admin Note</span>
            <p>{submission.admin_note}</p>
          </div>
        )}

        {submission.status === "pending" && (
          <div className="submission-actions">
            <button
              className="approve-button"
              type="button"
              disabled={actionLoading === submission.id}
              onClick={() => onApprove(submission.id)}
            >
              {actionLoading === submission.id ? "Updating..." : <><SuccessIcon size={17} strokeWidth={2} /> Approve</>}
            </button>
            <button
              className="reject-button"
              type="button"
              disabled={actionLoading === submission.id}
              onClick={() => onReject(submission.id)}
            >
              {actionLoading === submission.id ? "Updating..." : <><RejectedIcon size={17} strokeWidth={2} /> Reject</>}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}