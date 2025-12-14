// API Base URL
const API_URL = window.location.origin;

// Global state
let subjects = [];
let currentEditingId = null;

// Utility Functions
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateShort(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit',
        year: 'numeric'
    });
}

function getDaysUntil(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days left`;
}

function getTimeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
}

// Modal Functions
function openModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    currentEditingId = null;
}

// Close modal on overlay click
document.addEventListener('click', function(e) {
    const overlay = document.getElementById('modal-overlay');
    if (e.target === overlay) {
        closeModal();
    }
});

// Navigation
function setActiveNav(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) {
            item.classList.add('active');
        }
    });
}

// Subject Functions
async function loadSubjects() {
    try {
        const response = await fetch(`${API_URL}/subject`);
        subjects = await response.json();
        renderSubjects();
        updateSubjectStats();
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

function renderSubjects() {
    const container = document.getElementById('subjects-container');
    if (!container) return;
    
    if (subjects.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-book"></i><p>No subjects yet. Add your first subject!</p></div>';
        return;
    }
    
    const colors = ['blue', 'purple', 'green'];
    container.innerHTML = subjects.map((subject, index) => {
        const color = colors[index % colors.length];
        // Generate course code from subject name
        const courseCode = subject.name.split(' ').map(w => w[0]).join('').toUpperCase() + '-' + (100 + subject.id);
        // Estimate students (mock data)
        const students = Math.floor(Math.random() * 20) + 30;
        
        return `
            <div class="subject-card ${color}">
                <div class="subject-card-header">
                    <div>
                        <div class="subject-code">${courseCode}</div>
                        <h3>${subject.name}</h3>
                        <p>Professor: ${subject.teacher}</p>
                        <p style="margin-top: 0.5rem; color: #999; font-size: 0.85rem;">${getSubjectDescription(subject.name)}</p>
                    </div>
                    <div class="subject-card-actions">
                        <button onclick="editSubject(${subject.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteSubject(${subject.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="subject-card-footer">
                    <span>${students} Students</span>
                    <button class="btn-secondary" onclick="viewSubjectDetails(${subject.id})">View Details</button>
                </div>
            </div>
        `;
    }).join('');
}

function getSubjectDescription(name) {
    const descriptions = {
        'Introduction to Computing': 'Fundamentals of computer science and programming',
        'Data Structures and Algorithms': 'Core data structures and algorithm analysis',
        'Database Systems': 'Relational databases, SQL, and database design',
        'Web Development': 'Modern web technologies and frameworks',
        'Software Engineering': 'Software development methodologies and practices'
    };
    return descriptions[name] || 'Course materials and resources';
}

function updateSubjectStats() {
    const totalSubjectsEl = document.getElementById('total-subjects');
    const activeClassesEl = document.getElementById('active-classes');
    const activeSubjectsEl = document.getElementById('stat-active-subjects');
    
    if (totalSubjectsEl) totalSubjectsEl.textContent = subjects.length;
    if (activeClassesEl) activeClassesEl.textContent = subjects.length;
    if (activeSubjectsEl) activeSubjectsEl.textContent = subjects.length;
}

function openSubjectModal(subjectId = null) {
    currentEditingId = subjectId;
    const subject = subjectId ? subjects.find(s => s.id === subjectId) : null;
    
    const content = `
        <form onsubmit="saveSubject(event)">
            <div class="form-group">
                <label>Subject Name *</label>
                <input type="text" id="subject-name" value="${subject ? subject.name : ''}" required>
            </div>
            <div class="form-group">
                <label>Teacher Name *</label>
                <input type="text" id="subject-teacher" value="${subject ? subject.teacher : 'Prof. Martinez'}" required>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary">${subject ? 'Update' : 'Create'} Subject</button>
            </div>
        </form>
    `;
    
    openModal(subject ? 'Edit Subject' : 'Add New Subject', content);
}

async function saveSubject(event) {
    event.preventDefault();
    const name = document.getElementById('subject-name').value.trim();
    const teacher = document.getElementById('subject-teacher').value.trim();
    
    if (!name || !teacher) {
        alert('Both name and teacher are required');
        return;
    }
    
    try {
        const url = currentEditingId ? `${API_URL}/subject/${currentEditingId}` : `${API_URL}/subject`;
        const method = currentEditingId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, teacher })
        });
        
        if (response.ok) {
            closeModal();
            await loadSubjects();
            if (window.location.pathname === '/') {
                loadDashboardStats();
            }
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to save subject');
        }
    } catch (error) {
        console.error('Error saving subject:', error);
        alert('Failed to save subject');
    }
}

function editSubject(id) {
    openSubjectModal(id);
}

async function deleteSubject(id) {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    
    try {
        const response = await fetch(`${API_URL}/subject/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadSubjects();
            if (window.location.pathname === '/') {
                loadDashboardStats();
            }
        } else {
            alert('Failed to delete subject');
        }
    } catch (error) {
        console.error('Error deleting subject:', error);
        alert('Failed to delete subject');
    }
}

