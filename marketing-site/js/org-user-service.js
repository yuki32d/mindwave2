// ============================================
// USER PROFILE SERVICE - MongoDB Integration
// ============================================

class UserProfileService {
    constructor() {
        this.cache = null;
        this.lastFetch = null;
        this.refreshInterval = 30000; // 30 seconds
    }

    /**
     * Fetch user profile from MongoDB
     */
    async fetchProfile() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch('/api/user/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.ok) {
                this.cache = data.user;
                this.lastFetch = Date.now();
                return data.user;
            } else {
                throw new Error(data.message || 'Failed to fetch profile');
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw error;
        }
    }

    /**
     * Get user profile (uses cache if fresh)
     */
    async getProfile(forceRefresh = false) {
        const cacheAge = this.lastFetch ? Date.now() - this.lastFetch : Infinity;

        // Use cache if less than 30 seconds old and not forcing refresh
        if (!forceRefresh && this.cache && cacheAge < this.refreshInterval) {
            return this.cache;
        }

        return await this.fetchProfile();
    }

    /**
     * Update user profile in MongoDB
     */
    async updateProfile(profileData) {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.ok) {
                // Update cache with new data
                this.cache = data.user;
                this.lastFetch = Date.now();
                return data.user;
            } else {
                throw new Error(data.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }

    /**
     * Update profile UI with user data
     */
    updateProfileUI(user) {
        if (!user) return;

        // Update profile header
        const profileName = document.getElementById('profileName');
        if (profileName) {
            profileName.textContent = user.name || 'User';
        }

        const profileEmail = document.getElementById('profileEmail');
        if (profileEmail) {
            profileEmail.textContent = user.email || '';
        }

        const profileRole = document.getElementById('profileRole');
        if (profileRole) {
            const roleNames = {
                'owner': 'Organization Owner',
                'admin': 'Administrator',
                'faculty': 'Faculty',
                'student': 'Student'
            };
            profileRole.textContent = roleNames[user.orgRole] || user.orgRole || 'Member';
        }

        // Update form fields
        const fullName = document.getElementById('fullName');
        if (fullName) {
            fullName.value = user.name || '';
        }

        const emailAddress = document.getElementById('emailAddress');
        if (emailAddress) {
            emailAddress.value = user.email || '';
        }

        const phoneNumber = document.getElementById('phoneNumber');
        if (phoneNumber) {
            phoneNumber.value = user.phone || '';
        }

        const department = document.getElementById('department');
        if (department) {
            department.value = user.department || '';
        }

        const yearSemester = document.getElementById('yearSemester');
        if (yearSemester) {
            yearSemester.value = user.yearSemester || '';
        }

        const bio = document.getElementById('bio');
        if (bio) {
            bio.value = user.bio || '';
        }

        const displayName = document.getElementById('displayName');
        if (displayName) {
            displayName.value = user.displayName || user.name || '';
        }

        // Update organization info if available
        if (user.organizationId) {
            const orgName = document.getElementById('organizationName');
            if (orgName && user.organizationId.name) {
                orgName.textContent = user.organizationId.name;
            }

            const orgType = document.getElementById('organizationType');
            if (orgType && user.organizationId.type) {
                orgType.textContent = this.formatOrgType(user.organizationId.type);
            }
        }

        console.log('✓ Profile UI updated with MongoDB data');
    }

    /**
     * Format organization type
     */
    formatOrgType(type) {
        const typeMap = {
            'university': 'University',
            'school': 'School',
            'college': 'College',
            'training': 'Training Center',
            'corporate': 'Corporate'
        };
        return typeMap[type] || type;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache = null;
        this.lastFetch = null;
    }
}

// Create global instance
window.userProfileService = new UserProfileService();

console.log('✅ User Profile Service loaded');
