import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  addCommunityComment,
  createCommunityPost,
  createProblem,
  loadCommunityPosts,
  loadProblems,
  loadMessages,
  reportCommunityPost,
  reportProblem,
  sendMessage,
  createConversation,
  toggleCommunityReaction,
} from "../../lib/communityService";
import "./Community.css";

const tabs = ["Feed", "Problems", "Messages"];

export default function Community() {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState("Feed");
  const [posts, setPosts] = useState([]);
  const [problems, setProblems] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedConversation, setSelectedConversation] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [postForm, setPostForm] = useState({
    title: "",
    description: "",
    postType: "action",
    location: "",
  });
  const [problemForm, setProblemForm] = useState({
    title: "",
    description: "",
    problemType: "other",
    location: "",
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        const [postData, problemData] = await Promise.all([
          loadCommunityPosts(),
          loadProblems(),
        ]);
        setPosts(postData);
        setProblems(problemData);
      } catch (err) {
        setError(err.message || "Unable to load community activity.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  useEffect(() => {
    if (!selectedConversation) return;
    loadMessages(selectedConversation)
      .then(setMessages)
      .catch((err) => setError(err.message));
  }, [selectedConversation]);

  async function submitPost(event) {
    event.preventDefault();
    setError("");
    try {
      await createCommunityPost(postForm);
      const freshPosts = await loadCommunityPosts();
      setPosts(freshPosts);
      setPostForm({ title: "", description: "", postType: "action", location: "" });
      setActiveTab("Feed");
    } catch (err) {
      setError(err.message || "Unable to publish your post.");
    }
  }

  async function submitProblem(event) {
    event.preventDefault();
    setError("");
    try {
      await createProblem(problemForm);
      const freshProblems = await loadProblems();
      setProblems(freshProblems);
      setProblemForm({ title: "", description: "", problemType: "other", location: "" });
      setActiveTab("Problems");
    } catch (err) {
      setError(err.message || "Unable to report the problem.");
    }
  }

  async function reactToPost(postId, reactionType) {
    try {
      await toggleCommunityReaction(postId, reactionType);
      setPosts((current) => current.map((post) => (
        post.id === postId
          ? {
              ...post,
              reactions: post.reactions.filter(
                (reaction) => reaction.user_id !== user.id
              ),
            }
          : post
      )));
      const freshPosts = await loadCommunityPosts();
      setPosts(freshPosts);
    } catch (err) {
      setError(err.message || "Unable to react.");
    }
  }

  async function commentOnPost(postId, text) {
    if (!text.trim()) return;
    try {
      await addCommunityComment(postId, text.trim());
      const freshPosts = await loadCommunityPosts();
      setPosts(freshPosts);
    } catch (err) {
      setError(err.message || "Unable to add a comment.");
    }
  }

  async function reportPost(postId) {
    const reasonText = window.prompt("Why are you reporting this post?", "");
    if (!reasonText?.trim()) return;
    try {
      await reportCommunityPost(postId, reasonText.trim());
      setMessage("Report submitted for moderation.");
    } catch (err) {
      setError(err.message || "Unable to submit the report.");
    }
  }

  async function reportProblemItem(problemId) {
    const reasonText = window.prompt("Why are you reporting this problem?", "");
    if (!reasonText?.trim()) return;
    try {
      await reportProblem(problemId, reasonText.trim());
      setMessage("Problem report submitted for moderation.");
    } catch (err) {
      setError(err.message || "Unable to submit the report.");
    }
  }

  async function startConversation(event) {
    event.preventDefault();
    try {
      const conversation = await createConversation(participantId);
      setSelectedConversation(conversation.id);
      setMessages(await loadMessages(conversation.id));
    } catch (err) {
      setError(err.message || "Unable to start the conversation.");
    }
  }

  async function sendDirectMessage(event) {
    event.preventDefault();
    if (!selectedConversation || !message.trim()) return;
    try {
      await sendMessage(selectedConversation, message.trim());
      setMessage("");
      setMessages(await loadMessages(selectedConversation));
    } catch (err) {
      setError(err.message || "Unable to send the message.");
    }
  }

  return (
    <main className="community-page">
      <div className="community-container">
        <header className="community-header">
          <div>
            <p className="community-eyebrow">COMMUNITY ACTIONS</p>
            <h1>Grow change together.</h1>
            <p>Share verified environmental actions, report local problems, and connect with people who are taking meaningful steps.</p>
          </div>
          <span className="community-pill">{profile?.full_name || "Sankalpo member"}</span>
        </header>

        {error && <div className="community-empty">{error}</div>}
        {message && <div className="community-empty">{message}</div>}

        <div className="community-tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`community-tab${activeTab === tab ? " active" : ""}`}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Feed" && (
          <div className="community-grid">
            <section>
              <article className="community-card community-composer">
                <h2>Share an environmental action</h2>
                <p>Posts are reviewed before their impact is shown as verified.</p>
                <form className="community-form-grid" onSubmit={submitPost}>
                  <label>Title<input required value={postForm.title} onChange={(event) => setPostForm({ ...postForm, title: event.target.value })} /></label>
                  <label>Type<select value={postForm.postType} onChange={(event) => setPostForm({ ...postForm, postType: event.target.value })}><option value="action">Action</option><option value="problem">Problem</option><option value="success">Success</option><option value="achievement">Achievement</option></select></label>
                  <label className="community-form-wide">Description<textarea required rows="3" value={postForm.description} onChange={(event) => setPostForm({ ...postForm, description: event.target.value })} /></label>
                  <label>Location<input value={postForm.location} onChange={(event) => setPostForm({ ...postForm, location: event.target.value })} /></label>
                  <div className="community-form-actions"><button className="community-primary-button" type="submit">Publish post</button></div>
                </form>
              </article>

              {loading ? <div className="community-empty">Loading community activity...</div> : posts.length === 0 ? (
                <div className="community-empty">No posts yet. Be the first to share an action.</div>
              ) : (
                <div className="community-feed-list">
                  {posts.map((post) => (
                    <article className="community-post" key={post.id}>
                      <div className="community-post-header">
                        <div className="community-author">
                          <span className="community-avatar">{post.author?.full_name?.slice(0, 1) || "S"}</span>
                          <div><strong>{post.author?.full_name || "Sankalpo member"}</strong><span>{new Date(post.created_at).toLocaleDateString()}</span></div>
                        </div>
                        <span className={`community-status ${post.verification_status}`}>{post.verification_status}</span>
                      </div>
                      <h3>{post.title}</h3>
                      <p>{post.description || "Shared with the Sankalpo community."}</p>
                      {post.location && <div className="community-post-meta"><span>Location: {post.location}</span></div>}
                      <div className="community-post-actions">
                        <button className="community-action-button" type="button" onClick={() => reactToPost(post.id, "support")}>Support ({post.reactions?.filter((reaction) => reaction.reaction_type === "support").length || 0})</button>
                        <button className="community-action-button" type="button" onClick={() => reactToPost(post.id, "inspired")}>Inspired ({post.reactions?.filter((reaction) => reaction.reaction_type === "inspired").length || 0})</button>
                        <button className="community-action-button" type="button" onClick={() => reportPost(post.id)}>Report</button>
                      </div>
                      <div className="community-comments">
                        {post.comments?.slice(0, 3).map((comment) => (
                          <div className="community-comment" key={comment.id}><strong>{comment.author?.full_name || "Member"}</strong><p>{comment.text}</p></div>
                        ))}
                        <form onSubmit={(event) => { event.preventDefault(); commentOnPost(post.id, event.currentTarget.elements.comment.value); event.currentTarget.reset(); }}>
                          <input name="comment" aria-label="Add a comment" placeholder="Add a thoughtful comment..." />
                          <button className="community-secondary-button" type="submit">Comment</button>
                        </form>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <aside className="community-sidebar">
              <section className="community-panel"><h2>How verification works</h2><p>Community posts remain visible as community activity. Only verified posts are included in verified impact metrics.</p><button className="community-secondary-button" type="button" onClick={() => setActiveTab("Problems")}>Review reported problems</button></section>
              <section className="community-panel"><h2>Community guidance</h2><p>Keep posts factual, include proof where possible, and report content that may be misleading or harmful.</p></section>
            </aside>
          </div>
        )}

        {activeTab === "Problems" && (
          <div className="community-grid">
            <section className="community-card">
              <h2>Report an environmental problem</h2>
              <p>Reports create an action loop for the community and local administrators.</p>
              <form className="community-form-grid" onSubmit={submitProblem}>
                <label>Title<input required value={problemForm.title} onChange={(event) => setProblemForm({ ...problemForm, title: event.target.value })} /></label>
                <label>Problem type<select value={problemForm.problemType} onChange={(event) => setProblemForm({ ...problemForm, problemType: event.target.value })}><option value="litter">Litter</option><option value="water">Water</option><option value="waste">Waste</option><option value="recycling">Recycling</option><option value="other">Other</option></select></label>
                <label className="community-form-wide">What is happening?<textarea required rows="4" value={problemForm.description} onChange={(event) => setProblemForm({ ...problemForm, description: event.target.value })} /></label>
                <label>Location<input value={problemForm.location} onChange={(event) => setProblemForm({ ...problemForm, location: event.target.value })} /></label>
                <div className="community-form-actions"><button className="community-primary-button" type="submit">Create report</button></div>
              </form>
            </section>
            <section className="community-panel">
              <h2>Reported problems</h2>
              <p>Reports are visible to the community and can be reviewed by admins.</p>
              <div className="problem-list">
                {problems.map((problem) => (
                  <div className="problem-row" key={problem.id}><strong>{problem.title}</strong><p>{problem.description}</p><button className="community-danger-button" type="button" onClick={() => reportProblemItem(problem.id)}>Report this report</button></div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "Messages" && (
          <div className="community-grid">
            <section className="community-panel">
              <h2>Direct messages</h2>
              <p>Choose a conversation or start a private message with another member.</p>
              <div className="message-list">
                {messages.map((item) => (
                  <div className="message-row" key={item.id}><strong>{item.sender?.full_name || "Member"}</strong><p>{item.content}</p></div>
                ))}
              </div>
              <form className="community-message-form" onSubmit={sendDirectMessage}>
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a message..." />
                <button className="community-primary-button" type="submit">Send message</button>
              </form>
            </section>
            <aside className="community-panel"><h2>Start a conversation</h2><p>Choose another member by their user ID to create a private thread.</p><form className="community-message-form" onSubmit={startConversation}><input value={participantId} onChange={(event) => setParticipantId(event.target.value)} placeholder="Participant user ID" required /><button className="community-secondary-button" type="submit">Start conversation</button></form></aside>
          </div>
        )}
      </div>
    </main>
  );
}