function viewSubjectDetails(id) {
    // Could navigate to a subject details page
    alert('Subject details feature coming soon!');
}

// Announcement Functions
async function loadAnnouncements() {
    try {
        const response = await fetch(`${API_URL}/announcement`);
        const announcements = await response.json();
        renderAnnouncements(announcements);
    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}

function renderAnnouncements(announcements) {
    const container = document.getElementById('announcements-container');
    if (!container) return;
    
    if (announcements.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-bell"></i><p>No announcements yet. Create your first announcement!</p></div>';
        return;
    }
    
    // Get subject names
    const subjectMap = {};
    subjects.forEach(s => subjectMap[s.id] = s.name);
    
    container.innerHTML = announcements.map(announcement => {
        const subjectName = subjectMap[announcement.subject_id] || `Subject ${announcement.subject_id}`;
        const courseCode = subjectName.split(' ').map(w => w[0]).join('').toUpperCase() + '-' + (100 + announcement.subject_id);
        const isPinned = announcement.id % 3 === 0; // Mock pinned status
        
        return `
            <div class="announcement-card ${isPinned ? 'pinned' : ''}">
                <div class="announcement-header">
                    <span class="subject-code">${courseCode}</span>
                    ${isPinned ? '<span class="pinned-badge"><i class="fas fa-thumbtack"></i> Pinned</span>' : ''}
                </div>
                <h3>${announcement.title}</h3>
                <p>${announcement.content}</p>
                <div class="announcement-meta">
                    Posted by Prof. Martinez • ${formatDate(announcement.date_posted)}
                </div>
                <div class="announcement-actions">
                    <button class="btn-secondary" onclick="openCommentsModal(${announcement.id})">
                        <i class="fas fa-comments"></i> Comments
                    </button>
                    <button class="btn-danger" onclick="deleteAnnouncement(${announcement.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function openAnnouncementModal() {
    if (subjects.length === 0) {
        alert('Please create a subject first!');
        return;
    }
    
    const subjectOptions = subjects.map(s => {
        const courseCode = s.name.split(' ').map(w => w[0]).join('').toUpperCase() + '-' + (100 + s.id);
        return `<option value="${s.id}">${courseCode} - ${s.name}</option>`;
    }).join('');
    
    const content = `
        <form onsubmit="saveAnnouncement(event)">
            <div class="form-group">
                <label>Subject *</label>
                <select id="announcement-subject" required>
                    <option value="">Select a subject</option>
                    ${subjectOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Title *</label>
                <input type="text" id="announcement-title" required>
            </div>
            <div class="form-group">
                <label>Content *</label>
                <textarea id="announcement-content" required></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary">Post Announcement</button>
            </div>
        </form>
    `;
    
    openModal('New Announcement', content);
}

async function saveAnnouncement(event) {
    event.preventDefault();
    const subjectId = parseInt(document.getElementById('announcement-subject').value);
    const title = document.getElementById('announcement-title').value.trim();
    const content = document.getElementById('announcement-content').value.trim();
    
    try {
        const response = await fetch(`${API_URL}/subject/${subjectId}/announcement`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content })
        });
        
        if (response.ok) {
            closeModal();
            await loadAnnouncements();
            if (window.location.pathname === '/') {
                loadDashboardStats();
                loadLatestActivity();
            }
        } else {
            alert('Failed to create announcement');
        }
    } catch (error) {
        console.error('Error saving announcement:', error);
        alert('Failed to create announcement');
    }
}

async function deleteAnnouncement(id) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
        const response = await fetch(`${API_URL}/announcement/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadAnnouncements();
            if (window.location.pathname === '/') {
                loadDashboardStats();
                loadLatestActivity();
            }
        } else {
            alert('Failed to delete announcement');
        }
    } catch (error) {
        console.error('Error deleting announcement:', error);
        alert('Failed to delete announcement');
    }
}

async function openCommentsModal(announcementId) {
    try {
        const [announcementRes, commentsRes] = await Promise.all([
            fetch(`${API_URL}/announcement/${announcementId}`),
            fetch(`${API_URL}/announcement/${announcementId}/comments`)
        ]);
        
        const announcement = await announcementRes.json();
        const comments = await commentsRes.json();
        
        const commentsHtml = comments.length > 0 
            ? comments.map(c => `
                <div class="comment-item">
                    <div class="comment-header">
                        <span class="comment-user">${c.user}</span>
                        <span class="comment-date">${formatDate(c.date_posted)}</span>
                    </div>
                    <div class="comment-content">${c.content}</div>
                </div>
            `).join('')
            : '<div class="empty-state"><p>No comments yet</p></div>';
        
        const content = `
            <div>
                <h3 style="margin-bottom: 1rem;">${announcement.title}</h3>
                <p style="margin-bottom: 1.5rem; color: #666;">${announcement.content}</p>
                <h4 style="margin-bottom: 1rem;">Comments</h4>
                <div class="comments-section">
                    ${commentsHtml}
                </div>
                <div class="comment-form">
                    <form onsubmit="addComment(event, ${announcementId})">
                        <div class="form-group">
                            <label>Your Name</label>
                            <input type="text" id="comment-user" value="Prof. Martinez" required>
                        </div>
                        <div class="form-group">
                            <label>Comment</label>
                            <textarea id="comment-content" required></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="closeModal()">Close</button>
                            <button type="submit" class="btn-primary">Add Comment</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        openModal('Comments', content);
    } catch (error) {
        console.error('Error loading comments:', error);
        alert('Failed to load comments');
    }
}

async function addComment(event, announcementId) {
    event.preventDefault();
    const user = document.getElementById('comment-user').value.trim();
    const content = document.getElementById('comment-content').value.trim();
    
    try {
        const response = await fetch(`${API_URL}/announcement/${announcementId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user, content })
        });
        
        if (response.ok) {
            openCommentsModal(announcementId); // Reload comments
        } else {
            alert('Failed to add comment');
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Failed to add comment');
    }
}

