// Import the Supabase client library
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

// --- Supabase Initialization ---
let supabase = null;
let user = null;
let profileDataCache = null;

// --- App State and UI Logic ---
let currentStep = 1;
const totalSteps = 5; // 1:Auth, 2:Diet, 3:Menu, 4:Review, 5:Success
let isLoginMode = false;
const userPreferences = {
    diet: null,
    menu_items: [], // Use snake_case to match db table
    is_recurring: false // Use snake_case
};

// --- Core App Functions ---

function nextStep() {
    if (currentStep < totalSteps) {
        currentStep++;
        showStep(currentStep);
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

function toggleAuthMode(event) {
    event.preventDefault();
    isLoginMode = !isLoginMode;
    const signupFields = document.getElementById('signup-fields');
    const authButton = document.getElementById('auth-button');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const authToggleText = document.getElementById('auth-toggle-text');
    const authToggleLink = document.getElementById('auth-toggle-link');
    document.getElementById('auth-error').textContent = '';

    if (isLoginMode) {
        signupFields.style.display = 'none';
        authButton.textContent = 'Log In';
        authTitle.textContent = 'Welcome Back!';
        authSubtitle.textContent = 'Log in to access your account.';
        authToggleText.textContent = "Don't have an account? ";
        authToggleLink.textContent = 'Sign Up';
    } else {
        signupFields.style.display = 'block';
        authButton.textContent = 'Sign Up & Continue';
        authTitle.textContent = 'Create Your Profile';
        authSubtitle.textContent = "Let's get to know you.";
        authToggleText.textContent = 'Already have an account? ';
        authToggleLink.textContent = 'Log In';
    }
}

async function handleAuthAndProfile() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const authError = document.getElementById('auth-error');
    authError.textContent = ''; // Clear previous errors

    try {
        if (isLoginMode) {
            // --- LOGIN ---
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            console.log('Login successful', data);
            // onAuthStateChange will handle moving to the next step or redirecting
        } else {
            // --- SIGNUP ---
            const form = document.getElementById('profile-form');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            // Cache profile data before signup
            profileDataCache = {
                name: document.getElementById('name').value,
                phone: document.getElementById('phone').value,
                admission_number: document.getElementById('admission-number').value,
                department: document.getElementById('department').value,
                semester: document.getElementById('semester').value,
            };

            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;
            console.log('Signup successful', data);
            // onAuthStateChange will handle saving the profile and moving to the next step
        }
    } catch (error) {
        console.error('Authentication error:', error.message);
        authError.textContent = error.message;
    }
}

async function saveProfileData(userId) {
    if (!profileDataCache) return; // Only save if there's cached data from signup
    const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...profileDataCache });

    if (error) {
        console.error("Error saving profile: ", error);
    } else {
        console.log("Profile saved to Supabase.");
        profileDataCache = null; // Clear cache
    }
}

function selectPreference(preference) {
    userPreferences.diet = preference;
    document.querySelectorAll('.preference-card').forEach(card => card.classList.remove('selected'));

    if (preference === 'Vegetarian') document.getElementById('pref-veg').classList.add('selected');
    else if (preference === 'Non-Vegetarian') document.getElementById('pref-nonveg').classList.add('selected');
    else if (preference === 'Both') document.getElementById('pref-both').classList.add('selected');

    document.getElementById('step2-next').disabled = false;
}

function addMenuItem() {
    const input = document.getElementById('menu-item-input');
    const itemName = input.value.trim();
    if (itemName && !userPreferences.menu_items.includes(itemName)) {
        userPreferences.menu_items.push(itemName);
        renderMenuItems();
        input.value = '';
    }
}

function removeMenuItem(itemName) {
    userPreferences.menu_items = userPreferences.menu_items.filter(item => item !== itemName);
    renderMenuItems();
}

function prepareReview() {
    userPreferences.is_recurring = document.getElementById('recurring').checked;

    const reviewDiet = document.getElementById('review-diet');
    reviewDiet.innerHTML = `
        <div class="flex items-center">
            <div class="bg-green-100 p-2 rounded-lg mr-3"><svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5zm4-2h-2V7h2v5zm0 4h-2v-2h2v2z"></path></svg></div>
            <div><p class="font-semibold text-gray-800">Dietary Preference</p><p class="text-sm text-gray-500">${userPreferences.diet}</p></div>
        </div>
        <div class="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">✓</div>`;
    reviewDiet.className = 'p-4 rounded-xl flex items-center justify-between bg-green-50 border-2 border-green-200';

    const reviewMenu = document.getElementById('review-menu');
    let menuItemsHTML = userPreferences.menu_items.map(item => `<li class="ml-4 list-disc text-gray-600">${item}</li>`).join('');
    reviewMenu.innerHTML = `
        <div class="flex items-center"><div class="bg-orange-100 p-2 rounded-lg mr-3"><svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg></div>
        <div><p class="font-semibold text-gray-800">Menu Items</p></div></div>
        <ul class="mt-2 text-sm">${menuItemsHTML || '<li class="ml-4 text-gray-500">No favorite items added.</li>'}</ul>`;
    reviewMenu.className = 'p-4 rounded-xl bg-orange-50 border-2 border-orange-200';

    const reviewRecurring = document.getElementById('review-recurring');
    const recurringStatus = userPreferences.is_recurring;
    reviewRecurring.innerHTML = `
         <div class="flex items-center">
            <div class="bg-${recurringStatus ? 'green' : 'gray'}-100 p-2 rounded-lg mr-3"><svg class="w-5 h-5 text-${recurringStatus ? 'green' : 'gray'}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>
            <div><p class="font-semibold text-gray-800">Daily Recurring Menu</p><p class="text-sm text-gray-500">${recurringStatus ? 'Enabled' : 'Disabled'}</p></div>
        </div>
        <div class="bg-${recurringStatus ? 'green' : 'gray'}-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">✓</div>`;
    reviewRecurring.className = `p-4 rounded-xl flex items-center justify-between bg-${recurringStatus ? 'green' : 'gray'}-50 border-2 border-${recurringStatus ? 'green' : 'gray'}-200`;
}

