// Student Community JavaScript

let currentPage = 1;
let currentSort = 'recent';
let currentTag = null;
let currentSearch = '';
let isLoading = false;
let hasMorePosts = true;

// DOM element references — resolved after DOMContentLoaded
let postsContainer, loadingSpinner, createPostBtn, myPostsBtn;
let createPostModal, postDetailModal, closeModalBtn, closeDetailModalBtn;
let cancelPostBtn, createPostForm, postTypeSelect, mediaUploadGroup;
let projectUrlGroup, searchInput, filterButtons, loadMoreBtn;
let loadMoreContainer, trendingTagsContainer;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Resolve DOM refs now that the document is fully parsed
    postsContainer        = document.getElementById('postsContainer');
    loadingSpinner        = document.getElementById('loadingSpinner');
    createPostBtn         = document.getElementById('createPostBtn');
    myPostsBtn            = document.getElementById('myPostsBtn');
    createPostModal       = document.getElementById('createPostModal');
    postDetailModal       = document.getElementById('postDetailModal');
    closeModalBtn         = document.getElementById('closeModalBtn');
    closeDetailModalBtn   = document.getElementById('closeDetailModalBtn');
    cancelPostBtn         = document.getElementById('cancelPostBtn');
    createPostForm        = document.getElementById('createPostForm');
    postTypeSelect        = document.getElementById('postType');
    mediaUploadGroup      = document.getElementById('mediaUploadGroup');
    projectUrlGroup       = document.getElementById('projectUrlGroup');
    searchInput           = document.getElementById('searchInput');
    filterButtons         = document.querySelectorAll('.filter-btn');
    loadMoreBtn           = document.getElementById('loadMoreBtn');
    loadMoreContainer     = document.getElementById('loadMoreContainer');
    trendingTagsContainer = document.getElementById('tagList');

    if (postsContainer) loadPosts();
    if (trendingTagsContainer) loadTrendingTags();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    if (createPostBtn) createPostBtn.addEventListener('click', () => openCreatePostModal());
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => closeCreatePostModal());
    if (closeDetailModalBtn) closeDetailModalBtn.addEventListener('click', () => closePostDetailModal());
    if (cancelPostBtn) cancelPostBtn.addEventListener('click', () => closeCreatePostModal());
    if (createPostForm) createPostForm.addEventListener('submit', handleCreatePost);

    if (postTypeSelect) {
        postTypeSelect.addEventListener('change', (e) => {
            const type = e.target.value;
            if (mediaUploadGroup) mediaUploadGroup.style.display = (type === 'image' || type === 'video') ? 'block' : 'none';
            if (projectUrlGroup) projectUrlGroup.style.display = type === 'project' ? 'block' : 'none';
        });
    }

    if (filterButtons && filterButtons.length) {
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentSort = e.target.dataset.sort;
                currentPage = 1;
                hasMorePosts = true;
                loadPosts(true);
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            currentSearch = e.target.value;
            currentPage = 1;
            hasMorePosts = true;
            loadPosts(true);
        }, 500));
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            currentPage++;
            loadPosts(false);
        });
    }

    if (myPostsBtn) myPostsBtn.addEventListener('click', showMyPosts);

    // Close modals on outside click
    if (createPostModal) {
        createPostModal.addEventListener('click', (e) => {
            if (e.target === createPostModal) closeCreatePostModal();
        });
    }
    if (postDetailModal) {
        postDetailModal.addEventListener('click', (e) => {
            if (e.target === postDetailModal) closePostDetailModal();
        });
    }
}