// Material Functions
async function loadMaterials() {
    try {
        const response = await fetch(`${API_URL}/material`);
        const materials = await response.json();
        renderMaterials(materials);
        updateMaterialStats(materials);
    } catch (error) {
        console.error('Error loading materials:', error);
    }
}

function renderMaterials(materials) {
    const container = document.getElementById('materials-container');
    if (!container) return;
    
    if (materials.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-file-alt"></i><p>No materials yet. Upload your first material!</p></div>';
        return;
    }
    
    const subjectMap = {};
    subjects.forEach(s => subjectMap[s.id] = s.name);
    
    container.innerHTML = materials.map(material => {
        const subjectName = subjectMap[material.subject_id] || `Subject ${material.subject_id}`;
        const courseCode = subjectName.split(' ').map(w => w[0]).join('').toUpperCase() + '-' + (100 + material.subject_id);
        const fileType = material.file_url ? (material.file_url.includes('.pdf') ? 'PDF' : 'Video') : 'PDF';
        const fileSize = material.file_url ? (fileType === 'PDF' ? '2.4 MB' : '128 MB') : 'N/A';
        
        return `
            <div class="material-card">
                <div class="material-icon">
                    <i class="fas ${fileType === 'PDF' ? 'fa-file-pdf' : 'fa-video'}"></i>
                </div>
                <div class="material-content">
                    <div class="material-tags">
                        <span class="material-tag">${fileType}</span>
                        <span class="material-tag">${courseCode}</span>
                    </div>
                    <h3>${material.title}</h3>
                    <p>${material.description || 'No description'}</p>
                    <div class="material-meta">
                        Prof. Martinez • ${formatDateShort(material.date_uploaded)} • ${fileSize}
                    </div>
                </div>
                <div class="material-actions">
                    ${material.file_url ? `<button class="btn-secondary" onclick="window.open('${material.file_url}', '_blank')"><i class="fas fa-download"></i> Download</button>` : ''}
                    <button class="btn-danger" onclick="deleteMaterial(${material.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updateMaterialStats(materials) {
    const totalEl = document.getElementById('total-materials');
    const pdfsEl = document.getElementById('total-pdfs');
    const videosEl = document.getElementById('total-videos');
    const sizeEl = document.getElementById('total-size');
    
    if (totalEl) totalEl.textContent = materials.length;
    
    const pdfs = materials.filter(m => !m.file_url || m.file_url.includes('.pdf')).length;
    const videos = materials.length - pdfs;
    
    if (pdfsEl) pdfsEl.textContent = pdfs;
    if (videosEl) videosEl.textContent = videos;
    if (sizeEl) sizeEl.textContent = `${(materials.length * 65).toFixed(0)} MB`;
}

function openMaterialModal() {
    if (subjects.length === 0) {
        alert('Please create a subject first!');
        return;
    }
    
    const subjectOptions = subjects.map(s => {
        const courseCode = s.name.split(' ').map(w => w[0]).join('').toUpperCase() + '-' + (100 + s.id);
        return `<option value="${s.id}">${courseCode} - ${s.name}</option>`;
    }).join('');
    
    const content = `
        <form onsubmit="saveMaterial(event)">
            <div class="form-group">
                <label>Subject *</label>
                <select id="material-subject" required>
                    <option value="">Select a subject</option>
                    ${subjectOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Title *</label>
                <input type="text" id="material-title" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="material-description"></textarea>
            </div>
            <div class="form-group">
                <label>File URL</label>
                <input type="text" id="material-file-url" placeholder="https://example.com/file.pdf">
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary">Upload Material</button>
            </div>
        </form>
    `;
    
    openModal('Upload Material', content);
}

async function saveMaterial(event) {
    event.preventDefault();
    const subjectId = parseInt(document.getElementById('material-subject').value);
    const title = document.getElementById('material-title').value.trim();
    const description = document.getElementById('material-description').value.trim();
    const fileUrl = document.getElementById('material-file-url').value.trim();
    
    try {
        const response = await fetch(`${API_URL}/subject/${subjectId}/materials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, file_url: fileUrl })
        });
        
        if (response.ok) {
            closeModal();
            await loadMaterials();
            if (window.location.pathname === '/') {
                loadDashboardStats();
                loadLatestActivity();
            }
        } else {
            alert('Failed to upload material');
        }
    } catch (error) {
        console.error('Error saving material:', error);
        alert('Failed to upload material');
    }
}

