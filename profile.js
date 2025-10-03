import { createClient } from 'https://esm.sh/@supabase/supabase-js';

let supabase = null;
let user = null;
let menuData = [];

// --- UI Element References ---
const themeToggleBtn = document.getElementById('theme-toggle');
const logoutBtn = document.getElementById('logout-btn');
const morningSelect = document.getElementById('daily-morning-select');
const afternoonSelect = document.getElementById('daily-afternoon-select');
const eveningSelect = document.getElementById('daily-evening-select');
const saveDailyPrefsBtn = document.getElementById('save-daily-prefs-btn');

// --- Core Functions ---
async function getSupabaseConfig() {
    const SUPABASE_URL = "YOUR_SUPABASE_URL";
    const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
    if (SUPABASE_URL !== "YOUR_SUPABASE_URL" && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY") {
        return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
    }
    try {
        const response = await fetch('/api/config');
        if (!response.ok) { throw new Error('Failed to fetch config'); }
        return await response.json();
    } catch (error) {
        console.error("Configuration Error:", error);
        document.getElementById('app-container').innerHTML = `<div class="p-4 text-center text-red-500">Could not connect to backend.</div>`;
        return null;
    }
}

async function fetchPageData(user) {
    try {
        const [profileRes, preferencesRes, menuRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('preferences').select('*').eq('id', user.id).single(),
            supabase.from('menu_items').select('name').order('id')
        ]);

        if (preferencesRes.error && preferencesRes.error.code === 'PGRST116') {
            window.location.replace('/');
            return null;
        }
        if (profileRes.error) throw profileRes.error;
        if (preferencesRes.error) throw preferencesRes.error;
        if (menuRes.error) throw menuRes.error;

        menuData = menuRes.data;
        return { profile: profileRes.data, preferences: preferencesRes.data };
    } catch (error) {
         if (error.code !== 'PGRST116') { console.error('Error fetching page data:', error); }
        return null;
    }
}

function populateProfilePage(userData) {
    if (!userData) return;
    const { profile, preferences } = userData;

    if (profile) {
        const initial = profile.name ? profile.name.charAt(0).toUpperCase() : '?';
        document.getElementById('user-initial-profile').textContent = initial;
        document.getElementById('user-name-profile').textContent = profile.name || 'N/A';
        document.getElementById('user-email-profile').textContent = user?.email || 'N/A';
        document.getElementById('profile-details').innerHTML = `<p><strong>Admission No:</strong> ${profile.admission_number || 'N/A'}</p><p><strong>Department:</strong> ${profile.department || 'N/A'}</p><p><strong>Semester:</strong> ${profile.semester || 'N/A'}</p><p><strong>Phone:</strong> ${profile.phone || 'N/A'}</p>`;
    }
    if (preferences) {
        document.getElementById('diet-preference').innerHTML = `<p>${preferences.diet || 'Not set'}</p>`;
        if (preferences.daily_morning) morningSelect.value = preferences.daily_morning;
        if (preferences.daily_afternoon) afternoonSelect.value = preferences.daily_afternoon;
        if (preferences.daily_evening) eveningSelect.value = preferences.daily_evening;
    }
}

function populateDailyMenuDropdowns() {
    const selects = [morningSelect, afternoonSelect, eveningSelect];
    const defaultOption = '<option value="">None</option>';
    const menuOptions = menuData.map(item => `<option value="${item.name}">${item.name}</option>`).join('');

    selects.forEach(select => {
        select.innerHTML = defaultOption + menuOptions;
    });
}

async function saveDailyPreferences() {
    saveDailyPrefsBtn.disabled = true;
    saveDailyPrefsBtn.textContent = 'Saving...';

    const updates = {
        daily_morning: morningSelect.value || null,
        daily_afternoon: afternoonSelect.value || null,
        daily_evening: eveningSelect.value || null,
    };

    const { error } = await supabase.from('preferences').update(updates).eq('id', user.id);

    if (error) {
        console.error("Error saving daily preferences:", error);
        alert("Could not save your preferences.");
    } else {
        saveDailyPrefsBtn.textContent = 'Saved!';
        setTimeout(() => { saveDailyPrefsBtn.textContent = 'Save Daily Preferences'; }, 2000);
    }
    saveDailyPrefsBtn.disabled = false;
}

// --- App Initialization ---
async function initializeProfilePage() {
    const isDarkMode = localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDarkMode) document.documentElement.classList.add('dark');
    themeToggleBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });

    const config = await getSupabaseConfig();
    if (!config) return;
    supabase = createClient(config.url, config.anonKey);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.replace('/'); return; }
    user = session.user;

    const userData = await fetchPageData(user);
    populateDailyMenuDropdowns(); // Populate dropdowns with menu data
    populateProfilePage(userData); // Populate the rest of the page, including setting selected values

    saveDailyPrefsBtn.addEventListener('click', saveDailyPreferences);
    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.replace('/');
    });
}

document.addEventListener('DOMContentLoaded', initializeProfilePage);
