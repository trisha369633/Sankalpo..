import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import "./Challenge.css";

export default function Challenge() {
  const { id } = useParams();
  const { user } = useAuth();

  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);

  const [photo, setPhoto] = useState(null);
  const [description, setDescription] = useState("");

  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadChallenge() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Challenge loading error:", error);
        setError(error.message);
      } else {
        setChallenge(data);
      }

      setLoading(false);
    }

    loadChallenge();
  }, [id]);

  // ================================
  // GET CURRENT LOCATION
  // ================================

  function getLocation() {
    setLocationLoading(true);
    setError("");
    setMessage("");

    if (!navigator.geolocation) {
      setError(
        "Your browser does not support location access."
      );
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        setLocationLoading(false);
        setMessage("Location captured successfully.");
      },
      (locationError) => {
        console.error(
          "Location error:",
          locationError
        );

        setLocationLoading(false);

        setError(
          "Location access was denied. Please allow location permission and try again."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  // ================================
  // SELECT PHOTO
  // ================================

  function handlePhotoChange(event) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setError("");
    setMessage("");

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("Image size must be less than 10MB.");
      return;
    }

    setPhoto(selectedFile);
  }

  // ================================
  // SUBMIT PROOF
  // ================================

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    // Check login
    if (!user) {
      setError(
        "Please login before submitting your challenge."
      );
      return;
    }

    // Check photo
    if (!photo) {
      setError("Please upload a proof photo.");
      return;
    }

    // Check location
    if (!location) {
      setError(
        "Please capture your current location."
      );
      return;
    }

    // Check description
    if (!description.trim()) {
      setError(
        "Please describe what you did."
      );
      return;
    }

    if (!challenge) {
      setError(
        "Challenge information is missing."
      );
      return;
    }

    setSubmitting(true);

    let filePath = null;

    try {
      console.log("========== SUBMISSION START ==========");
      console.log("User ID:", user.id);
      console.log("Challenge ID:", challenge.id);
      console.log("Photo:", photo.name);
      console.log("Location:", location);
      console.log("Description:", description);

      // ================================
      // 1. CREATE FILE PATH
      // ================================

      const fileExtension =
        photo.name.split(".").pop()?.toLowerCase() || "jpg";

      const uniqueId =
        typeof crypto !== "undefined" &&
        crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()
              .toString(36)
              .substring(2)}`;

      const fileName = `${Date.now()}-${uniqueId}.${fileExtension}`;

      filePath = `${user.id}/${fileName}`;

      console.log("Storage file path:", filePath);

      // ================================
      // 2. UPLOAD PHOTO TO STORAGE
      // ================================

      console.log("Uploading photo...");

      const {
        data: uploadData,
        error: uploadError,
      } = await supabase.storage
        .from("submission-proofs")
        .upload(filePath, photo, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error(
          "PHOTO UPLOAD ERROR:",
          uploadError
        );

        throw new Error(
          `Photo upload failed: ${
            uploadError.message ||
            "Unknown storage error"
          }`
        );
      }

      console.log(
        "Photo uploaded successfully:",
        uploadData
      );

      // ================================
      // 3. INSERT SUBMISSION INTO DATABASE
      // ================================

      console.log(
        "Saving submission to database..."
      );

      const submissionData = {
        user_id: user.id,
        challenge_id: challenge.id,
        photo_url: filePath,
        latitude: location.latitude,
        longitude: location.longitude,
        description: description.trim(),
        status: "pending",
      };

      console.log(
        "Submission data:",
        submissionData
      );

      const {
        data: insertedSubmission,
        error: submissionError,
      } = await supabase
        .from("submissions")
        .insert(submissionData)
        .select()
        .single();

      if (submissionError) {
        console.error(
          "========== DATABASE SUBMISSION ERROR =========="
        );

        console.error(
          "Code:",
          submissionError.code
        );

        console.error(
          "Message:",
          submissionError.message
        );

        console.error(
          "Details:",
          submissionError.details
        );

        console.error(
          "Hint:",
          submissionError.hint
        );

        // Try to remove uploaded file
        if (filePath) {
          const {
            error: removeError,
          } = await supabase.storage
            .from("submission-proofs")
            .remove([filePath]);

          if (removeError) {
            console.error(
              "Uploaded file cleanup error:",
              removeError
            );
          }
        }

        throw new Error(
          submissionError.message ||
            "Database submission failed."
        );
      }

      console.log(
        "Submission created:",
        insertedSubmission
      );

      console.log(
        "========== SUBMISSION SUCCESS =========="
      );

      // ================================
      // 4. RESET FORM
      // ================================

      setPhoto(null);
      setDescription("");
      setLocation(null);
      setShowForm(false);

      setMessage(
        "Your proof has been submitted successfully! It is now waiting for admin review."
      );
    } catch (submitError) {
      console.error(
        "========== SUBMISSION FAILED =========="
      );

      console.error(
        "Error:",
        submitError
      );

      console.error(
        "Error message:",
        submitError.message
      );

      setError(
        submitError.message ||
          "Something went wrong while submitting your proof."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ================================
  // LOADING
  // ================================

  if (loading) {
    return (
      <main className="challenge-page">
        <div className="challenge-container">
          <div className="challenge-loading">
            Loading challenge...
          </div>
        </div>
      </main>
    );
  }

  // ================================
  // CHALLENGE NOT FOUND
  // ================================

  if (!challenge) {
    return (
      <main className="challenge-page">
        <div className="challenge-container">
          <div className="challenge-not-found">
            <span>🌿</span>

            <h1>Challenge not found</h1>

            <p>
              We could not find this weekly challenge.
            </p>

            <Link
              to="/dashboard"
              className="challenge-back-button"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ================================
  // MAIN PAGE
  // ================================

  return (
    <main className="challenge-page">
      <div className="challenge-container">

        {/* Back */}
        <Link
          to="/dashboard"
          className="challenge-back-link"
        >
          ← Back to Dashboard
        </Link>

        {/* Challenge Hero */}
        <section className="challenge-hero">

          <div className="challenge-hero-icon">
            🌱
          </div>

          <div className="challenge-hero-content">

            <p className="challenge-label">
              THIS WEEK'S COMMUNITY CHALLENGE
            </p>

            <h1>
              {challenge.title}
            </h1>

            <p className="challenge-description">
              {challenge.description}
            </p>

            <div className="challenge-details">

              <div className="challenge-detail">
                <span>🪙</span>

                <div>
                  <small>REWARD</small>

                  <strong>
                    {challenge.reward} Eco-Coins
                  </strong>
                </div>
              </div>

              <div className="challenge-detail">
                <span>📅</span>

                <div>
                  <small>DEADLINE</small>

                  <strong>
                    {challenge.end_date}
                  </strong>
                </div>
              </div>

            </div>

          </div>

        </section>

        {/* Success message */}
        {message && (
          <div className="challenge-success">
            <span>✓</span>

            <p>
              {message}
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="challenge-error">
            <span>!</span>

            <p>
              {error}
            </p>
          </div>
        )}

        {/* Start section */}
        {!showForm && !message && (
          <section className="submission-intro">

            <div>
              <p className="section-label">
                READY TO MAKE AN IMPACT?
              </p>

              <h2>
                Complete the challenge
              </h2>

              <p>
                Take a photo of your completed
                environmental action, share your
                current location, and tell us what
                you did. Your submission will be
                reviewed by the Sankalpo team.
              </p>
            </div>

            <button
              type="button"
              className="start-challenge-button"
              onClick={() => {
                setShowForm(true);
                setError("");
                setMessage("");
              }}
            >
              Start Challenge →
            </button>

          </section>
        )}

        {/* Submission form */}
        {showForm && (
          <section className="submission-section">

            <div className="submission-header">

              <div>
                <p className="section-label">
                  PROOF OF ACTION
                </p>

                <h2>
                  Submit your contribution
                </h2>
              </div>

              <span className="pending-badge">
                ADMIN REVIEW
              </span>

            </div>

            <form
              className="submission-form"
              onSubmit={handleSubmit}
            >

              {/* STEP 1 */}
              <div className="form-step">

                <div className="step-number">
                  1
                </div>

                <div className="step-content">

                  <h3>
                    Upload proof photo
                  </h3>

                  <p>
                    Take a clear photo showing your
                    completed environmental action.
                  </p>

                  <label className="upload-box">

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                    />

                    {photo ? (
                      <div className="selected-file">

                        <span>📷</span>

                        <div>
                          <strong>
                            {photo.name}
                          </strong>

                          <small>
                            {(
                              photo.size /
                              1024 /
                              1024
                            ).toFixed(2)}{" "}
                            MB
                          </small>
                        </div>

                      </div>
                    ) : (
                      <div className="upload-placeholder">

                        <span>📸</span>

                        <strong>
                          Choose a photo
                        </strong>

                        <small>
                          JPG, PNG or other image
                          • Max 10MB
                        </small>

                      </div>
                    )}

                  </label>

                </div>

              </div>

              {/* STEP 2 */}
              <div className="form-step">

                <div className="step-number">
                  2
                </div>

                <div className="step-content">

                  <h3>
                    Verify your location
                  </h3>

                  <p>
                    Your current GPS location helps
                    us verify that the action happened
                    where you submitted it.
                  </p>

                  <button
                    type="button"
                    className={`location-button ${
                      location
                        ? "location-success"
                        : ""
                    }`}
                    onClick={getLocation}
                    disabled={locationLoading}
                  >
                    {locationLoading
                      ? "Getting your location..."
                      : location
                      ? "✓ Location captured"
                      : "📍 Capture my location"}
                  </button>

                  {location && (
                    <div className="location-info">

                      <span>📍</span>

                      <div>

                        <strong>
                          Location captured
                        </strong>

                        <small>
                          {location.latitude.toFixed(6)},{" "}
                          {location.longitude.toFixed(6)}
                        </small>

                      </div>

                    </div>
                  )}

                </div>

              </div>

              {/* STEP 3 */}
              <div className="form-step">

                <div className="step-number">
                  3
                </div>

                <div className="step-content">

                  <h3>
                    Tell us what you did
                  </h3>

                  <p>
                    Briefly describe your
                    environmental action.
                  </p>

                  <textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    placeholder="Example: I planted a mango tree in our community garden..."
                    rows="5"
                    maxLength="500"
                  />

                  <div className="character-count">
                    {description.length}/500
                  </div>

                </div>

              </div>

              {/* BUTTONS */}
              <div className="submission-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setShowForm(false);
                    setError("");
                    setMessage("");
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-proof-button"
                  disabled={submitting}
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit Proof →"}
                </button>

              </div>

            </form>

          </section>
        )}

        {/* Verification note */}
        <section className="verification-note">

          <span>🛡️</span>

          <div>

            <strong>
              Why do we need this?
            </strong>

            <p>
              Sankalpo uses your photo and current
              location to help keep Eco-Coins fair
              for everyone. Every submission is
              reviewed before rewards are given.
            </p>

          </div>

        </section>

      </div>
    </main>
  );
}