async function deleteMaterial(id) {
    if (!confirm('Are you sure you want to delete this material?')) return;
    
    try {
        const response = await fetch(`${API_URL}/material/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadMaterials();
            if (window.location.pathname === '/') {
                loadDashboardStats();
                loadLatestActivity();
            }
        } else {
            alert('Failed to delete material');
        }
    } catch (error) {
        console.error('Error deleting material:', error);
        alert('Failed to delete material');
    }
}

// Assignment Functions
async function loadAssignments() {
    try {
        const response = await fetch(`${API_URL}/assignment`);
        const assignments = await response.json();
        renderAssignments(assignments);
        updateAssignmentStats(assignments);
    } catch (error) {
        console.error('Error loading assignments:', error);
    }
}

function renderAssignments(assignments) {
    const container = document.getElementById('assignments-container');
    if (!container) return;
    
    if (assignments.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard-list"></i><p>No assignments yet. Create your first assignment!</p></div>';
        return;
    }
    
    const subjectMap = {};
    subjects.forEach(s => subjectMap[s.id] = s.name);
    
    container.innerHTML = assignments.map(assignment => {
        const subjectName = subjectMap[assignment.subject_id] || `Subject ${assignment.subject_id}`;
        const courseCode = subjectName.split(' ').map(w => w[0]).join('').toUpperCase() + '-' + (100 + assignment.subject_id);
        const dueDate = new Date(assignment.due_date);
        const daysLeft = getDaysUntil(assignment.due_date);
        const isUrgent = daysLeft.includes('days') && parseInt(daysLeft) <= 3;
        const priority = isUrgent ? 'urgent' : (daysLeft.includes('days') && parseInt(daysLeft) <= 7 ? 'high' : 'medium');
        
        return `
            <div class="assignment-card">
                <div class="assignment-content">
                    <div class="assignment-header">
                        <span class="subject-code">${courseCode}</span>
                        <span class="priority-badge ${priority}">${priority.toUpperCase()}</span>
                    </div>
                    <h3>${assignment.title}</h3>
                    <p>${assignment.instructions || 'No instructions provided'}</p>
                    <div class="assignment-details">
                        <span><strong>Due Date:</strong> ${formatDateShort(assignment.due_date)}</span>
                        <span class="deadline-time">${daysLeft}</span>
                    </div>
                </div>
                <div class="assignment-actions">
                    <button class="btn-secondary" onclick="editAssignment(${assignment.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-danger" onclick="deleteAssignment(${assignment.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updateAssignmentStats(assignments) {
    const totalEl = document.getElementById('total-assignments');
    const urgentEl = document.getElementById('urgent-assignments');
    const dueWeekEl = document.getElementById('due-this-week');
    const activeEl = document.getElementById('active-assignments');
    
    if (totalEl) totalEl.textContent = assignments.length;
    if (activeEl) activeEl.textContent = assignments.length;
    
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const urgent = assignments.filter(a => {
        const due = new Date(a.due_date);
        const days = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
        return days <= 3 && days >= 0;
    }).length;
    
    const dueThisWeek = assignments.filter(a => {
        const due = new Date(a.due_date);
        return due <= weekFromNow && due >= now;
    }).length;
    
    if (urgentEl) urgentEl.textContent = urgent;
    if (dueWeekEl) dueWeekEl.textContent = dueThisWeek;
}

function openAssignmentModal(assignmentId = null) {
    if (subjects.length === 0) {
        alert('Please create a subject first!');
        return;
    }
    
    currentEditingId = assignmentId;
    const assignment = assignmentId ? null : null; // Would load assignment if editing
    
    const subjectOptions = subjects.map(s => {
        const courseCode = s.name.split(' ').map(w => w[0]).join('').toUpperCase() + '-' + (100 + s.id);
        return `<option value="${s.id}">${courseCode} - ${s.name}</option>`;
    }).join('');
    
    const content = `
        <form onsubmit="saveAssignment(event)">
            <div class="form-group">
                <label>Subject *</label>
                <select id="assignment-subject" required>
                    <option value="">Select a subject</option>
                    ${subjectOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Title *</label>
                <input type="text" id="assignment-title" required>
            </div>
            <div class="form-group">
                <label>Instructions</label>
                <textarea id="assignment-instructions"></textarea>
            </div>
            <div class="form-group">
                <label>Due Date *</label>
                <input type="date" id="assignment-due-date" required>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary">${assignmentId ? 'Update' : 'Create'} Assignment</button>
            </div>
        </form>
    `;
    
    openModal(assignmentId ? 'Edit Assignment' : 'Create Assignment', content);
}

async function saveAssignment(event) {
    event.preventDefault();
    const subjectId = parseInt(document.getElementById('assignment-subject').value);
    const title = document.getElementById('assignment-title').value.trim();
    const instructions = document.getElementById('assignment-instructions').value.trim();
    const dueDate = document.getElementById('assignment-due-date').value;
    
    try {
        const response = await fetch(`${API_URL}/subject/${subjectId}/assignments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, instructions, due_date: dueDate })
        });
        
        if (response.ok) {
            closeModal();
            await loadAssignments();
            if (window.location.pathname === '/') {
                loadDashboardStats();
                loadUpcomingDeadlines();
            }
        } else {
            alert('Failed to create assignment');
        }
    } catch (error) {
        console.error('Error saving assignment:', error);
        alert('Failed to create assignment');
    }
}

function editAssignment(id) {
    // Would load assignment data and open modal
    alert('Edit functionality coming soon!');
}

async function deleteAssignment(id) {
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    
    try {
        const response = await fetch(`${API_URL}/assignment/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadAssignments();
            if (window.location.pathname === '/') {
                loadDashboardStats();
                loadUpcomingDeadlines();
            }
        } else {
            alert('Failed to delete assignment');
        }
    } catch (error) {
        console.error('Error deleting assignment:', error);
        alert('Failed to delete assignment');
    }
}

// Reminder Functions
async function loadReminders() {
    try {
        const response = await fetch(`${API_URL}/reminder`);
        const reminders = await response.json();
        renderReminders(reminders);
        updateReminderStats(reminders);
    } catch (error) {
        console.error('Error loading reminders:', error);
    }
}

function renderReminders(reminders) {
    const container = document.getElementById('reminders-container');
    if (!container) return;
    
    if (reminders.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-alt"></i><p>No reminders yet. Create your first reminder!</p></div>';
        return;
    }
    
    const subjectMap = {};
    subjects.forEach(s => subjectMap[s.id] = s.name);
    
    // Sort by remind_at date
    reminders.sort((a, b) => new Date(a.remind_at) - new Date(b.remind_at));
    
    container.innerHTML = reminders.map(reminder => {
        const subjectName = subjectMap[reminder.subject_id] || `Subject ${reminder.subject_id}`;
        const courseCode = subjectName.split(' ').map(w => w[0]).join('').toUpperCase() + '-' + (100 + reminder.subject_id);
        const remindDate = new Date(reminder.remind_at);
        const daysUntil = getDaysUntil(reminder.remind_at);
        
        return `
            <div class="reminder-card">
                <div class="reminder-icon">
                    <i class="fas fa-bell"></i>
                </div>
                <div class="reminder-content">
                    <div class="reminder-header">
                        <span class="subject-code">${courseCode}</span>
                        <span class="reminder-status">UPCOMING</span>
                    </div>
                    <h3>${reminder.message}</h3>
                    <div class="reminder-details">
                        <span>${formatDateShort(reminder.remind_at)}</span>
                        <span>${remindDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>${daysUntil}</span>
                    </div>
                </div>
                <button class="reminder-delete" onclick="deleteReminder(${reminder.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');
}

function updateReminderStats(reminders) {
    const totalEl = document.getElementById('total-reminders');
    const weekEl = document.getElementById('this-week-reminders');
    const todayEl = document.getElementById('today-reminders');
    
    if (totalEl) totalEl.textContent = reminders.length;
    
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    const thisWeek = reminders.filter(r => {
        const remind = new Date(r.remind_at);
        return remind <= weekFromNow && remind >= now;
    }).length;
    
    const today = reminders.filter(r => {
        const remind = new Date(r.remind_at);
        return remind >= now && remind < todayEnd;
    }).length;
    
    if (weekEl) weekEl.textContent = thisWeek;
    if (todayEl) todayEl.textContent = today;
}

function openReminderModal() {
    if (subjects.length === 0) {
        alert('Please create a subject first!');
        return;
    }
    
    const subjectOptions = subjects.map(s => {
        const courseCode = s.name.split(' ').map(w => w[0]).join('').toUpperCase() + '-' + (100 + s.id);
        return `<option value="${s.id}">${courseCode} - ${s.name}</option>`;
    }).join('');
    
    const content = `
        <form onsubmit="saveReminder(event)">
            <div class="form-group">
                <label>Subject *</label>
                <select id="reminder-subject" required>
                    <option value="">Select a subject</option>
                    ${subjectOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Message *</label>
                <input type="text" id="reminder-message" required>
            </div>
            <div class="form-group">
                <label>Remind At *</label>
                <input type="datetime-local" id="reminder-date" required>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary">Create Reminder</button>
            </div>
        </form>
    `;
    
    openModal('New Reminder', content);
}

async function saveReminder(event) {
    event.preventDefault();
    const subjectId = parseInt(document.getElementById('reminder-subject').value);
    const message = document.getElementById('reminder-message').value.trim();
    const remindAt = document.getElementById('reminder-date').value;
    
    try {
        const response = await fetch(`${API_URL}/subject/${subjectId}/reminders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, remind_at: remindAt })
        });
        
        if (response.ok) {
            closeModal();
            await loadReminders();
            if (window.location.pathname === '/') {
                loadDashboardStats();
                loadUpcomingDeadlines();
            }
        } else {
            alert('Failed to create reminder');
        }
    } catch (error) {
        console.error('Error saving reminder:', error);
        alert('Failed to create reminder');
    }
}