async function finishOnboarding() {
    if (!user) {
        console.error("User not authenticated. Cannot save preferences.");
        return;
    }

    const { error } = await supabase
        .from('preferences')
        .upsert({ id: user.id, ...userPreferences });

    if (error) {
        console.error("Error writing preferences document: ", error);
    } else {
        console.log("Preferences saved to Supabase:", userPreferences);
        nextStep(); // Move to the success step
        // Redirect to dashboard after a short delay
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 2000);
    }
}

// --- UI Rendering and Progress ---

function updateProgressBar() {
    const userFacingSteps = totalSteps - 2; // Auth (1) and Success (5) are not part of the progress bar
    const currentProgressStep = currentStep - 1;
    const percentage = Math.min(Math.round((currentProgressStep / userFacingSteps) * 100), 100);
    document.getElementById('progress-bar').style.width = `${percentage}%`;
    document.getElementById('step-counter').innerText = `Step ${currentProgressStep} of ${userFacingSteps}`;
    document.getElementById('step-percentage').innerText = `${percentage}%`;

    if (currentStep > userFacingSteps + 1) { // After final commit
         document.getElementById('step-counter').innerText = `Complete!`;
         document.getElementById('step-percentage').innerText = `100%`;
    }
}

function showStep(stepNumber) {
    document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
    const newStep = document.getElementById(`step-${stepNumber}`);
    const progressContainer = document.getElementById('progress-container');

    if (newStep) {
        newStep.classList.add('active', 'step-transition');
        setTimeout(() => newStep.classList.remove('step-transition'), 500);
    }

    if (stepNumber > 1 && stepNumber < totalSteps) {
        progressContainer.classList.remove('hidden');
        updateProgressBar();
    } else {
        progressContainer.classList.add('hidden');
    }
}

function renderMenuItems() {
    const list = document.getElementById('menu-items-list');
    list.innerHTML = '';
    userPreferences.menu_items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'bg-gray-100 p-2 rounded-lg flex items-center justify-between text-sm';
        itemDiv.innerHTML = `
            <span class="text-gray-700">${item}</span>
            <button class="remove-item-btn text-red-500 hover:text-red-700" data-item="${item}">&times;</button>`;
        list.appendChild(itemDiv);
    });
}

// --- Event Listeners Setup ---

function addEventListeners() {
    document.getElementById('auth-button').addEventListener('click', handleAuthAndProfile);
    document.getElementById('auth-toggle-link').addEventListener('click', toggleAuthMode);

    document.getElementById('pref-veg').addEventListener('click', () => selectPreference('Vegetarian'));
    document.getElementById('pref-nonveg').addEventListener('click', () => selectPreference('Non-Vegetarian'));
    document.getElementById('pref-both').addEventListener('click', () => selectPreference('Both'));

    document.getElementById('step2-back').addEventListener('click', prevStep);
    document.getElementById('step2-next').addEventListener('click', nextStep);

    document.getElementById('add-item-btn').addEventListener('click', addMenuItem);
    document.getElementById('step3-back').addEventListener('click', prevStep);
    document.getElementById('step3-next').addEventListener('click', () => {
        prepareReview();
        nextStep();
    });

    document.getElementById('menu-items-list').addEventListener('click', (event) => {
        if (event.target && event.target.classList.contains('remove-item-btn')) {
            removeMenuItem(event.target.dataset.item);
        }
    });

    document.getElementById('commit-btn').addEventListener('click', finishOnboarding);
    document.getElementById('step4-back').addEventListener('click', prevStep);
}

// --- App Initialization ---

async function initializeApp() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to fetch config');
        }
        const config = await response.json();

        if (!config.url || !config.anonKey) {
            throw new Error("Supabase configuration is missing from the server.");
        }

        supabase = createClient(config.url, config.anonKey);

        // Setup event listeners now that supabase is initialized
        addEventListeners();
        // Start the main app logic
        initializeAppLogic();

    } catch (error) {
        console.error("Initialization Error:", error.message);
        const container = document.getElementById('onboarding-container');
        if(container) {
            container.innerHTML = `
                <div class="text-center p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    <h2 class="font-bold">Application Error</h2>
                    <p>Could not connect to the backend service. Please try again later.</p>
                </div>
            `;
        }
    }
}

async function initializeAppLogic() {
    supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session && session.user) {
            user = session.user;
            console.log("User authenticated:", user.id);

            if (profileDataCache) {
                await saveProfileData(user.id);
            }

            // If user is authenticated and on the first step, move them forward
            if (currentStep === 1) {
                nextStep();
            }
        } else {
            user = null;
            // If user logs out or session expires, show the login screen
            currentStep = 1;
            showStep(currentStep);
        }
    });

    const { data } = await supabase.auth.getSession();
    if (data.session && data.session.user) {
        user = data.session.user;
        console.log("Existing session found for user:", user.id);

        const { data: preferences } = await supabase.from('preferences').select('id').eq('id', user.id).single();
        if (preferences) {
             // If user has already completed onboarding, go to dashboard
             window.location.href = '/dashboard.html';
        } else {
            // Otherwise, start them at the diet preference step
            currentStep = 2;
            showStep(currentStep);
        }
    } else {
       // Show step 1 (auth) if no session
       showStep(currentStep);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);