// Load Posts
async function loadPosts(reset = true) {
    if (isLoading) return;
    if (!postsContainer) return;   // element not present on this page variant
    isLoading = true;

    if (reset) {
        postsContainer.innerHTML = '<div class="loading-spinner" id="loadingSpinner"><div class="spinner"></div><p>Loading posts...</p></div>';
    }

    try {
        const params = new URLSearchParams({
            sort: currentSort,
            page: currentPage,
            limit: 20
        });

        if (currentTag) params.append('tag', currentTag);
        if (currentSearch) params.append('search', currentSearch);

        const response = await fetch(`/api/community/posts?${params}`);
        const data = await response.json();

        if (data.ok) {
            if (reset) {
                postsContainer.innerHTML = '';
            } else {
                // Remove loading spinner if exists
                const spinner = document.getElementById('loadingSpinner');
                if (spinner) spinner.remove();
            }

            if (data.posts.length === 0 && reset) {
                postsContainer.innerHTML = `
                    <div class="cm-empty">
                        <div class="cm-empty-icon"><i data-lucide="message-square" style="width:52px;height:52px;color:var(--accent,#6366f1);opacity:.45;"></i></div>
                        <h3>No posts yet</h3>
                        <p>Be the first to share something with the community!</p>
                    </div>
                `;
                if (window.lucide) lucide.createIcons();
                if (loadMoreContainer) loadMoreContainer.style.display = 'none';
            } else {
                data.posts.forEach(post => renderPost(post));

                // Show/hide load more button
                hasMorePosts = data.pagination.page < data.pagination.pages;
                if (loadMoreContainer) loadMoreContainer.style.display = hasMorePosts ? 'block' : 'none';
            }
        }
    } catch (error) {
        console.error('Error loading posts:', error);
        postsContainer.innerHTML = `
            <div class="cm-empty">
                <div class="cm-empty-icon"><i data-lucide="alert-triangle" style="width:52px;height:52px;color:#f59e0b;opacity:.8;"></i></div>
                <h3>Error loading posts</h3>
                <p>Please try again later.</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    } finally {
        isLoading = false;
    }
}

// Render Post Card
function renderPost(post) {
    const postCard = document.createElement('div');
    postCard.className = `post-card ${post.isPinned ? 'pinned' : ''}`;
    postCard.dataset.postId = post._id;

    const authorInitial = post.author?.name?.charAt(0).toUpperCase() || 'U';
    const authorName = post.author?.name || 'Unknown User';
    const timeAgo = getTimeAgo(new Date(post.createdAt));

    let mediaHTML = '';
    if (post.mediaUrl) {
        if (post.postType === 'image') {
            mediaHTML = `<div class="post-media"><img src="${post.mediaUrl}" alt="${post.title}"></div>`;
        } else if (post.postType === 'video') {
            mediaHTML = `<div class="post-media"><video controls src="${post.mediaUrl}"></video></div>`;
        }
    }

    let tagsHTML = '';
    if (post.tags && post.tags.length > 0) {
        tagsHTML = `<div class="post-tags">${post.tags.map(tag => `<span class="post-tag">#${tag}</span>`).join('')}</div>`;
    }

    postCard.innerHTML = `
        ${post.isPinned ? '<div style="display:flex;align-items:center;gap:5px;color:#f59e0b;font-size:12px;font-weight:600;margin-bottom:8px;"><i data-lucide=\'pin\' style=\'width:13px;height:13px;\'></i> PINNED</div>' : ''}
        <div class="post-header">
            <div class="post-avatar">${authorInitial}</div>
            <div class="post-author-info">
                <p class="post-author-name">${authorName}</p>
                <p class="post-timestamp">${timeAgo}</p>
            </div>
            <span class="post-type-badge ${post.postType}">${post.postType}</span>
        </div>
        <h3 class="post-title">${escapeHtml(post.title)}</h3>
        <p class="post-content">${escapeHtml(post.content)}</p>
        ${mediaHTML}
        ${tagsHTML}
        <div class="post-footer">
            <div class="post-action" onclick="toggleLike('${post._id}', event)">
                <span class="post-action-icon"><i data-lucide="heart" style="width:15px;height:15px;"></i></span>
                <span class="like-count">${post.likeCount || 0}</span>
            </div>
            <div class="post-action">
                <span class="post-action-icon"><i data-lucide="message-circle" style="width:15px;height:15px;"></i></span>
                <span>${post.commentCount || 0}</span>
            </div>
            <div class="post-action">
                <span class="post-action-icon"><i data-lucide="eye" style="width:15px;height:15px;"></i></span>
                <span>${post.viewCount || 0}</span>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons({ el: postCard });

    postCard.addEventListener('click', (e) => {
        // Don't open detail if clicking on action buttons
        if (!e.target.closest('.post-action')) {
            openPostDetail(post._id);
        }
    });

    postsContainer.appendChild(postCard);
}

// Toggle Like
async function toggleLike(postId, event) {
    event.stopPropagation();

    try {
        const response = await fetch(`/api/community/posts/${postId}/like`, {
            method: 'POST',
            credentials: 'include'
        });
        const data = await response.json();

        if (data.ok) {
            const postCard = document.querySelector(`[data-post-id="${postId}"]`);
            const likeCount = postCard.querySelector('.like-count');
            likeCount.textContent = data.likeCount;

            const likeAction = postCard.querySelector('.post-action');
            if (data.liked) {
                likeAction.classList.add('liked');
            } else {
                likeAction.classList.remove('liked');
            }
        }
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

// Open Post Detail
async function openPostDetail(postId) {
    try {
        // Increment view count
        fetch(`/api/community/posts/${postId}/view`, { method: 'POST' });

        const response = await fetch(`/api/community/posts/${postId}`);
        const data = await response.json();

        if (data.ok) {
            renderPostDetail(data.post, data.comments);
            postDetailModal.classList.add('active');
        }
    } catch (error) {
        console.error('Error loading post detail:', error);
    }
}

// Render Post Detail
function renderPostDetail(post, comments) {
    const authorInitial = post.author?.name?.charAt(0).toUpperCase() || 'U';
    const authorName = post.author?.name || 'Unknown User';
    const timeAgo = getTimeAgo(new Date(post.createdAt));

    let mediaHTML = '';
    if (post.mediaUrl) {
        if (post.postType === 'image') {
            mediaHTML = `<div class="post-media"><img src="${post.mediaUrl}" alt="${post.title}"></div>`;
        } else if (post.postType === 'video') {
            mediaHTML = `<div class="post-media"><video controls src="${post.mediaUrl}"></video></div>`;
        }
    }

    let tagsHTML = '';
    if (post.tags && post.tags.length > 0) {
        tagsHTML = `<div class="post-tags">${post.tags.map(tag => `<span class="post-tag">#${tag}</span>`).join('')}</div>`;
    }

    const detailContent = document.getElementById('postDetailContent');
    detailContent.innerHTML = `
        <div class="post-detail">
            <div class="post-header">
                <div class="post-avatar">${authorInitial}</div>
                <div class="post-author-info">
                    <p class="post-author-name">${authorName}</p>
                    <p class="post-timestamp">${timeAgo}</p>
                </div>
                <span class="post-type-badge ${post.postType}">${post.postType}</span>
            </div>
            <h2 class="post-title">${escapeHtml(post.title)}</h2>
            <div style="color: var(--text-muted); line-height: 1.6; white-space: pre-wrap;">${escapeHtml(post.content)}</div>
            ${mediaHTML}
            ${post.projectUrl ? `<p><strong>Project URL:</strong> <a href="${post.projectUrl}" target="_blank" style="color: #4da0ff;">${post.projectUrl}</a></p>` : ''}
            ${tagsHTML}
            <div class="post-footer">
                <div class="post-action" onclick="toggleLike('${post._id}', event)">
                    <span class="post-action-icon"><i data-lucide="heart" style="width:15px;height:15px;"></i></span>
                    <span class="like-count">${post.likeCount || 0}</span>
                </div>
                <div class="post-action">
                    <span class="post-action-icon"><i data-lucide="message-circle" style="width:15px;height:15px;"></i></span>
                    <span>${post.commentCount || 0}</span>
                </div>
                <div class="post-action">
                    <span class="post-action-icon"><i data-lucide="eye" style="width:15px;height:15px;"></i></span>
                    <span>${post.viewCount || 0}</span>
                </div>
            </div>
        </div>
        <div class="comments-section">
            <h3>Comments (${comments.length})</h3>
            <div class="comment-form" style="margin: 16px 0;">
                <textarea id="newCommentText" placeholder="Write a comment..." style="width: 100%; padding: 12px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; min-height: 80px;"></textarea>
                <button onclick="addComment('${post._id}')" class="primary-btn" style="margin-top: 8px;">Post Comment</button>
            </div>
            <div id="commentsList">
                ${comments.map(comment => renderComment(comment)).join('')}
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons({ el: detailContent });
}

// Render Comment
function renderComment(comment) {
    if (comment.isDeleted) return '';

    const authorInitial = comment.author?.name?.charAt(0).toUpperCase() || 'U';
    const authorName = comment.author?.name || 'Unknown User';
    const timeAgo = getTimeAgo(new Date(comment.createdAt));

    let repliesHTML = '';
    if (comment.replies && comment.replies.length > 0) {
        repliesHTML = `<div class="comment-replies">${comment.replies.map(reply => renderComment(reply)).join('')}</div>`;
    }

    return `
        <div class="comment-card">
            <div class="comment-header">
                <div class="comment-avatar">${authorInitial}</div>
                <span class="comment-author">${authorName}</span>
                <span class="comment-time">${timeAgo}</span>
            </div>
            <div class="comment-content">${escapeHtml(comment.content)}</div>
            <div class="comment-actions">
                <span class="comment-action" onclick="toggleCommentLike('${comment._id}')"><i data-lucide="heart" style="width:13px;height:13px;display:inline;"></i> ${comment.likeCount || 0}</span>
                <span class="comment-action" onclick="replyToComment('${comment._id}')">Reply</span>
            </div>
            ${repliesHTML}
        </div>
    `;
}

// Add Comment
async function addComment(postId) {
    const commentText = document.getElementById('newCommentText').value.trim();
    if (!commentText) return;

    try {
        const response = await fetch(`/api/community/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ content: commentText })
        });

        const data = await response.json();
        if (data.ok) {
            document.getElementById('newCommentText').value = '';
            openPostDetail(postId); // Refresh post detail
        }
    } catch (error) {
        console.error('Error adding comment:', error);
    }
}

