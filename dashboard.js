// Import the Supabase client library
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

// --- Supabase Initialization ---
let supabase = null;

// --- Core Functions ---

// Fetch the Supabase configuration from the serverless function
async function getSupabaseConfig() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to fetch config');
        }
        return await response.json();
    } catch (error) {
        console.error("Initialization Error:", error.message);
        document.body.innerHTML = `<div class="h-screen flex items-center justify-center text-center p-4">
            <div>
                <h1 class="text-2xl font-bold text-red-600">Application Error</h1>
                <p class="text-gray-600">Could not connect to the backend service. Please try again later.</p>
            </div>
        </div>`;
        return null;
    }
}

// Fetch user profile and preferences from Supabase
async function fetchUserData(user) {
    try {
        // Fetch profile and preferences in parallel
        const [profileRes, preferencesRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('preferences').select('*').eq('id', user.id).single()
        ]);

        if (profileRes.error) throw profileRes.error;
        if (preferencesRes.error) throw preferencesRes.error;

        return { profile: profileRes.data, preferences: preferencesRes.data };

    } catch (error) {
        console.error('Error fetching user data:', error);
        return { profile: null, preferences: null };
    }
}

// Populate the dashboard with the fetched data
function populateDashboard(userData) {
    if (!userData) return;

    // Populate user name
    const userNameEl = document.getElementById('user-name');
    if (userNameEl && userData.profile?.name) {
        userNameEl.textContent = userData.profile.name.split(' ')[0]; // Show first name
    } else {
        userNameEl.textContent = "User";
    }

    // Populate profile details
    const profileDetailsEl = document.getElementById('profile-details');
    if (profileDetailsEl && userData.profile) {
        profileDetailsEl.innerHTML = `
            <p><strong>Admission No:</strong> ${userData.profile.admission_number || 'N/A'}</p>
            <p><strong>Department:</strong> ${userData.profile.department || 'N/A'}</p>
            <p><strong>Semester:</strong> ${userData.profile.semester || 'N/A'}</p>
            <p><strong>Phone:</strong> ${userData.profile.phone || 'N/A'}</p>
        `;
    }

    // Populate diet preference
    const dietPreferenceEl = document.getElementById('diet-preference');
    if (dietPreferenceEl && userData.preferences) {
        dietPreferenceEl.innerHTML = `<p class="font-semibold text-lg text-green-700">${userData.preferences.diet || 'Not set'}</p>`;
    }

    // Populate menu items
    const menuItemsListEl = document.getElementById('menu-items-list');
    if (menuItemsListEl && userData.preferences?.menu_items?.length > 0) {
        menuItemsListEl.innerHTML = userData.preferences.menu_items
            .map(item => `<li>${item}</li>`)
            .join('');
    } else if (menuItemsListEl) {
        menuItemsListEl.innerHTML = `<li class="text-gray-400">No favorite items saved.</li>`;
    }

    // Populate recurring status
    const recurringStatusEl = document.getElementById('recurring-status');
    if (recurringStatusEl && userData.preferences) {
         const isRecurring = userData.preferences.is_recurring;
         recurringStatusEl.innerHTML = `
            <p class="font-semibold text-lg ${isRecurring ? 'text-blue-700' : 'text-gray-500'}">
                ${isRecurring ? 'Enabled' : 'Disabled'}
            </p>
         `;
    }
}


// --- App Initialization ---
async function initializeDashboard() {
    const config = await getSupabaseConfig();
    if (!config || !config.url || !config.anonKey) return;

    supabase = createClient(config.url, config.anonKey);

    // Check for active session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        // If no user is logged in, redirect to the login page
        window.location.replace('/');
        return;
    }

    // Fetch and display user data
    const userData = await fetchUserData(session.user);
    populateDashboard(userData);

    // Add event listener for logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.replace('/');
        });
    }
}

document.addEventListener('DOMContentLoaded', initializeDashboard);
