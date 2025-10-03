import { createClient } from 'https://esm.sh/@supabase/supabase-js';

let supabase = null;

const loginForm = document.getElementById('staff-login-form');
const loginButton = document.getElementById('login-button');
const errorEl = document.getElementById('auth-error');

async function getSupabaseConfig() {
    try {
        if (typeof __supabase_url !== 'undefined') {
            return { url: __supabase_url, anonKey: __supabase_anon_key };
        }
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Failed to fetch config');
        return await response.json();
    } catch (error) {
        console.error("Initialization Error:", error);
        errorEl.textContent = 'App configuration error.';
        return null;
    }
}

async function handleLogin(event) {
    event.preventDefault();
    errorEl.textContent = '';
    loginButton.disabled = true;
    loginButton.textContent = 'Logging in...';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.user) throw new Error("Login failed, please try again.");

        // CRITICAL STEP: Verify user role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

        if (profileError) throw profileError;

        if (profile && profile.role === 'staff') {
            // Success! Redirect to the staff dashboard.
            window.location.href = '/staff.html';
        } else {
            // Not a staff member. Log them out immediately and show an error.
            await supabase.auth.signOut();
            throw new Error("Access Denied. Not a staff account.");
        }

    } catch (error) {
        console.error("Login error:", error.message);
        errorEl.textContent = error.message;
        loginButton.disabled = false;
        loginButton.textContent = 'Log In';
    }
}


async function init() {
    const config = await getSupabaseConfig();
    if (!config) return;
    supabase = createClient(config.url, config.anonKey);

    loginForm.addEventListener('submit', handleLogin);
    loginButton.addEventListener('click', handleLogin); // Allow click as well
}

document.addEventListener('DOMContentLoaded', init);