// Toggle Comment Like
async function toggleCommentLike(commentId) {
    try {
        const response = await fetch(`/api/community/comments/${commentId}/like`, {
            method: 'POST',
            credentials: 'include'
        });
        const data = await response.json();
        if (data.ok) {
            // Refresh the current post detail
            const postId = document.querySelector('.post-detail').dataset.postId;
            if (postId) openPostDetail(postId);
        }
    } catch (error) {
        console.error('Error toggling comment like:', error);
    }
}

// Create Post
async function handleCreatePost(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('title', document.getElementById('postTitle').value);
    formData.append('content', document.getElementById('postContent').value);
    formData.append('postType', document.getElementById('postType').value);
    formData.append('tags', document.getElementById('postTags').value);

    const projectUrl = document.getElementById('projectUrl').value;
    if (projectUrl) formData.append('projectUrl', projectUrl);

    const mediaFile = document.getElementById('mediaFile').files[0];
    if (mediaFile) formData.append('media', mediaFile);

    try {
        const response = await fetch('/api/community/posts', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const data = await response.json();
        if (data.ok) {
            closeCreatePostModal();
            createPostForm.reset();
            currentPage = 1;
            loadPosts(true);
        } else {
            alert(data.message || 'Error creating post');
        }
    } catch (error) {
        console.error('Error creating post:', error);
        alert('Error creating post. Please try again.');
    }
}

// Load Trending Tags
async function loadTrendingTags() {
    try {
        const response = await fetch('/api/community/tags/trending');
        const data = await response.json();

        if (data.ok && data.tags.length > 0) {
            trendingTagsContainer.innerHTML = data.tags.map(tag =>
                `<span class="tag-chip" onclick="filterByTag('${tag.tag}')">
                    #${tag.tag} <span class="count">(${tag.count})</span>
                </span>`
            ).join('');
        } else {
            trendingTagsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">No trending tags yet</p>';
        }
    } catch (error) {
        console.error('Error loading trending tags:', error);
    }
}

// Filter by Tag
function filterByTag(tag) {
    currentTag = tag;
    currentPage = 1;
    hasMorePosts = true;
    loadPosts(true);
}

// Show My Posts
async function showMyPosts() {
    if (!postsContainer) return;
    try {
        const meResponse = await fetch('/api/me', { credentials: 'include' });
        const meData = await meResponse.json();

        if (meData.ok) {
            const response = await fetch(`/api/community/users/${meData.user._id}/posts`);
            const data = await response.json();

            if (data.ok) {
                postsContainer.innerHTML = '';
                if (data.posts.length === 0) {
                    postsContainer.innerHTML = `
                        <div class="cm-empty">
                            <div class="cm-empty-icon"><i data-lucide="pencil" style="width:52px;height:52px;color:var(--accent,#6366f1);opacity:.45;"></i></div>
                            <h3>No posts yet</h3>
                            <p>Create your first post to get started!</p>
                        </div>
                    `;
                    if (window.lucide) lucide.createIcons();
                } else {
                    data.posts.forEach(post => renderPost(post));
                }
                if (loadMoreContainer) loadMoreContainer.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading my posts:', error);
    }
}

// Modal Functions
function openCreatePostModal() {
    if (createPostModal) createPostModal.classList.add('active');
}

function closeCreatePostModal() {
    if (createPostModal) createPostModal.classList.remove('active');
}

function closePostDetailModal() {
    if (postDetailModal) postDetailModal.classList.remove('active');
}

// Utility Functions
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }

    return 'just now';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Quiz Join Functionality

function setupQuizJoin() {
    const quizCodeInput = document.getElementById('quizCodeInput');
    const joinQuizBtn = document.getElementById('joinQuizBtn');
    const quizError = document.getElementById('quizError');

    if (joinQuizBtn) {
        joinQuizBtn.addEventListener('click', async () => {
            const code = quizCodeInput.value.trim().toUpperCase();

            if (!code) {
                showQuizError('Please enter a quiz code');
                return;
            }

            if (code.length !== 6) {
                showQuizError('Quiz code must be 6 characters');
                return;
            }

            // Get student info from localStorage
            const studentName = localStorage.getItem('firstName') || 'Student';
            const studentEmail = localStorage.getItem('email') || '';

            // Disable button and show loading
            joinQuizBtn.disabled = true;
            joinQuizBtn.innerHTML = '<i data-lucide="loader" style="width:15px;height:15px;animation:spin 1s linear infinite;"></i> Joining...';
            if (window.lucide) lucide.createIcons({ el: joinQuizBtn });
            quizError.style.display = 'none';

            try {
                // Validate quiz code via API
                const response = await fetch('/api/quiz/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ code: code })
                });

                const data = await response.json();

                if (response.ok && data.ok) {
                    // Store quiz session data
                    localStorage.setItem('quizCode', code);
                    localStorage.setItem('quizSessionId', data.sessionId || code);
                    localStorage.setItem('studentName', studentName);

                    // Redirect to live quiz page
                    window.location.href = `student-live-quiz.html?code=${code}`;
                } else {
                    showQuizError(data.message || 'Invalid quiz code. Please check and try again.');
                    joinQuizBtn.disabled = false;
                    joinQuizBtn.innerHTML = '<i data-lucide="zap" style="width:15px;height:15px;"></i> Join Quiz';
                    if (window.lucide) lucide.createIcons({ el: joinQuizBtn });
                }

            } catch (error) {
                console.error('Error joining quiz:', error);
                showQuizError('Failed to connect. Please try again.');
                joinQuizBtn.disabled = false;
                joinQuizBtn.innerHTML = '<i data-lucide="zap" style="width:15px;height:15px;"></i> Join Quiz';
                if (window.lucide) lucide.createIcons({ el: joinQuizBtn });
            }
        });

        // Allow Enter key to submit
        quizCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                joinQuizBtn.click();
            }
        });

        // Auto-uppercase input
        quizCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }
}

function showQuizError(message) {
    const quizError = document.getElementById('quizError');
    if (quizError) {
        quizError.textContent = message;
        quizError.style.display = 'block';
    }
}

// Initialize quiz join when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupQuizJoin();
});

// Make functions globally available
window.toggleLike = toggleLike;
window.addComment = addComment;
window.toggleCommentLike = toggleCommentLike;
window.filterByTag = filterByTag;