async function deleteReminder(id) {
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    
    try {
        const response = await fetch(`${API_URL}/reminder/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadReminders();
            if (window.location.pathname === '/') {
                loadDashboardStats();
                loadUpcomingDeadlines();
            }
        } else {
            alert('Failed to delete reminder');
        }
    } catch (error) {
        console.error('Error deleting reminder:', error);
        alert('Failed to delete reminder');
    }
}

// Dashboard Functions
async function loadDashboardStats() {
    try {
        // Load all data for stats
        const [subjectsRes, announcementsRes, materialsRes, assignmentsRes] = await Promise.all([
            fetch(`${API_URL}/subject`),
            fetch(`${API_URL}/announcement`),
            fetch(`${API_URL}/material`),
            fetch(`${API_URL}/assignment`)
        ]);
        
        const subjectsData = await subjectsRes.json();
        const announcementsData = await announcementsRes.json();
        const materialsData = await materialsRes.json();
        const assignmentsData = await assignmentsRes.json();
        
        // Update stats
        const activeSubjectsEl = document.getElementById('stat-active-subjects');
        const announcementsEl = document.getElementById('stat-announcements');
        const materialsEl = document.getElementById('stat-materials');
        const assignmentsEl = document.getElementById('stat-assignments');
        
        if (activeSubjectsEl) activeSubjectsEl.textContent = subjectsData.length;
        if (announcementsEl) announcementsEl.textContent = announcementsData.length;
        if (materialsEl) materialsEl.textContent = materialsData.length;
        if (assignmentsEl) assignmentsEl.textContent = assignmentsData.length;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

async function loadLatestActivity() {
    try {
        const response = await fetch(`${API_URL}/feed/latest`);
        const feed = await response.json();
        
        // Sort by date
        feed.sort((a, b) => new Date(b.date_posted) - new Date(a.date_posted));
        
        const container = document.getElementById('latest-activity');
        if (!container) return;
        
        if (feed.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No recent activity</p></div>';
            return;
        }
        
        container.innerHTML = feed.slice(0, 5).map(item => {
            const icon = item.type === 'announcement' ? 'fa-bell' : 'fa-file-alt';
            const color = item.type === 'announcement' ? '#f39c12' : '#3498db';
            
            return `
                <div class="activity-item">
                    <i class="fas ${icon}" style="color: ${color};"></i>
                    <div class="activity-item-content">
                        <h4>${item.title}</h4>
                        <p>${getTimeAgo(item.date_posted)}</p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading latest activity:', error);
    }
}

async function loadUpcomingDeadlines() {
    try {
        const response = await fetch(`${API_URL}/feed/upcoming-deadlines`);
        const deadlines = await response.json();
        
        // Sort by due date
        deadlines.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        
        const container = document.getElementById('upcoming-deadlines');
        if (!container) return;
        
        const countEl = document.getElementById('deadline-count');
        if (countEl) countEl.textContent = `${deadlines.length} Active`;
        
        if (deadlines.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No upcoming deadlines</p></div>';
            return;
        }
        
        container.innerHTML = deadlines.slice(0, 5).map(item => {
            const daysLeft = getDaysUntil(item.due_date);
            const icon = item.type === 'assignment' ? 'fa-clipboard-list' : 'fa-bell';
            
            return `
                <div class="deadline-item">
                    <div class="deadline-item-content">
                        <h4>${item.title}</h4>
                        <p>Due: ${formatDateShort(item.due_date)}</p>
                    </div>
                    <div class="deadline-time">${daysLeft}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading upcoming deadlines:', error);
    }
}

// Initialize subjects on page load (needed for all pages)
document.addEventListener('DOMContentLoaded', async function() {
    await loadSubjects();
});

