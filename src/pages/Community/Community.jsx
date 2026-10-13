import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ImagePlus,
  Leaf,
  LoaderCircle,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  addCommunityComment,
  createCommunityPost,
  deleteCommunityPost,
  loadCommunityPosts,
  normalizeCommunityImageUrl,
  toggleCommunityReaction,
  updateCommunityPost,
  uploadCommunityImage,
} from "../../lib/communityService";
import "./Community.css";

const tabs = ["Create Post", "Feed"];
const postTypes = [
  { value: "action", label: "Eco action" },
  { value: "problem", label: "Environmental problem" },
  { value: "success", label: "Success story" },
  { value: "achievement", label: "Achievement" },
];

function formatDate(value) {
  if (!value) return "Recently";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function initials(name) {
  return (name || "S").slice(0, 1).toUpperCase();
}

function Avatar({ item, size = 42 }) {
  const name = item?.full_name || item?.author?.full_name || "Sankalpo member";
  const avatar = item?.avatar_url || item?.author?.avatar_url;
  if (avatar) {
    return <img className="community-avatar-image" src={avatar} alt={`${name}'s profile`} width={size} height={size} />;
  }
  return <span className="community-avatar-fallback" style={{ width: size, height: size }}>{initials(name)}</span>;
}

function LoadingState({ label = "Loading…" }) {
  return (
    <div className="community-loading" role="status">
      <LoaderCircle className="spin" size={22} />
      <span>{label}</span>
    </div>
  );
}

export default function Community() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("Feed");
  const [posts, setPosts] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postLocation, setPostLocation] = useState("");
  const [postType, setPostType] = useState("action");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [commentText, setCommentText] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [selectedPostImage, setSelectedPostImage] = useState(null);
  const fileInputRef = useRef(null);

  const currentProfile = profile || {
    id: user?.id,
    full_name: user?.user_metadata?.full_name || "Sankalpo member",
    avatar_url: user?.user_metadata?.avatar_url,
  };

  async function loadFeed() {
    setLoadingPosts(true);
    try {
      const data = await loadCommunityPosts();
      setPosts(data);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load community posts.");
    } finally {
      setLoadingPosts(false);
    }
  }

  useEffect(() => {
    if (!user) {
      setLoadingPosts(false);
      return;
    }
    loadFeed();
  }, [user]);

  useEffect(() => {
    return () => previewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [previewUrls]);

  function clearImages() {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function addImages(files) {
    const incoming = Array.from(files || []);
    if (!incoming.length) return;
    if (incoming.length + selectedFiles.length > 3) {
      setError("You can attach up to three images at a time.");
      return;
    }
    const oversized = incoming.find((file) => file.size > 8 * 1024 * 1024);
    if (oversized) {
      setError(`${oversized.name} is larger than 8 MB.`);
      return;
    }
    if (incoming.some((file) => !file.type.startsWith("image/"))) {
      setError("Only image files are supported.");
      return;
    }
    setSelectedFiles((current) => [...current, ...incoming]);
    setPreviewUrls((current) => [...current, ...incoming.map((file) => URL.createObjectURL(file))]);
  }

  async function uploadImages() {
    if (!selectedFiles.length) return [];
    setUploading(true);
    try {
      const urls = [];
      for (const file of selectedFiles) {
        urls.push(await uploadCommunityImage(file, user.id));
      }
      return urls;
    } finally {
      setUploading(false);
    }
  }

  async function submitPost(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!postContent.trim()) {
      setError("Write something before publishing your post.");
      return;
    }

    setSaving(true);
    try {
      const imageUrls = await uploadImages();
      await createCommunityPost({
        content: postContent.trim(),
        postType,
        location: postLocation.trim(),
        imageUrl: imageUrls[0] || null,
      });
      setPostContent("");
      setPostLocation("");
      setPostType("action");
      clearImages();
      setNotice("Your post was submitted for admin review.");
      await loadFeed();
      setActiveTab("Feed");
    } catch (err) {
      setError(err.message || "Unable to publish your post.");
    } finally {
      setSaving(false);
    }
  }

  async function reactToPost(postId) {
    if (!user) return;
    try {
      await toggleCommunityReaction(postId);
      await loadFeed();
    } catch (err) {
      setError(err.message || "Unable to react to this post.");
    }
  }

  async function commentOnPost(postId, text) {
    if (!text.trim()) return;
    try {
      await addCommunityComment(postId, text);
      await loadFeed();
      setCommentText((current) => ({ ...current, [postId]: "" }));
    } catch (err) {
      setError(err.message || "Unable to add your comment.");
    }
  }

  async function savePostEdit(post) {
    if (!editingText.trim()) return;
    try {
      await updateCommunityPost(post.id, { content: editingText.trim() });
      setEditingPost(null);
      setEditingText("");
      await loadFeed();
    } catch (err) {
      setError(err.message || "Unable to update this post.");
    }
  }

  async function removePost(post) {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    try {
      await deleteCommunityPost(post.id);
      await loadFeed();
    } catch (err) {
      setError(err.message || "Unable to delete this post.");
    }
  }

  async function sharePost(post) {
    const shareUrl = `${window.location.origin}${window.location.pathname}#post-${post.id}`;
    const shareData = {
      title: "Sankalpo Community action",
      text: post.description || post.title,
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setNotice("Post shared.");
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setNotice("Share link copied to your clipboard.");
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        setError("Sharing is unavailable. Open the post details to copy its link.");
      }
    }
  }

  return (
    <main className="community-page">
      <div className="community-container">
        <header className="community-header">
          <p className="community-eyebrow">COMMUNITY ACTIONS</p>
        </header>

        {error && <div className="community-alert community-alert-error" role="alert">{error}</div>}
        {notice && <div className="community-alert community-alert-success" role="status">{notice}</div>}

        {selectedPostImage && (
          <div className="community-lightbox-backdrop" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedPostImage(null);
          }}>
            <div className="community-lightbox" role="dialog" aria-modal="true" aria-label="Full-size community photo">
              <button type="button" className="community-lightbox-close" onClick={() => setSelectedPostImage(null)} aria-label="Close photo">
                <X size={22} />
              </button>
              <img src={selectedPostImage.src} alt={selectedPostImage.alt} />
            </div>
          </div>
        )}

        <nav className="community-tabs" role="tablist" aria-label="Community actions">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`community-tab${activeTab === tab ? " active" : ""}`}
              onClick={() => {
                setActiveTab(tab);
                setError("");
              }}
            >
              {tab === "Create Post" ? <Leaf size={17} /> : <UserRound size={17} />}
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === "Create Post" && (
          <section className="community-create-panel" aria-label="Create a community post">
            <div className="community-create-heading">
              <Avatar item={currentProfile} size={44} />
              <div>
                <h2>Create a post</h2>
                <p>Share an action, update, or environmental concern with the community.</p>
              </div>
            </div>
            <form className="community-create-form" onSubmit={submitPost}>
              <label className="community-field community-field-full">
                <span>Post content</span>
                <textarea
                  value={postContent}
                  onChange={(event) => setPostContent(event.target.value)}
                  rows="5"
                  maxLength={2000}
                  placeholder="What would you like to share?"
                  required
                />
              </label>
              <label className="community-field">
                <span>Post type</span>
                <select value={postType} onChange={(event) => setPostType(event.target.value)}>
                  {postTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
              <label className="community-field">
                <span>Location</span>
                <input
                  value={postLocation}
                  onChange={(event) => setPostLocation(event.target.value)}
                  placeholder="City or area"
                  maxLength={160}
                />
              </label>
              <div className="community-upload-section community-field-full">
                <div className="community-upload-heading">
                  <div><ImagePlus size={18} /><span>Optional image</span></div>
                  <small>Up to 3 images · 8 MB each</small>
                </div>
                <input
                  ref={fileInputRef}
                  className="visually-hidden"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => addImages(event.target.files)}
                />
                <button className="community-upload-button" type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <UploadCloud size={17} /> Upload images
                </button>
                {previewUrls.length > 0 && (
                  <div className="community-preview-grid">
                    {previewUrls.map((url, index) => (
                      <div className="community-preview-item" key={`${url}-${index}`}>
                        <img src={url} alt={`Selected upload ${index + 1}`} />
                        <button type="button" aria-label={`Remove image ${index + 1}`} onClick={() => {
                          setSelectedFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
                          setPreviewUrls((current) => current.filter((_, currentIndex) => currentIndex !== index));
                          previewUrls.filter((_, currentIndex) => currentIndex !== index).forEach((item) => URL.revokeObjectURL(item));
                        }}><span aria-hidden="true">×</span></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="community-composer-actions community-field-full">
                <span>{uploading && <><LoaderCircle className="spin" size={15} /> Uploading…</>}</span>
                <button className="community-primary-button" type="submit" disabled={saving || uploading}>
                  {saving ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
                  {saving ? "Publishing…" : "Publish Post"}
                </button>
              </div>
            </form>
          </section>
        )}

        {activeTab === "Feed" && (
          <section className="community-feed-section" aria-label="Shared community posts">
            <div className="community-feed-heading">
              <div>
                <h2>Community feed</h2>
                <p>Shared posts from all members, newest first.</p>
              </div>
              <span>{posts.length} {posts.length === 1 ? "post" : "posts"}</span>
            </div>

            {loadingPosts ? <LoadingState label="Loading community feed…" /> : posts.length === 0 ? (
              <div className="community-empty-state">
                <Leaf size={30} />
                <h3>No community posts yet</h3>
                <p>Be the first member to share an update.</p>
              </div>
            ) : (
              <div className="community-feed-list">
                {posts.map((post) => {
                  const isOwner = post.user_id === user?.id;
                  const reactionCount = post.reactions?.length || 0;
                  const postText = post.description || post.title;
                  const postImage = normalizeCommunityImageUrl(post.photo_url);
                  const commentCount = post.comments?.length || 0;
                  const commentsOpen = Boolean(openComments[post.id]);
                  return (
                    <article
                      className="community-post-card"
                      id={`post-${post.id}`}
                      key={post.id}
                    >
                      <header className="community-post-header">
                        <div className="community-author">
                          <Avatar item={post.author || post} size={48} />
                          <div>
                            <div className="community-author-name-row">
                              <strong>{post.author?.full_name || "Sankalpo member"}</strong>
                              <span className="community-post-type-badge">{post.post_type || "action"}</span>
                            </div>
                            <span className="community-post-date">{formatDate(post.created_at)}</span>
                          </div>
                        </div>
                        {isOwner && (
                          <div className="community-owner-menu">
                            <button type="button" aria-label="Post options" aria-expanded="false"><MoreHorizontal size={19} /></button>
                            <div className="community-owner-menu-panel">
                              <button type="button" onClick={() => {
                                setEditingPost(post);
                                setEditingText(post.description || post.title || "");
                              }}>Edit post</button>
                              <button type="button" className="community-owner-delete" onClick={() => removePost(post)}>Delete post</button>
                            </div>
                          </div>
                        )}
                      </header>

                      {editingPost?.id === post.id ? (
                        <div className="community-edit-panel">
                          <textarea value={editingText} onChange={(event) => setEditingText(event.target.value)} rows="4" />
                          <div>
                            <button type="button" className="community-secondary-button" onClick={() => setEditingPost(null)}>Cancel</button>
                            <button type="button" className="community-primary-button" onClick={() => savePostEdit(post)}>Save changes</button>
                          </div>
                        </div>
                      ) : (
                        <div className="community-post-body">
                          <p>{postText || "Shared with the Sankalpo community."}</p>
                          {post.location && <div className="community-location"><MapPin size={14} /> {post.location}</div>}
                        </div>
                      )}

                      {postImage && (
                        <button
                          type="button"
                          className="community-post-image-wrap"
                          onClick={() => setSelectedPostImage({ src: postImage, alt: post.title || "Community post" })}
                          aria-label="Open photo in full size"
                        >
                          <img
                            className="community-post-image"
                            src={postImage}
                            alt={post.title || "Community post"}
                            loading="lazy"
                          />
                        </button>
                      )}

                      <footer className="community-post-footer" onClick={(event) => event.stopPropagation()}>
                        <div className="community-post-actions">
                          <button type="button" className="community-react-button" onClick={() => reactToPost(post.id)}>
                            <CheckCircle2 size={19} />
                            <span>Like</span>
                            <strong>{reactionCount}</strong>
                          </button>
                          <button
                            type="button"
                            className="community-comment-action"
                            onClick={() => setOpenComments((current) => ({ ...current, [post.id]: !commentsOpen }))}
                            aria-expanded={commentsOpen}
                          >
                            <MessageCircle size={19} />
                            <span>Comment</span>
                            <strong>{commentCount}</strong>
                          </button>
                          <button type="button" className="community-share-button" onClick={() => sharePost(post)}>
                            <Share2 size={19} />
                            <span>Share</span>
                          </button>
                        </div>
                      </footer>

                      {commentsOpen && (
                        <div className="community-comments">
                          {(post.comments || []).map((comment) => (
                            <div className="community-comment" key={comment.id}>
                              <Avatar item={comment.author || comment} size={32} />
                              <div>
                                <strong>{comment.author?.full_name || "Sankalpo member"}</strong>
                                <p>{comment.text || ""}</p>
                              </div>
                            </div>
                          ))}
                          <form
                            className="community-comment-form"
                            onSubmit={(event) => {
                              event.preventDefault();
                              commentOnPost(post.id, commentText[post.id] || "");
                            }}
                          >
                            <Avatar item={post.author || currentProfile} size={32} />
                            <input
                              value={commentText[post.id] || ""}
                              onChange={(event) => setCommentText((current) => ({ ...current, [post.id]: event.target.value }))}
                              placeholder="Write a comment…"
                              aria-label="Comment"
                            />
                            <button type="submit" aria-label="Post comment" disabled={!commentText[post.id]?.trim()}><Send size={16} /></button>
                          </form>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

      </div>
    </main>
  );
}
