import { authService } from './auth.js';
import { dbService } from './database.js';
import { renderAnalyticsCharts, renderLecturerCharts, destroyCharts } from './charts.js';
import { audio } from './audio.js';

// Secure HTML escaping helper
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Global Application State Variables
let currentUser = null;
let currentRole = 'student'; // 'student' or 'lecturer'
let activeQuiz = null;
let currentQuestionIndex = 0;
let userSelectedOption = null;
let userSelections = [];
let quizQuestions = [];
let quizTimer = null;
let questionTimeLimit = 30;
let quizTimeLeft = 30;
let quizScore = 0;
let unsubscribeLeaderboard = null;
let currentLeaderboardScope = 'quiz';
let activeQuizIdForLeaderboard = '';
let currentLeaderboardEntries = [];

// Lecturer results list sorting state
let lecturerResults = [];
let lecturerSortField = 'rank';
let lecturerSortDirection = 1; // 1 = Ascending, -1 = Descending

// Screen Elements mapping
const screens = {
  auth: document.getElementById('auth-view'),
  dashboard: document.getElementById('dashboard-view'),
  createQuiz: document.getElementById('create-quiz-view'),
  quizPlay: document.getElementById('quiz-play-view'),
  results: document.getElementById('results-view'),
  leaderboard: document.getElementById('leaderboard-view'),
  lecturerResults: document.getElementById('lecturer-results-view'),
  profile: document.getElementById('profile-view')
};

// Global Bootstrapper
document.addEventListener('DOMContentLoaded', () => {
  setupAppRouting();
  setupAudioControl();
  setupThemeControl();
  setupAuthHandlers();
  setupRegisterWizard();
  setupDashboardControls();
  setupCreateQuizStudio();
  setupGameplayActions();
  setupLeaderboardToggles();
  setupLecturerResultsHandlers();
  setupMobileDrawer();

  // Initialize application state
  bootstrapAppState();
});

// Sync visual indicators of the active theme
function setupThemeControl() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');

  if (!themeToggleBtn || !themeIcon) return;

  // Restore saved theme or default to Dark Mode
  const savedTheme = localStorage.getItem('bq_theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    themeIcon.className = "fa-solid fa-sun text-amber-500";
  } else {
    document.body.classList.remove('light-theme');
    themeIcon.className = "fa-solid fa-moon text-neonCyan";
  }

  themeToggleBtn.addEventListener('click', () => {
    audio.playClick();
    const isLight = document.body.classList.toggle('light-theme');
    if (isLight) {
      localStorage.setItem('bq_theme', 'light');
      themeIcon.className = "fa-solid fa-sun text-amber-500";
      showToast("Premium Light Theme Active", true);
    } else {
      localStorage.setItem('bq_theme', 'dark');
      themeIcon.className = "fa-solid fa-moon text-neonCyan";
      showToast("Deep Space Dark Theme Active", true);
    }
    // Redraw charts to update color schemes
    triggerChartRedraws();
  });
}

function triggerChartRedraws() {
  if (isCurrentView('profile')) {
    loadProfileView();
  } else if (isCurrentView('dashboard') && currentRole === 'lecturer') {
    syncUserDashboardStats();
  }
}

// Onboarding Registration Step-by-Step wizard
let registerActiveStep = 1;
let registerSelectedRole = 'student';

function setupRegisterWizard() {
  const next1 = document.getElementById('btn-reg-next-1');
  const next2 = document.getElementById('btn-reg-next-2');
  const back1 = document.getElementById('btn-reg-back-1');
  const back2 = document.getElementById('btn-reg-back-2');

  const step1 = document.getElementById('reg-step-container-1');
  const step2 = document.getElementById('reg-step-container-2');
  const step3 = document.getElementById('reg-step-container-3');

  const label = document.getElementById('reg-step-label');
  const dot1 = document.getElementById('step-dot-1');
  const dot2 = document.getElementById('step-dot-2');
  const dot3 = document.getElementById('step-dot-3');

  const roleStudentCard = document.getElementById('role-card-student');
  const roleLecturerCard = document.getElementById('role-card-lecturer');

  const updateWizardUI = () => {
    label.textContent = `STEP ${registerActiveStep} of 3`;
    
    // Manage dots colors
    dot1.className = registerActiveStep >= 1 ? "w-2.5 h-2.5 rounded-full bg-neonPink shadow-neon-pink" : "w-2.5 h-2.5 rounded-full bg-gray-700";
    dot2.className = registerActiveStep >= 2 ? "w-2.5 h-2.5 rounded-full bg-neonPink shadow-neon-pink" : "w-2.5 h-2.5 rounded-full bg-gray-700";
    dot3.className = registerActiveStep >= 3 ? "w-2.5 h-2.5 rounded-full bg-neonPink shadow-neon-pink" : "w-2.5 h-2.5 rounded-full bg-gray-700";

    // Manage containers visibility
    step1.classList.add('hidden');
    step2.classList.add('hidden');
    step3.classList.add('hidden');

    if (registerActiveStep === 1) {
      step1.classList.remove('hidden');
      step1.classList.add('fade-in-step');
    } else if (registerActiveStep === 2) {
      step2.classList.remove('hidden');
      step2.classList.add('fade-in-step');
    } else if (registerActiveStep === 3) {
      step3.classList.remove('hidden');
      step3.classList.add('fade-in-step');
    }
  };

  if (next1) {
    next1.addEventListener('click', () => {
      audio.playClick();
      const username = document.getElementById('register-username').value.trim();
      const email = document.getElementById('register-email').value.trim();

      if (!username || !email) {
        showToast("Please enter a username and email.", false);
        return;
      }
      registerActiveStep = 2;
      updateWizardUI();
    });
  }

  if (next2) {
    next2.addEventListener('click', () => {
      audio.playClick();
      const pass = document.getElementById('register-password').value.trim();
      const confirm = document.getElementById('register-confirm-password').value.trim();

      if (!pass || pass.length < 6) {
        showToast("Password must be at least 6 characters.", false);
        return;
      }
      if (pass !== confirm) {
        showToast("Passwords do not match.", false);
        return;
      }
      registerActiveStep = 3;
      updateWizardUI();
    });
  }

  if (back1) {
    back1.addEventListener('click', () => {
      audio.playClick();
      registerActiveStep = 1;
      updateWizardUI();
    });
  }

  if (back2) {
    back2.addEventListener('click', () => {
      audio.playClick();
      registerActiveStep = 2;
      updateWizardUI();
    });
  }

  if (roleStudentCard && roleLecturerCard) {
    roleStudentCard.addEventListener('click', () => {
      audio.playClick();
      registerSelectedRole = 'student';
      roleStudentCard.className = "border-2 border-neonCyan bg-neonCyan/5 p-4 rounded-2xl cursor-pointer hover:bg-neonCyan/10 transition-all text-center flex flex-col items-center space-y-2";
      roleLecturerCard.className = "border border-glassBorder bg-gray-950/40 p-4 rounded-2xl cursor-pointer hover:border-neonPurple/40 hover:bg-neonPurple/5 transition-all text-center flex flex-col items-center space-y-2";
    });

    roleLecturerCard.addEventListener('click', () => {
      audio.playClick();
      registerSelectedRole = 'lecturer';
      roleLecturerCard.className = "border-2 border-neonPurple bg-neonPurple/5 p-4 rounded-2xl cursor-pointer hover:bg-neonPurple/10 transition-all text-center flex flex-col items-center space-y-2";
      roleStudentCard.className = "border border-glassBorder bg-gray-950/40 p-4 rounded-2xl cursor-pointer hover:border-neonCyan/40 hover:bg-neonCyan/5 transition-all text-center flex flex-col items-center space-y-2";
    });
  }
}

// Mobile drawer control
function setupMobileDrawer() {
  const toggle = document.getElementById('hamburger-toggle');
  const drawer = document.getElementById('mobile-drawer');
  const close = document.getElementById('drawer-close');
  const overlay = document.getElementById('drawer-overlay');

  if (toggle && drawer && close && overlay) {
    toggle.addEventListener('click', () => {
      audio.playClick();
      drawer.classList.remove('translate-x-full');
    });

    const closeDrawer = () => {
      drawer.classList.add('translate-x-full');
    };

    close.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    // Close on navigation button click
    drawer.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', closeDrawer);
    });
  }
}

// Bootstrap user states
function bootstrapAppState() {
  authService.init();
  dbService.init();

  authService.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;

      // Restore user role from localStorage, defaulting to student
      const storedRole = localStorage.getItem(`bq_user_role_${user.uid}`);
      currentRole = storedRole || 'student';

      adaptNavigationForRole(currentRole);
      updateUserNavHeader(user);
      await syncUserDashboardStats();

      if (isCurrentView('auth')) {
        switchView('dashboard');
      }
    } else {
      currentUser = null;
      updateUserNavHeader(null);
      switchView('auth');
    }
  });
}

// Adapt view visibility and navigation bars depending on role
function adaptNavigationForRole(role) {
  const createNav = document.getElementById('nav-create');
  const resultsNav = document.getElementById('nav-results');
  const mobCreate = document.getElementById('mob-create');
  const mobResults = document.getElementById('mob-results');

  const roleBadge = document.getElementById('dash-role-badge');
  const roleToggleBtn = document.getElementById('btn-toggle-role');
  const roleToggleText = document.getElementById('role-toggle-text');

  const studentSection = document.getElementById('student-dashboard-section');
  const lecturerSection = document.getElementById('lecturer-dashboard-section');

  const searchNav = document.getElementById('nav-search');
  const mobSearchNav = document.getElementById('mob-search');

  if (role === 'lecturer') {
    if (createNav) createNav.classList.remove('hidden');
    if (resultsNav) resultsNav.classList.remove('hidden');
    if (mobCreate) mobCreate.classList.remove('hidden');
    if (mobResults) mobResults.classList.remove('hidden');

    if (searchNav) searchNav.classList.add('hidden');
    if (mobSearchNav) mobSearchNav.classList.add('hidden');

    if (roleBadge) {
      roleBadge.textContent = "Lecturer Command Center";
      roleBadge.className = "inline-block px-3 py-1 bg-neonPurple/20 border border-neonPurple/30 text-neonPurple rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 text-glow-purple";
    }
    if (roleToggleText) roleToggleText.textContent = "Switch to Student";
    
    if (studentSection) studentSection.classList.add('hidden');
    if (lecturerSection) lecturerSection.classList.remove('hidden');
  } else {
    // Student
    if (createNav) createNav.classList.add('hidden');
    if (resultsNav) resultsNav.classList.add('hidden');
    if (mobCreate) mobCreate.classList.add('hidden');
    if (mobResults) mobResults.classList.add('hidden');

    if (searchNav) searchNav.classList.remove('hidden');
    if (mobSearchNav) mobSearchNav.classList.remove('hidden');

    if (roleBadge) {
      roleBadge.textContent = "Student Console";
      roleBadge.className = "inline-block px-3 py-1 bg-neonCyan/20 border border-neonCyan/30 text-neonCyan rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 text-glow-cyan";
    }
    if (roleToggleText) roleToggleText.textContent = "Switch to Lecturer";

    if (studentSection) studentSection.classList.remove('hidden');
    if (lecturerSection) lecturerSection.classList.add('hidden');
  }

  // Update profile roles too
  const profRoleBadge = document.getElementById('prof-role-badge');
  if (profRoleBadge) {
    if (role === 'lecturer') {
      profRoleBadge.textContent = "Certified Instructor";
      profRoleBadge.className = "inline-block mt-3 px-3 py-1 bg-neonPurple/15 border border-neonPurple/30 text-neonPurple rounded-full text-xs font-bold uppercase tracking-wider text-glow-purple";
    } else {
      profRoleBadge.textContent = "Active Competitor";
      profRoleBadge.className = "inline-block mt-3 px-3 py-1 bg-neonCyan/15 border border-neonCyan/30 text-neonCyan rounded-full text-xs font-bold uppercase tracking-wider text-glow-cyan";
    }
  }
}

// -------------------------------------------------------------
// Core SPA Routing & View Management
// -------------------------------------------------------------
function switchView(targetKey, isSearchNav = false) {
  if (unsubscribeLeaderboard) {
    unsubscribeLeaderboard();
    unsubscribeLeaderboard = null;
  }

  // Clear running timers
  if (quizTimer) {
    clearInterval(quizTimer);
    quizTimer = null;
  }

  // Hide all screens
  Object.keys(screens).forEach(key => {
    if (screens[key]) screens[key].classList.add('hidden');
  });

  // Show active screen
  if (screens[targetKey]) {
    screens[targetKey].classList.remove('hidden');
  }

  // Handle active navigation classes
  updateActiveNavTab(isSearchNav ? 'search' : targetKey);

  // Trigger special view lifecycles
  if (targetKey === 'profile') {
    loadProfileView();
  } else if (targetKey === 'leaderboard') {
    loadLeaderboardView();
  } else if (targetKey === 'dashboard') {
    syncUserDashboardStats();
  } else if (targetKey === 'lecturerResults') {
    loadLecturerResultsPage();
  }
}

function isCurrentView(key) {
  return screens[key] && !screens[key].classList.contains('hidden');
}

function setupAppRouting() {
  const binds = [
    { el: document.getElementById('brand-logo'), target: 'dashboard' },
    { el: document.getElementById('nav-dashboard'), target: 'dashboard' },
    { el: document.getElementById('mob-dashboard'), target: 'dashboard' },
    { el: document.getElementById('nav-search'), target: 'leaderboard', focusSearch: true },
    { el: document.getElementById('mob-search'), target: 'leaderboard', focusSearch: true },
    { el: document.getElementById('nav-create'), target: 'createQuiz' },
    { el: document.getElementById('mob-create'), target: 'createQuiz' },
    { el: document.getElementById('nav-results'), target: 'lecturerResults' },
    { el: document.getElementById('mob-results'), target: 'lecturerResults' },
    { el: document.getElementById('nav-leaderboard'), target: 'leaderboard' },
    { el: document.getElementById('mob-leaderboard'), target: 'leaderboard' },
    { el: document.getElementById('nav-profile'), target: 'profile' },
    { el: document.getElementById('mob-profile'), target: 'profile' }
  ];

  binds.forEach(bind => {
    if (bind.el) {
      bind.el.addEventListener('click', (e) => {
        e.preventDefault();
        audio.playClick();
        if (!currentUser) {
          switchView('auth');
        } else {
          switchView(bind.target, bind.focusSearch);
          if (bind.focusSearch) {
            const searchInput = document.getElementById('lead-player-name-input');
            if (searchInput) {
              setTimeout(() => {
                searchInput.focus();
                searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                searchInput.classList.add('ring-2', 'ring-neonPink', 'shadow-neon-pink');
                setTimeout(() => {
                  searchInput.classList.remove('ring-2', 'ring-neonPink', 'shadow-neon-pink');
                }, 2000);
              }, 150);
            }
          }
        }
      });
    }
  });
}

function updateActiveNavTab(activeKey) {
  const tabs = {
    dashboard: document.getElementById('nav-dashboard'),
    search: document.getElementById('nav-search'),
    createQuiz: document.getElementById('nav-create'),
    lecturerResults: document.getElementById('nav-results'),
    leaderboard: document.getElementById('nav-leaderboard'),
    profile: document.getElementById('nav-profile')
  };

  const mobTabs = {
    dashboard: document.getElementById('mob-dashboard'),
    search: document.getElementById('mob-search'),
    createQuiz: document.getElementById('mob-create'),
    lecturerResults: document.getElementById('mob-results'),
    leaderboard: document.getElementById('mob-leaderboard'),
    profile: document.getElementById('mob-profile')
  };

  const isLight = document.body.classList.contains('light-theme');

  Object.keys(tabs).forEach(key => {
    const tab = tabs[key];
    if (!tab) return;

    if (key === activeKey) {
      tab.className = isLight 
        ? "px-4 py-2 rounded-lg text-sm font-semibold text-neonCyan bg-gray-200/50 border border-neonCyan/30 transition-all duration-200"
        : "px-4 py-2 rounded-lg text-sm font-semibold text-neonCyan bg-white/5 border border-neonCyan/20 text-glow-cyan shadow-neon-cyan/10 transition-all duration-200";
    } else {
      tab.className = "px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200";
    }
  });

  // Mobile
  Object.keys(mobTabs).forEach(key => {
    const tab = mobTabs[key];
    if (!tab) return;

    if (key === activeKey) {
      tab.className = "flex items-center px-4 py-3 rounded-xl text-sm font-bold text-neonCyan bg-white/5 border border-neonCyan/20";
    } else {
      tab.className = "flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5";
    }
  });
}

// -------------------------------------------------------------
// Authentication Section (Login / Sign Up)
// -------------------------------------------------------------
function setupAuthHandlers() {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('login-form');
  const formRegister = document.getElementById('register-form');

  const toggleLoginPass = document.getElementById('toggle-login-pass');
  const toggleRegPass = document.getElementById('toggle-reg-pass');
  const loginPassInput = document.getElementById('login-password');
  const regPassInput = document.getElementById('register-password');

  const forgotPassLink = document.getElementById('login-forgot-pass');

  if (tabLogin && tabRegister && formLogin && formRegister) {
    tabLogin.addEventListener('click', () => {
      audio.playClick();
      tabLogin.className = "flex-1 pb-4 text-center font-display font-semibold text-lg text-white border-b-2 border-neonCyan text-glow-cyan transition-all duration-300";
      tabRegister.className = "flex-1 pb-4 text-center font-display font-semibold text-lg text-gray-400 border-b-2 border-transparent hover:text-white transition-all duration-300";
      formLogin.classList.remove('hidden');
      formRegister.classList.add('hidden');
    });

    tabRegister.addEventListener('click', () => {
      audio.playClick();
      tabRegister.className = "flex-1 pb-4 text-center font-display font-semibold text-lg text-white border-b-2 border-neonPink text-glow-pink transition-all duration-300";
      tabLogin.className = "flex-1 pb-4 text-center font-display font-semibold text-lg text-gray-400 border-b-2 border-transparent hover:text-white transition-all duration-300";
      formRegister.classList.remove('hidden');
      formLogin.classList.add('hidden');
      
      // Reset Wizard state to Step 1
      registerActiveStep = 1;
      const step1 = document.getElementById('reg-step-container-1');
      const step2 = document.getElementById('reg-step-container-2');
      const step3 = document.getElementById('reg-step-container-3');
      step1.classList.remove('hidden');
      step2.classList.add('hidden');
      step3.classList.add('hidden');
      document.getElementById('reg-step-label').textContent = "STEP 1 of 3";
    });
  }

  // Show/Hide password toggles
  if (toggleLoginPass && loginPassInput) {
    toggleLoginPass.addEventListener('click', () => {
      audio.playClick();
      const type = loginPassInput.getAttribute('type') === 'password' ? 'text' : 'password';
      loginPassInput.setAttribute('type', type);
      toggleLoginPass.classList.toggle('fa-eye');
      toggleLoginPass.classList.toggle('fa-eye-slash');
    });
  }

  if (toggleRegPass && regPassInput) {
    toggleRegPass.addEventListener('click', () => {
      audio.playClick();
      const type = regPassInput.getAttribute('type') === 'password' ? 'text' : 'password';
      regPassInput.setAttribute('type', type);
      toggleRegPass.classList.toggle('fa-eye');
      toggleRegPass.classList.toggle('fa-eye-slash');
    });
  }

  // Forgot password placeholder alert
  if (forgotPassLink) {
    forgotPassLink.addEventListener('click', (e) => {
      e.preventDefault();
      audio.playClick();
      showToast("Password reset emails require verification servers. Contact your system admin.", false);
    });
  }

  // Handle Login submission
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      audio.playClick();
      const email = document.getElementById('login-email').value.trim();
      const pass = loginPassInput.value.trim();

      const submitBtn = formLogin.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch animate-spin mr-2"></i>Accessing Deck...`;

      try {
        const user = await authService.login(email, pass);
        // Load stored role or default
        const storedRole = localStorage.getItem(`bq_user_role_${user.uid}`) || 'student';
        currentRole = storedRole;
        adaptNavigationForRole(currentRole);
        showToast("Console Access Granted. Welcome!", true);
      } catch (err) {
        showToast(err.message, false);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Access Control Deck</span><i class="fa-solid fa-arrow-right-to-bracket"></i>`;
      }
    });
  }

  // Handle Registration wizard submission
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      audio.playClick();
      const username = document.getElementById('register-username').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const pass = regPassInput.value.trim();

      const submitBtn = formRegister.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch animate-spin mr-2"></i>Deploying...`;

      try {
        const user = await authService.register(email, pass, username);
        // Persist selected role
        localStorage.setItem(`bq_user_role_${user.uid}`, registerSelectedRole);
        currentRole = registerSelectedRole;
        adaptNavigationForRole(currentRole);
        showToast("Profile Created Successfully!", true);
      } catch (err) {
        showToast(err.message, false);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Deploy Profile</span><i class="fa-solid fa-user-plus"></i>`;
      }
    });
  }
}

function updateUserNavHeader(user) {
  const container = document.getElementById('user-nav-status');
  if (!container) return;

  if (user) {
    container.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="hidden sm:flex flex-col text-right">
          <span class="text-sm font-bold text-white tracking-wide">${user.displayName || 'Explorer'}</span>
          <span class="text-[10px] text-gray-500 font-semibold uppercase">${currentRole === 'lecturer' ? 'Lecturer' : 'Student'} Profile</span>
        </div>
        <button id="btn-logout" class="w-10 h-10 rounded-lg flex items-center justify-center bg-rose-950/20 border border-rose-900/30 text-rose-400 hover:text-white hover:bg-rose-950/40 transition-all duration-200" title="Sign Out">
          <i class="fa-solid fa-sign-out-alt"></i>
        </button>
      </div>
    `;

    document.getElementById('btn-logout').addEventListener('click', () => {
      audio.playClick();
      authService.logout();
      showToast("Logged out of console.", true);
    });
  } else {
    container.innerHTML = `
      <button id="btn-nav-login" class="px-4 py-2 border border-glassBorder rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:border-neonCyan transition-all duration-200">
        <i class="fa-solid fa-lock mr-2"></i>Console Locked
      </button>
    `;
  }
}

// -------------------------------------------------------------
// Dashboard Operations & Stats Synchronization
// -------------------------------------------------------------
async function syncUserDashboardStats() {
  if (!currentUser) return;

  const welcomeText = document.getElementById('dash-username');
  if (welcomeText) welcomeText.textContent = currentUser.displayName || 'Explorer';

  try {
    const profile = await authService.getUserProfile(currentUser.uid);
    const attempts = await dbService.getUserAttempts(currentUser.uid);

    // Sync Student dashboard stats
    if (currentRole === 'student') {
      document.getElementById('dash-quizzes-count').textContent = attempts.length || 0;
      
      const totalScore = profile ? (profile.totalScore || 0) : 0;
      document.getElementById('dash-total-score').textContent = totalScore;

      // Find best score percentage
      let bestScorePct = 0;
      attempts.forEach(att => {
        if (att.percentage > bestScorePct) bestScorePct = att.percentage;
      });
      document.getElementById('dash-student-best-score').textContent = `${bestScorePct}%`;

      // Determine rank tier
      let rankText = "Novice";
      if (totalScore >= 1000) rankText = "Elite Platinum";
      else if (totalScore >= 500) rankText = "Master Gold";
      else if (totalScore >= 200) rankText = "Expert Silver";
      else if (totalScore >= 50) rankText = "Skilled Bronze";
      
      document.getElementById('dash-student-rank-badge').textContent = rankText;
    }

    // Sync Lecturer dashboard stats
    if (currentRole === 'lecturer') {
      // 1. Fetch all quizzes
      const allQuizzes = await dbService.getAllQuizzes();
      // 2. Filter quizzes created by this lecturer
      const lecturerQuizzes = allQuizzes.filter(q => q.creator && (q.creator._id === currentUser.uid || q.creator.id === currentUser.uid || q.creator.username === currentUser.displayName));
      document.getElementById('lecturer-stat-quizzes').textContent = lecturerQuizzes.length;

      // 3. For each quiz, query its scores to calculate participants and average
      let totalParticipantsCount = 0;
      let totalClassScoresSum = 0;
      let allAttemptsCombined = [];
      const uniqueStudentNames = new Set();
      let activeSessionsCount = 0;

      for (const quiz of lecturerQuizzes) {
        try {
          const res = await fetch(`http://localhost:5000/api/leaderboard/${quiz.code}`);
          if (res.ok) {
            const quizAttempts = await res.json();
            if (quizAttempts && quizAttempts.length > 0) {
              activeSessionsCount++;
              totalParticipantsCount += quizAttempts.length;

              quizAttempts.forEach(att => {
                uniqueStudentNames.add(att.username);
                const scoreVal = parseInt(att.score) || 0;
                const totalQ = parseInt(att.totalQuestions) || 5;
                const pct = Math.round((scoreVal / totalQ) * 100);
                totalClassScoresSum += pct;

                allAttemptsCombined.push({
                  username: att.username,
                  percentage: pct,
                  timestamp: att.createdAt || new Date().toISOString()
                });
              });
            }
          }
        } catch (e) {
          console.error(`Failed to sync leaderboard for quiz ${quiz.code}:`, e);
        }
      }

      document.getElementById('lecturer-stat-students').textContent = uniqueStudentNames.size;
      
      const avgClassScore = totalParticipantsCount > 0 ? Math.round(totalClassScoresSum / totalParticipantsCount) : 0;
      document.getElementById('lecturer-stat-avg-score').textContent = `${avgClassScore}%`;
      document.getElementById('lecturer-stat-active-sessions').textContent = activeSessionsCount;

      // Draw lecturer charts
      renderLecturerCharts(allAttemptsCombined);
    }

    // Load global champions leaderboard
    const globalChamps = await dbService.getGlobalLeaderboard();
    const champsList = document.getElementById('global-champs-list');
    if (champsList) {
      if (globalChamps.length === 0) {
        champsList.innerHTML = `<p class="text-xs text-gray-500 text-center py-4">No global champions logged yet.</p>`;
      } else {
        champsList.innerHTML = globalChamps.slice(0, 3).map((u, index) => {
          let rankIcon = `<span class="text-gray-500 font-bold text-sm w-5 text-center">${index + 1}</span>`;
          let rankColor = "text-gray-300";
          if (index === 0) {
            rankIcon = `<i class="fa-solid fa-crown text-neonYellow shadow-neon-yellow"></i>`;
            rankColor = "text-neonYellow";
          } else if (index === 1) {
            rankIcon = `<i class="fa-solid fa-medal text-slate-400"></i>`;
            rankColor = "text-slate-300";
          } else if (index === 2) {
            rankIcon = `<i class="fa-solid fa-medal text-orange-500"></i>`;
            rankColor = "text-orange-400";
          }

          return `
            <div class="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-glassBorder hover:border-neonCyan/30 transition-all">
              <div class="flex items-center space-x-3 truncate">
                ${rankIcon}
                <span class="text-xs font-bold ${rankColor} truncate">${u.username}</span>
              </div>
              <div class="text-right">
                <span class="text-xs font-extrabold text-white">${u.totalScore} pts</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  } catch (e) {
    console.error("Dashboard stats sync failed:", e);
  }
}

function setupDashboardControls() {
  const btnToggleRole = document.getElementById('btn-toggle-role');
  if (btnToggleRole) {
    btnToggleRole.addEventListener('click', () => {
      audio.playClick();
      currentRole = currentRole === 'student' ? 'lecturer' : 'student';
      // Persist locally
      if (currentUser) {
        localStorage.setItem(`bq_user_role_${currentUser.uid}`, currentRole);
      }
      adaptNavigationForRole(currentRole);
      syncUserDashboardStats();
      showToast(`Switched view to ${currentRole === 'lecturer' ? 'Lecturer' : 'Student'} mode.`, true);
    });
  }

  const btnGotoCreate = document.getElementById('btn-lecturer-action-create');
  if (btnGotoCreate) {
    btnGotoCreate.addEventListener('click', () => {
      audio.playClick();
      switchView('createQuiz');
    });
  }

  const btnLecturerRes = document.getElementById('btn-lecturer-action-results');
  if (btnLecturerRes) {
    btnLecturerRes.addEventListener('click', () => {
      audio.playClick();
      switchView('lecturerResults');
    });
  }

  const btnLecturerExport = document.getElementById('btn-lecturer-action-export');
  if (btnLecturerExport) {
    btnLecturerExport.addEventListener('click', async () => {
      audio.playClick();
      // Export general attempts list
      try {
        const allQuizzes = await dbService.getAllQuizzes();
        const lecturerQuizzes = allQuizzes.filter(q => q.creator && (q.creator._id === currentUser.uid || q.creator.id === currentUser.uid || q.creator.username === currentUser.displayName));
        
        let aggregatedRows = [];
        for (const quiz of lecturerQuizzes) {
          const res = await fetch(`http://localhost:5000/api/leaderboard/${quiz.code}`);
          if (res.ok) {
            const quizAttempts = await res.json();
            quizAttempts.forEach(att => {
              aggregatedRows.push({
                QuizCode: quiz.code,
                QuizTitle: quiz.title,
                StudentName: att.username,
                Score: att.score,
                TotalQuestions: att.totalQuestions,
                Percentage: Math.round((att.score / att.totalQuestions) * 100),
                DateSubmitted: new Date(att.createdAt).toLocaleString()
              });
            });
          }
        }

        if (aggregatedRows.length === 0) {
          showToast("No student attempts found to export.", false);
          return;
        }

        // CSV download trigger
        const headers = ["QuizCode", "QuizTitle", "StudentName", "Score", "TotalQuestions", "Percentage", "DateSubmitted"];
        let csvContent = "data:text/csv;charset=utf-8," 
          + headers.join(",") + "\n"
          + aggregatedRows.map(r => headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(",")).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "academic-quiz-general-report.csv");
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast("General CSV report generated successfully!", true);
        audio.playVictory();
      } catch (err) {
        showToast("Failed to compile CSV report: " + err.message, false);
      }
    });
  }

  const btnJoinRoom = document.getElementById('btn-join-room');
  if (btnJoinRoom) {
    btnJoinRoom.addEventListener('click', async () => {
      audio.playClick();
      const codeInput = document.getElementById('join-room-code');
      const code = codeInput.value.trim().toUpperCase();

      if (!code) {
        showToast("Please enter a valid Quiz Room Code.", false);
        return;
      }

      btnJoinRoom.disabled = true;
      btnJoinRoom.innerHTML = `<i class="fa-solid fa-circle-notch animate-spin mr-2"></i>Accessing Arena...`;

      try {
        const quiz = await dbService.getQuiz(code);
        showToast(`Ready! Accessing: "${quiz.title}"`, true);
        launchQuizArena(quiz);
      } catch (err) {
        showToast(err.message, false);
      } finally {
        btnJoinRoom.disabled = false;
        btnJoinRoom.innerHTML = `<span>Enter Quiz Arena</span><i class="fa-solid fa-play"></i>`;
      }
    });
  }
}

// -------------------------------------------------------------
// Quiz Creator Studio Wizard
// -------------------------------------------------------------
function setupCreateQuizStudio() {
  const form = document.getElementById('create-quiz-form');
  const btnAdd = document.getElementById('btn-add-question');
  const listContainer = document.getElementById('questions-list');
  const countBadge = document.getElementById('question-count-badge');
  const btnCancel = document.getElementById('btn-cancel-create');

  if (btnCancel) {
    btnCancel.addEventListener('click', (e) => {
      e.preventDefault();
      audio.playClick();
      switchView('dashboard');
    });
  }

  if (btnAdd && listContainer) {
    btnAdd.addEventListener('click', () => {
      audio.playClick();
      const currentCount = listContainer.children.length;

      const newQuestionHTML = `
        <div class="question-panel bg-white/5 border border-glassBorder rounded-2xl p-6 relative reveal-anim">
          <div class="absolute -top-3 left-6 px-3 py-1 bg-neonPurple rounded-full text-[10px] font-bold tracking-wider uppercase">Question #${currentCount + 1}</div>
          
          <div class="absolute -top-3 right-6 flex items-center space-x-1.5 bg-gray-900 border border-glassBorder px-2 py-0.5 rounded-full">
            <button type="button" class="btn-move-q-up text-[10px] text-gray-400 hover:text-white transition-colors" title="Move Up"><i class="fa-solid fa-chevron-up"></i></button>
            <span class="text-[9px] text-gray-500">|</span>
            <button type="button" class="btn-move-q-down text-[10px] text-gray-400 hover:text-white transition-colors" title="Move Down"><i class="fa-solid fa-chevron-down"></i></button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2">
            <div class="md:col-span-3 space-y-4">
              <div>
                <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Question Content</label>
                <input type="text" placeholder="e.g. Which keyword declares block-scoped variables?" required class="w-full bg-gray-950/40 border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-neonCyan transition-all q-text-input">
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Option A</label>
                  <input type="text" placeholder="Option A" required class="w-full bg-gray-950/40 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-neonCyan transition-all q-opt-input" data-index="0">
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Option B</label>
                  <input type="text" placeholder="Option B" required class="w-full bg-gray-950/40 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-neonCyan transition-all q-opt-input" data-index="1">
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Option C</label>
                  <input type="text" placeholder="Option C" required class="w-full bg-gray-950/40 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-neonCyan transition-all q-opt-input" data-index="2">
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Option D</label>
                  <input type="text" placeholder="Option D" required class="w-full bg-gray-950/40 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-neonCyan transition-all q-opt-input" data-index="3">
                </div>
              </div>
            </div>

            <div class="flex flex-col justify-between">
              <div>
                <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Correct Answer Index</label>
                <select class="w-full bg-gray-950/40 border border-gray-800 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-neonCyan transition-all q-correct-select">
                  <option value="0">Option A</option>
                  <option value="1">Option B</option>
                  <option value="2">Option C</option>
                  <option value="3">Option D</option>
                </select>
              </div>

              <button type="button" class="w-full mt-4 py-2 border border-rose-500/30 text-rose-400 bg-rose-950/10 hover:bg-rose-950/30 rounded-xl text-xs font-medium transition-all duration-200 btn-delete-question">
                <i class="fa-solid fa-trash-can mr-2"></i>Delete Question
              </button>
            </div>
          </div>
        </div>
      `;

      const wrapper = document.createElement('div');
      wrapper.innerHTML = newQuestionHTML;
      const element = wrapper.firstElementChild;
      listContainer.appendChild(element);
      updateQuestionPanelStates();
    });
  }

  // Handle reordering and deleting inside container
  if (listContainer) {
    listContainer.addEventListener('click', (e) => {
      // 1. Delete handler
      const deleteBtn = e.target.closest('.btn-delete-question');
      if (deleteBtn && !deleteBtn.disabled) {
        audio.playClick();
        const panel = deleteBtn.closest('.question-panel');
        panel.remove();
        updateQuestionPanelStates();
        return;
      }

      // 2. Move Up handler
      const upBtn = e.target.closest('.btn-move-q-up');
      if (upBtn) {
        audio.playClick();
        const panel = upBtn.closest('.question-panel');
        const prev = panel.previousElementSibling;
        if (prev) {
          listContainer.insertBefore(panel, prev);
          updateQuestionPanelStates();
        }
        return;
      }

      // 3. Move Down handler
      const downBtn = e.target.closest('.btn-move-q-down');
      if (downBtn) {
        audio.playClick();
        const panel = downBtn.closest('.question-panel');
        const next = panel.nextElementSibling;
        if (next) {
          listContainer.insertBefore(next, panel);
          updateQuestionPanelStates();
        }
        return;
      }
    });
  }

  function updateQuestionPanelStates() {
    const panels = listContainer.querySelectorAll('.question-panel');
    const total = panels.length;
    countBadge.textContent = total;

    panels.forEach((panel, idx) => {
      const badge = panel.querySelector('.absolute');
      badge.textContent = `Question #${idx + 1}`;

      const delBtn = panel.querySelector('.btn-delete-question');
      if (total === 1) {
        delBtn.disabled = true;
        delBtn.classList.add('opacity-30', 'cursor-not-allowed');
      } else {
        delBtn.disabled = false;
        delBtn.classList.remove('opacity-30', 'cursor-not-allowed');
      }
    });
  }

  // Handle Import & Export of questions
  const btnImport = document.getElementById('btn-import-questions');
  const btnExport = document.getElementById('btn-export-questions');
  const importFileInput = document.getElementById('import-questions-file');

  if (btnExport) {
    btnExport.addEventListener('click', (e) => {
      e.preventDefault();
      audio.playClick();

      const questions = [];
      const panels = listContainer.querySelectorAll('.question-panel');

      panels.forEach((panel) => {
        const textVal = panel.querySelector('.q-text-input').value.trim();
        const optionsInputs = panel.querySelectorAll('.q-opt-input');
        const correctVal = parseInt(panel.querySelector('.q-correct-select').value);

        const options = [];
        optionsInputs.forEach(input => {
          options.push(input.value.trim());
        });

        questions.push({
          questionText: textVal,
          options: options,
          correctOption: correctVal
        });
      });

      if (questions.length === 0) {
        showToast("No questions found to export.", false);
        return;
      }

      try {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questions, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `academic-questions.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast(`Exported ${questions.length} questions successfully!`, true);
      } catch (err) {
        showToast("Failed to export questions.", false);
      }
    });
  }

  if (btnImport && importFileInput) {
    btnImport.addEventListener('click', (e) => {
      e.preventDefault();
      audio.playClick();
      importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const importedQuestions = JSON.parse(evt.target.result);

          if (!Array.isArray(importedQuestions)) {
            throw new Error("Invalid format: questions must be a JSON array.");
          }

          const isValid = importedQuestions.every(q => {
            return q &&
                   typeof q.questionText === 'string' &&
                   Array.isArray(q.options) &&
                   q.options.length === 4 &&
                   typeof q.correctOption === 'number' &&
                   q.correctOption >= 0 &&
                   q.correctOption <= 3;
          });

          if (!isValid) {
            throw new Error("Invalid structure: questions must have questionText, 4 options, and a correctOption index (0-3).");
          }

          listContainer.innerHTML = '';

          importedQuestions.forEach((q, idx) => {
            const newQuestionHTML = `
              <div class="question-panel bg-white/5 border border-glassBorder rounded-2xl p-6 relative reveal-anim">
                <div class="absolute -top-3 left-6 px-3 py-1 bg-neonPurple rounded-full text-[10px] font-bold tracking-wider uppercase">Question #${idx + 1}</div>
                
                <div class="absolute -top-3 right-6 flex items-center space-x-1.5 bg-gray-900 border border-glassBorder px-2 py-0.5 rounded-full">
                  <button type="button" class="btn-move-q-up text-[10px] text-gray-400 hover:text-white transition-colors" title="Move Up"><i class="fa-solid fa-chevron-up"></i></button>
                  <span class="text-[9px] text-gray-500">|</span>
                  <button type="button" class="btn-move-q-down text-[10px] text-gray-400 hover:text-white transition-colors" title="Move Down"><i class="fa-solid fa-chevron-down"></i></button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2">
                  <div class="md:col-span-3 space-y-4">
                    <div>
                      <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Question Content</label>
                      <input type="text" placeholder="e.g. Which keyword declares block-scoped variables?" required class="w-full bg-gray-950/40 border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-neonCyan transition-all q-text-input" value="${escapeHtml(q.questionText)}">
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Option A</label>
                        <input type="text" placeholder="Option A" required class="w-full bg-gray-950/40 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-neonCyan transition-all q-opt-input" data-index="0" value="${escapeHtml(q.options[0])}">
                      </div>
                      <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Option B</label>
                        <input type="text" placeholder="Option B" required class="w-full bg-gray-950/40 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-neonCyan transition-all q-opt-input" data-index="1" value="${escapeHtml(q.options[1])}">
                      </div>
                      <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Option C</label>
                        <input type="text" placeholder="Option C" required class="w-full bg-gray-950/40 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-neonCyan transition-all q-opt-input" data-index="2" value="${escapeHtml(q.options[2])}">
                      </div>
                      <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Option D</label>
                        <input type="text" placeholder="Option D" required class="w-full bg-gray-950/40 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-neonCyan transition-all q-opt-input" data-index="3" value="${escapeHtml(q.options[3])}">
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col justify-between">
                    <div>
                      <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Correct Answer Index</label>
                      <select class="w-full bg-gray-950/40 border border-gray-800 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-neonCyan transition-all q-correct-select">
                        <option value="0" ${q.correctOption === 0 ? 'selected' : ''}>Option A</option>
                        <option value="1" ${q.correctOption === 1 ? 'selected' : ''}>Option B</option>
                        <option value="2" ${q.correctOption === 2 ? 'selected' : ''}>Option C</option>
                        <option value="3" ${q.correctOption === 3 ? 'selected' : ''}>Option D</option>
                      </select>
                    </div>

                    <button type="button" class="w-full mt-4 py-2 border border-rose-500/30 text-rose-400 bg-rose-950/10 hover:bg-rose-950/30 rounded-xl text-xs font-medium transition-all duration-200 btn-delete-question">
                      <i class="fa-solid fa-trash-can mr-2"></i>Delete Question
                    </button>
                  </div>
                </div>
              </div>
            `;
            const wrapper = document.createElement('div');
            wrapper.innerHTML = newQuestionHTML;
            listContainer.appendChild(wrapper.firstElementChild);
          });

          updateQuestionPanelStates();
          showToast(`Successfully imported ${importedQuestions.length} questions!`, true);
          audio.playVictory();
        } catch (err) {
          showToast(err.message || "Failed to parse questions file.", false);
        } finally {
          importFileInput.value = '';
        }
      };
      reader.readAsText(file);
    });
  }

  // Submit and create the quiz
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      audio.playClick();

      const title = document.getElementById('create-quiz-title').value.trim();
      const description = document.getElementById('create-quiz-desc').value.trim();
      const genre = document.getElementById('create-quiz-genre').value;
      const timeLimit = parseInt(document.getElementById('create-quiz-time').value);

      const questions = [];
      const panels = listContainer.querySelectorAll('.question-panel');
      let isValid = true;

      panels.forEach((panel) => {
        const textVal = panel.querySelector('.q-text-input').value.trim();
        const optionsInputs = panel.querySelectorAll('.q-opt-input');
        const correctVal = parseInt(panel.querySelector('.q-correct-select').value);

        const options = [];
        optionsInputs.forEach(input => {
          options.push(input.value.trim());
        });

        if (!textVal || options.some(opt => !opt)) {
          isValid = false;
          return;
        }

        questions.push({
          questionText: textVal,
          options: options,
          correctOption: correctVal
        });
      });

      if (!isValid) {
        showToast("Please fully fill out all question details and options.", false);
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch animate-spin mr-2"></i>Publishing Quiz...`;

      try {
        const quizId = await dbService.saveQuiz({
          title, description, genre, timeLimit, questions
        }, currentUser);

        showToast(`Quiz Published successfully! Code: ${quizId}`, true);
        audio.playVictory();

        // Copy room code dynamically with animated copy effect
        navigator.clipboard.writeText(quizId);
        showToast(`Room code ${quizId} copied to clipboard!`, true);

        activeQuizIdForLeaderboard = quizId;
        
        // Go to lecturer results to monitor
        switchView('lecturerResults');
        
        // Pre-fill search filter
        setTimeout(() => {
          const filter = document.getElementById('lecturer-res-quiz-filter');
          if (filter) {
            filter.value = quizId;
            filter.dispatchEvent(new Event('change'));
          }
        }, 300);

      } catch (err) {
        showToast(err.message, false);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Publish Quiz &amp; Generate Code</span><i class="fa-solid fa-circle-check"></i>`;
      }
    });
  }
}

// -------------------------------------------------------------
// Active Playroom Quiz Playback Engine
// -------------------------------------------------------------
function launchQuizArena(quiz) {
  activeQuiz = quiz;
  quizQuestions = quiz.questions || [];
  currentQuestionIndex = 0;
  quizScore = 0;
  userSelections = [];
  questionTimeLimit = parseInt(quiz.timeLimit) || 30;

  document.getElementById('play-quiz-title').textContent = quiz.title;
  const genreBadge = document.getElementById('play-genre-badge');
  genreBadge.textContent = quiz.genre;
  updateGenreBadgeColors(genreBadge, quiz.genre);

  switchView('quizPlay');
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  if (currentQuestionIndex >= quizQuestions.length) {
    completeQuizAttempt();
    return;
  }

  userSelectedOption = null;

  const currentQuestion = quizQuestions[currentQuestionIndex];
  document.getElementById('play-question-num-txt').textContent = `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;

  const percentage = Math.round((currentQuestionIndex / quizQuestions.length) * 100);
  document.getElementById('play-progress-percent').textContent = `${percentage}%`;
  document.getElementById('play-progress-bar').style.width = `${percentage}%`;

  document.getElementById('play-question-text').textContent = currentQuestion.questionText;

  const optionsList = document.getElementById('play-options-list');
  optionsList.innerHTML = '';

  const choiceLetters = ['A', 'B', 'C', 'D'];
  currentQuestion.options.forEach((optionText, idx) => {
    const btn = document.createElement('button');
    btn.className = "flex items-center space-x-4 p-5 rounded-2xl border border-gray-800 bg-gray-950/30 hover:border-neonCyan transition-all hover:bg-gray-900/45 text-left w-full group relative overflow-hidden active:scale-98";
    btn.innerHTML = `
      <span class="w-8 h-8 rounded-lg bg-white/5 border border-glassBorder flex items-center justify-center font-display font-semibold text-sm text-gray-400 group-hover:text-neonCyan group-hover:border-neonCyan transition-all opt-indicator">${choiceLetters[idx]}</span>
      <span class="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">${optionText}</span>
    `;

    btn.addEventListener('click', () => {
      audio.playClick();
      selectOption(idx, btn);
    });

    optionsList.appendChild(btn);
  });

  // Display saving indicators
  const autosave = document.getElementById('autosave-indicator');
  if (autosave) {
    autosave.innerHTML = `<i class="fa-solid fa-cloud-arrow-up animate-pulse text-neonGreen"></i><span>Console synced</span>`;
  }

  startQuestionTimer();
}

function selectOption(index, buttonElement) {
  userSelectedOption = index;

  const optionsList = document.getElementById('play-options-list');
  optionsList.querySelectorAll('button').forEach((btn) => {
    btn.className = "flex items-center space-x-4 p-5 rounded-2xl border border-gray-800 bg-gray-950/30 hover:border-neonCyan transition-all hover:bg-gray-900/45 text-left w-full group relative overflow-hidden active:scale-98";
    const indicator = btn.querySelector('.opt-indicator');
    if (indicator) {
      indicator.className = "w-8 h-8 rounded-lg bg-white/5 border border-glassBorder flex items-center justify-center font-display font-semibold text-sm text-gray-400 group-hover:text-neonCyan group-hover:border-neonCyan transition-all opt-indicator";
    }
  });

  buttonElement.className = "flex items-center space-x-4 p-5 rounded-2xl border border-neonCyan bg-neonCyan/10 shadow-neon-cyan transition-all text-left w-full group relative overflow-hidden";
  const selectIndicator = buttonElement.querySelector('.opt-indicator');
  if (selectIndicator) {
    selectIndicator.className = "w-8 h-8 rounded-lg bg-neonCyan text-darkBg border border-neonCyan flex items-center justify-center font-display font-bold text-sm opt-indicator";
  }

  // Update saving indicator
  const autosave = document.getElementById('autosave-indicator');
  if (autosave) {
    autosave.innerHTML = `<i class="fa-solid fa-arrow-rotate-right animate-spin text-neonYellow"></i><span>Choice registered...</span>`;
    setTimeout(() => {
      autosave.innerHTML = `<i class="fa-solid fa-cloud-arrow-up text-neonGreen"></i><span>Choice Auto-saved</span>`;
    }, 400);
  }
}

function startQuestionTimer() {
  if (quizTimer) clearInterval(quizTimer);

  quizTimeLeft = questionTimeLimit;
  const timerSecondsText = document.getElementById('play-timer-seconds');
  const timerCircleProgress = document.getElementById('timer-progress');

  timerSecondsText.textContent = quizTimeLeft;
  timerCircleProgress.style.strokeDashoffset = '0';
  timerCircleProgress.setAttribute('stroke', '#00E5FF');

  quizTimer = setInterval(() => {
    quizTimeLeft--;
    timerSecondsText.textContent = quizTimeLeft;

    const dashoffset = 176 - (176 * (quizTimeLeft / questionTimeLimit));
    timerCircleProgress.style.strokeDashoffset = dashoffset;

    if (quizTimeLeft <= 5) {
      timerCircleProgress.setAttribute('stroke', '#ff007f');
      audio.playTick();
    } else {
      timerCircleProgress.setAttribute('stroke', '#00E5FF');
    }

    if (quizTimeLeft <= 0) {
      clearInterval(quizTimer);
      audio.playCountdownEnd();
      showToast("Time's up for this question!", false);
      advanceQuizState();
    }
  }, 1000);
}

function advanceQuizState() {
  const currentQuestion = quizQuestions[currentQuestionIndex];
  if (currentQuestion) {
    userSelections.push(userSelectedOption);

    if (userSelectedOption !== null && userSelectedOption === currentQuestion.correctOption) {
      quizScore++;
      audio.playCorrect();
    } else if (userSelectedOption !== null) {
      audio.playWrong();
    }
  }

  currentQuestionIndex++;
  renderCurrentQuestion();
}

// Complete quiz and launch student result deck
async function completeQuizAttempt() {
  if (quizTimer) clearInterval(quizTimer);

  const reviewPanel = document.getElementById('review-answers-panel');
  if (reviewPanel) reviewPanel.classList.add('hidden');

  const reviewList = document.getElementById('review-list');
  if (reviewList) reviewList.innerHTML = '';

  switchView('results');

  const percentage = Math.round((quizScore / quizQuestions.length) * 100);

  document.getElementById('result-quiz-title').textContent = activeQuiz.title;
  document.getElementById('result-score-percent').textContent = `${percentage}%`;
  document.getElementById('result-score-fraction').textContent = `${quizScore} of ${quizQuestions.length} Correct`;
  document.getElementById('result-correct-count').textContent = quizScore;
  document.getElementById('result-genre').textContent = activeQuiz.genre;

  // Grade performance category
  const badge = document.getElementById('result-category-badge');
  let category = 'Needs Improvement';
  let badgeColor = 'text-neonPink bg-neonPink/15 border-neonPink/30';
  let scoreColor = 'font-display font-extrabold text-4xl text-neonPink text-glow-pink';

  if (percentage >= 90) {
    category = 'Outstanding';
    badgeColor = 'text-neonYellow bg-neonYellow/15 border-neonYellow/30 text-glow-yellow animate-pulse';
    scoreColor = 'font-display font-extrabold text-4xl text-neonYellow text-glow-yellow';
  } else if (percentage >= 80) {
    category = 'Excellent';
    badgeColor = 'text-neonGreen bg-neonGreen/15 border-neonGreen/30 text-glow-green';
    scoreColor = 'font-display font-extrabold text-4xl text-neonGreen text-glow-green';
  } else if (percentage >= 70) {
    category = 'Good';
    badgeColor = 'text-neonCyan bg-neonCyan/15 border-neonCyan/30 text-glow-cyan';
    scoreColor = 'font-display font-extrabold text-4xl text-neonCyan text-glow-cyan';
  } else if (percentage >= 50) {
    category = 'Average';
    badgeColor = 'text-slate-300 bg-slate-300/15 border-slate-300/30';
    scoreColor = 'font-display font-extrabold text-4xl text-slate-300';
  }

  badge.textContent = category;
  badge.className = `mt-4 px-3.5 py-1 border rounded-full text-xs font-extrabold uppercase tracking-widest ${badgeColor}`;
  document.getElementById('result-score-percent').className = scoreColor;

  // Trigger confetti burst on > 80% score!
  if (percentage >= 80) {
    audio.playVictory();
    triggerConfettiBurst();
  } else {
    audio.playCountdownEnd();
  }

  try {
    await dbService.saveAttempt(
      activeQuiz.id,
      activeQuiz.title,
      activeQuiz.genre,
      quizScore,
      quizQuestions.length,
      currentUser
    );
    showToast("Attempt logged successfully!", true);
  } catch (err) {
    showToast("Failed to save score: " + err.message, false);
  }

  // Set up student downloads click bindings
  setupStudentResultsDownloads(percentage);
}

function triggerConfettiBurst() {
  if (window.confetti) {
    window.confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
  }
}

// -------------------------------------------------------------
// Dynamic Client-Side Document Exporters (PDF & Excel)
// -------------------------------------------------------------
function setupStudentResultsDownloads(scorePercentage) {
  const attemptBtn = document.getElementById('btn-download-attempt-pdf');
  const keyBtn = document.getElementById('btn-download-key-pdf');

  if (attemptBtn) {
    // Unbind prior listeners
    const clone = attemptBtn.cloneNode(true);
    attemptBtn.parentNode.replaceChild(clone, attemptBtn);
    
    clone.addEventListener('click', () => {
      audio.playClick();
      generateStudentAttemptSummaryPDF();
    });
  }

  if (keyBtn) {
    const clone = keyBtn.cloneNode(true);
    keyBtn.parentNode.replaceChild(clone, keyBtn);

    clone.addEventListener('click', () => {
      audio.playClick();
      generateQuizAnswerKeyPDF(activeQuiz);
    });
  }
}

function generateStudentAttemptSummaryPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const dateStr = new Date().toLocaleString();

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(139, 92, 246); // Purple Accent
  doc.text("ACADEMIC QUIZ - SCORE SUMMARY", 14, 20);

  doc.setLineWidth(0.5);
  doc.setDrawColor(139, 92, 246);
  doc.line(14, 24, 196, 24);

  doc.setFontSize(11);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(60, 60, 60);

  doc.text(`Student Name: ${currentUser.displayName || 'Student'}`, 14, 34);
  doc.text(`Email Address: ${currentUser.email || 'N/A'}`, 14, 40);
  doc.text(`Quiz Title: ${activeQuiz.title}`, 14, 46);
  doc.text(`Category Genre: ${activeQuiz.genre}`, 14, 52);
  doc.text(`Submitted On: ${dateStr}`, 14, 58);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PERFORMANCE RESULTS", 14, 70);

  doc.setFontSize(12);
  doc.text(`Final Score: ${quizScore} / ${quizQuestions.length} Correct`, 14, 78);
  doc.text(`Accuracy Rate: ${Math.round((quizScore / quizQuestions.length) * 100)}%`, 14, 84);

  // Question summary logs
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Question Log Analysis", 14, 100);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  let y = 108;

  quizQuestions.forEach((q, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    const userSelectedIdx = userSelections[idx];
    const userSelectedText = userSelectedIdx !== null && userSelectedIdx !== undefined ? q.options[userSelectedIdx] : 'Timed Out';
    const correctText = q.options[q.correctOption];
    const isCorrect = userSelectedIdx === q.correctOption;

    doc.setFont("Helvetica", "bold");
    doc.text(`Q${idx + 1}: ${q.questionText.substring(0, 75)}...`, 14, y);
    y += 6;

    doc.setFont("Helvetica", "normal");
    doc.text(`Your Selection: ${userSelectedText}`, 18, y);
    y += 5;
    doc.text(`Correct Option: ${correctText}`, 18, y);
    y += 5;

    // Correct vs Wrong badge
    doc.setFont("Helvetica", "bold");
    if (isCorrect) {
      doc.setTextColor(34, 197, 94); // Green
      doc.text("STATUS: CORRECT", 18, y);
    } else {
      doc.setTextColor(239, 68, 68); // Red
      doc.text(`STATUS: INCORRECT`, 18, y);
    }
    doc.setTextColor(60, 60, 60);
    y += 10;
  });

  doc.save(`score-attempt-${activeQuiz.code}.pdf`);
  showToast("Attempt report downloaded!", true);
}

function generateQuizAnswerKeyPDF(quiz) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(0, 229, 255); // Cyan
  doc.text("QUIZ ANSWER KEY & REFERENCE", 14, 20);

  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 229, 255);
  doc.line(14, 24, 196, 24);

  doc.setFontSize(11);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(60, 60, 60);

  doc.text(`Quiz Title: ${quiz.title}`, 14, 34);
  doc.text(`Genre Subject: ${quiz.genre}`, 14, 40);
  doc.text(`Room Access Code: ${quiz.code}`, 14, 46);
  doc.text(`Total Questions: ${quiz.questions.length}`, 14, 52);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Correct Choices Reference Sheet", 14, 65);

  let y = 73;
  quiz.questions.forEach((q, idx) => {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("Helvetica", "bold");
    doc.text(`Q${idx + 1}: ${q.questionText}`, 14, y);
    y += 6;

    doc.setFont("Helvetica", "normal");
    q.options.forEach((opt, optIdx) => {
      const isCorrect = optIdx === q.correctOption;
      if (isCorrect) {
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(34, 197, 94);
        doc.text(`[X] ${opt}  (Correct Answer)`, 18, y);
        doc.setTextColor(60, 60, 60);
        doc.setFont("Helvetica", "normal");
      } else {
        doc.text(`[ ] ${opt}`, 18, y);
      }
      y += 5;
    });

    y += 5;
  });

  doc.save(`answer-key-${quiz.code}.pdf`);
  showToast("Answer Key PDF downloaded!", true);
}

// -------------------------------------------------------------
// Lecturer Results & Performance Summary (SaaS Deck)
// -------------------------------------------------------------
async function loadLecturerResultsPage() {
  const selectFilter = document.getElementById('lecturer-res-quiz-filter');
  if (!selectFilter) return;

  try {
    const allQuizzes = await dbService.getAllQuizzes();
    const lecturerQuizzes = allQuizzes.filter(q => q.creator && (q.creator._id === currentUser.uid || q.creator.id === currentUser.uid || q.creator.username === currentUser.displayName));

    // Populate Select Options dropdown
    const currentSelectedValue = selectFilter.value;
    selectFilter.innerHTML = `<option value="">-- No Quiz Selected --</option>` 
      + lecturerQuizzes.map(q => `<option value="${q.code}">${q.title} (${q.code})</option>`).join('');
    
    // Restore selection if matching
    if (currentSelectedValue && lecturerQuizzes.some(q => q.code === currentSelectedValue)) {
      selectFilter.value = currentSelectedValue;
    } else {
      resetLecturerSummaryUI();
    }
  } catch (err) {
    console.error("Failed to load lecturer quizzes list:", err);
  }
}

function resetLecturerSummaryUI() {
  document.getElementById('lecturer-res-highest').textContent = "--";
  document.getElementById('lecturer-res-lowest').textContent = "--";
  document.getElementById('lecturer-res-avg').textContent = "--";
  document.getElementById('lecturer-res-completion').textContent = "--";
  document.getElementById('lecturer-results-table-body').innerHTML = `<tr><td colspan="5" class="text-center text-gray-500 text-sm py-10">Please choose a Quiz Room above to load student attempts.</td></tr>`;
}

function setupLecturerResultsHandlers() {
  const filter = document.getElementById('lecturer-res-quiz-filter');
  const searchInput = document.getElementById('lecturer-res-search');

  if (filter) {
    filter.addEventListener('change', async () => {
      const code = filter.value;
      if (!code) {
        resetLecturerSummaryUI();
        return;
      }
      await fetchScoresForLecturerQuiz(code);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterAndRenderLecturerTable();
    });
  }

  // Setup dynamic sorting column clicks
  const sortBinds = [
    { id: 'col-sort-rank', field: 'rank' },
    { id: 'col-sort-name', field: 'username' },
    { id: 'col-sort-score', field: 'score' },
    { id: 'col-sort-pct', field: 'percentage' }
  ];

  sortBinds.forEach(bind => {
    const el = document.getElementById(bind.id);
    if (el) {
      el.addEventListener('click', () => {
        audio.playClick();
        if (lecturerSortField === bind.field) {
          lecturerSortDirection *= -1; // Toggle direction
        } else {
          lecturerSortField = bind.field;
          lecturerSortDirection = 1;
        }
        sortAndRenderLecturerTable();
      });
    }
  });

  // Setup Lecturer report downloads click listeners
  setupLecturerDownloads();
}

async function fetchScoresForLecturerQuiz(quizCode) {
  const tableBody = document.getElementById('lecturer-results-table-body');
  tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500 py-10"><i class="fa-solid fa-circle-notch animate-spin mr-2"></i>Accessing student records...</td></tr>`;

  try {
    // 1. Fetch scores
    const res = await fetch(`http://localhost:5000/api/leaderboard/${quizCode}`);
    if (!res.ok) throw new Error("Failed to load scoreboard data.");
    const rawScores = await res.json();

    // 2. Fetch complete Quiz details to access questions
    const quizDetail = await dbService.getQuiz(quizCode);
    activeQuiz = quizDetail; // cache locally

    let highest = 0;
    let lowest = 100;
    let totalPct = 0;

    lecturerResults = rawScores.map((att, idx) => {
      const scoreVal = parseInt(att.score) || 0;
      const totalQ = parseInt(att.totalQuestions) || 5;
      const pct = Math.round((scoreVal / totalQ) * 100);

      if (pct > highest) highest = pct;
      if (pct < lowest) lowest = pct;
      totalPct += pct;

      return {
        id: att._id,
        rank: idx + 1,
        username: att.username,
        email: att.email || `${att.username.toLowerCase()}@domain.com`,
        score: scoreVal,
        totalQuestions: totalQ,
        percentage: pct,
        timestamp: att.createdAt || new Date().toISOString()
      };
    });

    if (lecturerResults.length === 0) {
      lowest = 0;
    }

    const avg = lecturerResults.length > 0 ? Math.round(totalPct / lecturerResults.length) : 0;
    
    // Completion rate shows submissions / total students, we can assume typical 100% since students only show once submitted, 
    // or calculate it as percentage of users who scored >= 50%
    const passedCount = lecturerResults.filter(r => r.percentage >= 50).length;
    const completionRate = lecturerResults.length > 0 ? Math.round((passedCount / lecturerResults.length) * 100) : 0;

    document.getElementById('lecturer-res-highest').textContent = `${highest}%`;
    document.getElementById('lecturer-res-lowest').textContent = `${lowest}%`;
    document.getElementById('lecturer-res-avg').textContent = `${avg}%`;
    document.getElementById('lecturer-res-completion').textContent = `${completionRate}%`;

    sortAndRenderLecturerTable();

  } catch (err) {
    showToast(err.message, false);
    resetLecturerSummaryUI();
  }
}

function sortAndRenderLecturerTable() {
  lecturerResults.sort((a, b) => {
    let valA = a[lecturerSortField];
    let valB = b[lecturerSortField];

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return -1 * lecturerSortDirection;
    if (valA > valB) return 1 * lecturerSortDirection;
    return 0;
  });

  filterAndRenderLecturerTable();
}

function filterAndRenderLecturerTable() {
  const tableBody = document.getElementById('lecturer-results-table-body');
  const query = document.getElementById('lecturer-res-search').value.trim().toLowerCase();

  const filtered = lecturerResults.filter(r => 
    r.username.toLowerCase().includes(query) || 
    r.email.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500 py-10">No matching student attempts found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = filtered.map(r => {
    let rankBadge = `<span class="text-sm font-bold text-gray-400">${r.rank}</span>`;
    if (r.rank === 1) rankBadge = `<span class="w-7 h-7 rounded-full bg-neonYellow/20 border border-neonYellow/40 text-neonYellow flex items-center justify-center text-xs font-bold"><i class="fa-solid fa-crown text-[10px]"></i></span>`;
    else if (r.rank === 2) rankBadge = `<span class="w-7 h-7 rounded-full bg-slate-400/20 border border-slate-400/40 text-slate-300 flex items-center justify-center text-xs font-bold"><i class="fa-solid fa-medal text-[10px]"></i></span>`;
    else if (r.rank === 3) rankBadge = `<span class="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center text-xs font-bold"><i class="fa-solid fa-medal text-[10px]"></i></span>`;

    let pctColor = 'text-neonPink';
    if (r.percentage >= 70) pctColor = 'text-neonGreen';
    else if (r.percentage >= 50) pctColor = 'text-neonYellow';

    return `
      <tr class="border-b border-glassBorder/40 hover:bg-white/5 transition-colors">
        <td class="py-4 text-center flex justify-center">${rankBadge}</td>
        <td class="py-4 pl-4">
          <div class="flex flex-col text-left">
            <span class="text-xs font-bold text-white">${r.username}</span>
            <span class="text-[9px] text-gray-500 mt-0.5">${r.email}</span>
          </div>
        </td>
        <td class="py-4 text-center text-sm font-semibold">${r.score} / ${r.totalQuestions}</td>
        <td class="py-4 text-center text-sm font-extrabold ${pctColor}">${r.percentage}%</td>
        <td class="py-4 text-right">
          <button class="btn-download-cert py-1.5 px-3 bg-neonPurple/15 hover:bg-neonPurple/25 border border-neonPurple/30 text-neonPurple hover:text-white rounded-lg text-[10px] font-bold transition-all" data-id="${r.id}">
            Report Card
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Attach individual report card handlers
  tableBody.querySelectorAll('.btn-download-cert').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      audio.playClick();
      const attemptId = btn.getAttribute('data-id');
      const record = lecturerResults.find(r => r.id === attemptId);
      if (record) {
        generateIndividualReportCardPDF(record);
      }
    });
  });
}

// -------------------------------------------------------------
// Lecturer Report Download Integrations
// -------------------------------------------------------------
function setupLecturerDownloads() {
  const pdfBtn = document.getElementById('btn-download-results-pdf');
  const xlsBtn = document.getElementById('btn-download-results-excel');
  const paperBtn = document.getElementById('btn-download-quiz-paper');
  const summaryBtn = document.getElementById('btn-download-summary-report');
  const responseBtn = document.getElementById('btn-download-response-report');

  if (pdfBtn) {
    pdfBtn.addEventListener('click', () => {
      audio.playClick();
      if (lecturerResults.length === 0) {
        showToast("Please choose a quiz with student data first.", false);
        return;
      }
      generateLecturerResultsPDF();
    });
  }

  if (xlsBtn) {
    xlsBtn.addEventListener('click', () => {
      audio.playClick();
      if (lecturerResults.length === 0) {
        showToast("Please choose a quiz with student data first.", false);
        return;
      }
      generateLecturerResultsExcel();
    });
  }

  if (paperBtn) {
    paperBtn.addEventListener('click', () => {
      audio.playClick();
      if (!activeQuiz) {
        showToast("Please choose a quiz room first.", false);
        return;
      }
      generateQuizAnswerKeyPDF(activeQuiz);
    });
  }

  if (summaryBtn) {
    summaryBtn.addEventListener('click', () => {
      audio.playClick();
      if (lecturerResults.length === 0) {
        showToast("Please choose a quiz with student data first.", false);
        return;
      }
      generateLecturerQuizSummaryPDF();
    });
  }

  if (responseBtn) {
    responseBtn.addEventListener('click', () => {
      audio.playClick();
      if (lecturerResults.length === 0) {
        showToast("Please choose a quiz with student data first.", false);
        return;
      }
      generateLecturerResponseReportPDF();
    });
  }
}

function generateLecturerResultsPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const dateStr = new Date().toLocaleString();

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(139, 92, 246);
  doc.text("CLASS PERFORMANCE LEDGER", 14, 20);

  doc.setLineWidth(0.5);
  doc.setDrawColor(139, 92, 246);
  doc.line(14, 24, 196, 24);

  doc.setFontSize(10);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Quiz Title: ${activeQuiz.title}`, 14, 32);
  doc.text(`Room Code: ${activeQuiz.code}`, 14, 38);
  doc.text(`Category Genre: ${activeQuiz.genre}`, 14, 44);
  doc.text(`Generated On: ${dateStr}`, 14, 50);

  // Table header
  doc.setFont("Helvetica", "bold");
  doc.setFillColor(240, 240, 240);
  doc.rect(14, 60, 182, 8, "F");
  
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  doc.text("Rank", 16, 65);
  doc.text("Student Name", 32, 65);
  doc.text("Email", 82, 65);
  doc.text("Raw Score", 142, 65);
  doc.text("Percentage", 172, 65);

  let y = 74;
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(60, 60, 60);

  lecturerResults.forEach(r => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.text(String(r.rank), 16, y);
    doc.text(r.username.substring(0, 22), 32, y);
    doc.text(r.email.substring(0, 30), 82, y);
    doc.text(`${r.score} / ${r.totalQuestions}`, 142, y);
    doc.text(`${r.percentage}%`, 172, y);

    doc.setDrawColor(230, 230, 230);
    doc.line(14, y + 2, 196, y + 2);
    y += 9;
  });

  doc.save(`class-results-${activeQuiz.code}.pdf`);
  showToast("Results PDF downloaded!", true);
}

function generateLecturerResultsExcel() {
  if (!window.XLSX) {
    showToast("Excel package XLSX not loaded properly.", false);
    return;
  }

  const exportData = lecturerResults.map(r => ({
    "Rank": r.rank,
    "Student Name": r.username,
    "Email": r.email,
    "Raw Score": r.score,
    "Total Questions": r.totalQuestions,
    "Percentage": r.percentage,
    "Date Completed": new Date(r.timestamp).toLocaleString()
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Class Standings");

  XLSX.writeFile(wb, `class-results-${activeQuiz.code}.xlsx`);
  showToast("Results Excel workbook downloaded!", true);
}

function generateIndividualReportCardPDF(record) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Draw double borders
  doc.setLineWidth(1);
  doc.setDrawColor(139, 92, 246);
  doc.rect(10, 10, 190, 277);
  doc.setLineWidth(0.5);
  doc.rect(12, 12, 186, 273);

  // Logo / Title
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(139, 92, 246);
  doc.text("ACADEMIC PERFORMANCE REPORT CARD", 105, 45, { align: "center" });

  doc.setFontSize(14);
  doc.setTextColor(80, 80, 80);
  doc.text("BATTLEQUIZ COGNITIVE PORTAL", 105, 54, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("Helvetica", "normal");
  doc.text(`Date of Submission: ${new Date(record.timestamp).toLocaleDateString()}`, 105, 62, { align: "center" });

  // Main layout fields
  doc.setFontSize(12);
  doc.text("This official credential document certifies the testing metrics of:", 105, 90, { align: "center" });

  doc.setFontSize(20);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(0, 229, 255); // Cyan color
  doc.text(record.username, 105, 104, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`(${record.email})`, 105, 110, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.setFont("Helvetica", "normal");
  doc.text("for their completion of the academic challenge room:", 105, 125, { align: "center" });

  doc.setFontSize(16);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text(`"${activeQuiz.title}"`, 105, 137, { align: "center" });

  // Score statistics box
  doc.setFillColor(245, 245, 250);
  doc.rect(40, 155, 130, 60, "F");
  doc.setDrawColor(200, 200, 210);
  doc.rect(40, 155, 130, 60);

  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.setFont("Helvetica", "bold");
  doc.text("METRIC MEASURES", 105, 166, { align: "center" });

  doc.setFont("Helvetica", "normal");
  doc.text(`Raw Score:`, 55, 180);
  doc.text(`${record.score} of ${record.totalQuestions} Questions Correct`, 110, 180);

  doc.text(`Final Grade:`, 55, 190);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(0, 229, 255);
  doc.text(`${record.percentage}% Accuracy`, 110, 190);
  doc.setTextColor(80, 80, 80);
  doc.setFont("Helvetica", "normal");

  doc.text(`Class Rank:`, 55, 200);
  doc.text(`Ranked #${record.rank} in the classroom`, 110, 200);

  // Performance category note
  let rating = "Needs Improvement";
  if (record.percentage >= 90) rating = "Outstanding Achievement";
  else if (record.percentage >= 80) rating = "Excellent Competence";
  else if (record.percentage >= 70) rating = "Satisfactory Competence";
  else if (record.percentage >= 50) rating = "Passing Credit";

  doc.setFontSize(13);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(34, 197, 94); // Green
  doc.text(rating.toUpperCase(), 105, 240, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.setFont("Helvetica", "normal");
  doc.text("Authorized by the Academic Quiz Portal System", 105, 265, { align: "center" });

  doc.save(`report-card-${record.username.replace(/\s+/g, '_')}.pdf`);
  showToast(`Report Card downloaded for ${record.username}!`, true);
}

function generateLecturerQuizSummaryPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(139, 92, 246);
  doc.text("QUIZ ANALYSIS SUMMARY REPORT", 14, 20);

  doc.setLineWidth(0.5);
  doc.setDrawColor(139, 92, 246);
  doc.line(14, 24, 196, 24);

  doc.setFontSize(11);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(60, 60, 60);

  doc.text(`Quiz Title: ${activeQuiz.title}`, 14, 35);
  doc.text(`Quiz Subject: ${activeQuiz.genre}`, 14, 42);
  doc.text(`Access Join Code: ${activeQuiz.code}`, 14, 49);
  doc.text(`Time Limit: ${activeQuiz.timeLimit} seconds / Question`, 14, 56);
  doc.text(`Total Questions: ${activeQuiz.questions.length}`, 14, 63);

  // Aggregate metrics
  let totalPct = 0;
  let highest = 0;
  let lowest = 100;
  lecturerResults.forEach(r => {
    totalPct += r.percentage;
    if (r.percentage > highest) highest = r.percentage;
    if (r.percentage < lowest) lowest = r.percentage;
  });

  const averagePct = lecturerResults.length > 0 ? Math.round(totalPct / lecturerResults.length) : 0;
  const completionCount = lecturerResults.length;

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Performance Measures Summary", 14, 80);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Total Submissions: ${completionCount} Student attempts`, 14, 90);
  doc.text(`Highest Scored Grade: ${highest}%`, 14, 97);
  doc.text(`Lowest Scored Grade: ${lowest}%`, 14, 104);
  doc.text(`Average Classroom Grade: ${averagePct}%`, 14, 111);

  // Grade buckets count
  let aCount = 0, bCount = 0, cCount = 0, fCount = 0;
  lecturerResults.forEach(r => {
    if (r.percentage >= 90) aCount++;
    else if (r.percentage >= 70) bCount++;
    else if (r.percentage >= 50) cCount++;
    else fCount++;
  });

  doc.setFont("Helvetica", "bold");
  doc.text("Grade Distribution Details:", 14, 125);
  doc.setFont("Helvetica", "normal");
  doc.text(`Outstanding (>=90%): ${aCount} students`, 18, 133);
  doc.text(`Good/Excellent (70-90%): ${bCount} students`, 18, 140);
  doc.text(`Average Passing (50-70%): ${cCount} students`, 18, 147);
  doc.text(`Needs Improvement (<50%): ${fCount} students`, 18, 154);

  doc.save(`quiz-summary-${activeQuiz.code}.pdf`);
  showToast("Quiz Summary report downloaded!", true);
}

function generateLecturerResponseReportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const dateStr = new Date().toLocaleString();

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(0, 229, 255);
  doc.text("STUDENT RESPONSE ANALYSIS REPORT", 14, 20);

  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 229, 255);
  doc.line(14, 24, 196, 24);

  doc.setFontSize(10);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Quiz Title: ${activeQuiz.title}`, 14, 32);
  doc.text(`Room Code: ${activeQuiz.code}`, 14, 38);
  doc.text(`Generated: ${dateStr}`, 14, 44);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Overview Student Answer Matrix", 14, 55);

  let y = 65;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);

  lecturerResults.forEach((r, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("Helvetica", "bold");
    doc.text(`${idx + 1}. Student: ${r.username} (Score: ${r.score}/${r.totalQuestions})`, 14, y);
    y += 5;

    doc.setFont("Helvetica", "normal");
    doc.text(`Performance: ${r.percentage}% accuracy`, 18, y);
    y += 8;
  });

  doc.save(`student-responses-${activeQuiz.code}.pdf`);
  showToast("Student Response Report downloaded!", true);
}

// -------------------------------------------------------------
// Real-Time Leaderboards Engine
// -------------------------------------------------------------
function setupLeaderboardToggles() {
  const tabQuiz = document.getElementById('lead-scope-quiz');
  const tabGlobal = document.getElementById('lead-scope-global');
  const searchBar = document.getElementById('lead-room-search-bar');
  const btnSearch = document.getElementById('btn-lead-search');
  const playerSearchInput = document.getElementById('lead-player-name-input');
  const btnPlayerSearch = document.getElementById('btn-lead-player-search');

  const filterLeaderboardByPlayerName = () => {
    const q = playerSearchInput ? playerSearchInput.value.trim().toLowerCase() : '';
    const isGlobal = (currentLeaderboardScope === 'global');

    if (!q) {
      const originalSliced = isGlobal ? currentLeaderboardEntries.slice(0, 10) : currentLeaderboardEntries;
      renderLeaderboardTable(originalSliced, isGlobal);
      return;
    }

    const filtered = currentLeaderboardEntries.filter(u =>
      (u.username || '').toLowerCase().includes(q)
    );
    renderLeaderboardTable(filtered, isGlobal);
  };

  if (tabQuiz && tabGlobal) {
    tabQuiz.addEventListener('click', () => {
      audio.playClick();
      currentLeaderboardScope = 'quiz';
      tabQuiz.className = "px-4 py-2 text-xs font-bold rounded-lg text-white bg-white/10 shadow-sm transition-all duration-200";
      tabGlobal.className = "px-4 py-2 text-xs font-bold rounded-lg text-gray-400 hover:text-white transition-all duration-200";
      if (searchBar) searchBar.classList.remove('hidden');
      if (playerSearchInput) playerSearchInput.value = '';
      loadLeaderboardView();
    });

    tabGlobal.addEventListener('click', () => {
      audio.playClick();
      currentLeaderboardScope = 'global';
      tabGlobal.className = "px-4 py-2 text-xs font-bold rounded-lg text-white bg-white/10 shadow-sm transition-all duration-200";
      tabQuiz.className = "px-4 py-2 text-xs font-bold rounded-lg text-gray-400 hover:text-white transition-all duration-200";
      if (searchBar) searchBar.classList.add('hidden');
      if (playerSearchInput) playerSearchInput.value = '';
      loadLeaderboardView();
    });
  }

  if (btnSearch) {
    btnSearch.addEventListener('click', () => {
      audio.playClick();
      const code = document.getElementById('lead-quiz-id-input').value.trim().toUpperCase();
      if (!code) {
        showToast("Please enter a room code.", false);
        return;
      }
      activeQuizIdForLeaderboard = code;
      loadLeaderboardView();
    });
  }

  if (playerSearchInput) {
    playerSearchInput.addEventListener('input', filterLeaderboardByPlayerName);
  }

  if (btnPlayerSearch) {
    btnPlayerSearch.addEventListener('click', () => {
      audio.playClick();
      filterLeaderboardByPlayerName();
    });
  }
}

async function loadLeaderboardView() {
  if (unsubscribeLeaderboard) {
    unsubscribeLeaderboard();
    unsubscribeLeaderboard = null;
  }

  const containerDetails = document.getElementById('lead-quiz-details');
  const rowsList = document.getElementById('leaderboard-rows-list');
  const leadRoomSearch = document.getElementById('lead-room-search-bar');

  resetPodiumUI();

  const playerSearchInput = document.getElementById('lead-player-name-input');
  if (playerSearchInput) playerSearchInput.value = '';

  if (currentLeaderboardScope === 'global') {
    if (containerDetails) containerDetails.classList.add('hidden');
    if (leadRoomSearch) leadRoomSearch.classList.add('hidden');

    rowsList.innerHTML = `<tr><td colspan="4" class="text-center text-gray-500 py-10"><i class="fa-solid fa-circle-notch animate-spin mr-2"></i>Loading Global Standings...</td></tr>`;

    try {
      const champions = await dbService.getGlobalLeaderboard();
      champions.forEach((c, idx) => { c.rank = idx + 1; });
      currentLeaderboardEntries = champions;
      renderLeaderboardTable(champions.slice(0, 10), true);
    } catch (e) {
      rowsList.innerHTML = `<tr><td colspan="4" class="text-center text-rose-400 py-10">Failed to load global standings.</td></tr>`;
    }

  } else {
    if (leadRoomSearch) leadRoomSearch.classList.remove('hidden');

    if (!activeQuizIdForLeaderboard) {
      if (containerDetails) containerDetails.classList.add('hidden');
      rowsList.innerHTML = `<tr><td colspan="4" class="text-center text-gray-500 py-10">Search for a Quiz Room Code to load its leaderboard!</td></tr>`;
      return;
    }

    document.getElementById('lead-quiz-id-input').value = activeQuizIdForLeaderboard;
    rowsList.innerHTML = `<tr><td colspan="4" class="text-center text-gray-500 py-10"><i class="fa-solid fa-circle-notch animate-spin mr-2"></i>Accessing Room Leaderboard...</td></tr>`;

    try {
      const quiz = await dbService.getQuiz(activeQuizIdForLeaderboard);

      if (containerDetails) {
        containerDetails.classList.remove('hidden');
        document.getElementById('lead-badge-genre').textContent = quiz.genre;
        updateGenreBadgeColors(document.getElementById('lead-badge-genre'), quiz.genre);
        document.getElementById('lead-text-title').textContent = quiz.title;
        document.getElementById('lead-text-desc').textContent = quiz.description || "No description provided.";
        document.getElementById('lead-text-code').textContent = quiz.id;
      }

      unsubscribeLeaderboard = dbService.listenToQuizLeaderboard(activeQuizIdForLeaderboard, (attempts) => {
        attempts.forEach((a, idx) => { a.rank = idx + 1; });
        currentLeaderboardEntries = attempts;

        const playerSearchVal = playerSearchInput ? playerSearchInput.value.trim().toLowerCase() : '';
        if (playerSearchVal) {
          const filtered = attempts.filter(a => (a.username || '').toLowerCase().includes(playerSearchVal));
          renderLeaderboardTable(filtered, false);
        } else {
          renderLeaderboardTable(attempts, false);
        }
      });

    } catch (err) {
      if (containerDetails) containerDetails.classList.add('hidden');
      rowsList.innerHTML = `<tr><td colspan="4" class="text-center text-rose-400 py-10">${err.message}</td></tr>`;
    }
  }
}

function resetPodiumUI() {
  [1, 2, 3].forEach(rank => {
    document.getElementById(`podium-${rank}-name`).textContent = "--";
    document.getElementById(`podium-${rank}-score`).textContent = "--";
    const avatar = document.getElementById(`podium-${rank}-avatar`);
    if (avatar) avatar.innerHTML = rank;
  });
}

function renderLeaderboardTable(entries, isGlobal = false) {
  const rowsList = document.getElementById('leaderboard-rows-list');

  if (!entries || entries.length === 0) {
    rowsList.innerHTML = `<tr><td colspan="4" class="text-center text-gray-500 py-10">No scores recorded yet. Be the first to join the room!</td></tr>`;
    resetPodiumUI();
    return;
  }

  const podiumConfig = [
    { rank: 1, colorClass: 'text-neonYellow border-neonYellow bg-amber-950/20 shadow-neon-yellow' },
    { rank: 2, colorClass: 'text-slate-300 border-slate-400 bg-slate-900/30' },
    { rank: 3, colorClass: 'text-orange-400 border-orange-500 bg-orange-950/20' }
  ];

  podiumConfig.forEach(cfg => {
    const entryIndex = cfg.rank - 1;
    const nameEl = document.getElementById(`podium-${cfg.rank}-name`);
    const scoreEl = document.getElementById(`podium-${cfg.rank}-score`);
    const avatarEl = document.getElementById(`podium-${cfg.rank}-avatar`);

    if (entryIndex < entries.length) {
      const u = entries[entryIndex];
      const name = u.username;
      const score = isGlobal ? `${u.totalScore} pts (${u.totalQuizzesTaken} Q)` : `${u.percentage}%`;

      nameEl.textContent = name;
      scoreEl.textContent = score;

      if (avatarEl) {
        const uppercaseInitial = (name || '?').charAt(0).toUpperCase();
        avatarEl.innerHTML = `
          ${uppercaseInitial}
          ${u.rank === 1 ? '<i class="fa-solid fa-crown absolute -top-4 left-1/2 -translate-x-1/2 text-neonYellow text-md animate-bounce"></i>' : ''}
        `;
        avatarEl.className = `w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center font-display font-bold relative mb-2 ${cfg.colorClass}`;
      }
    } else {
      nameEl.textContent = "--";
      scoreEl.textContent = "--";
      if (avatarEl) {
        avatarEl.textContent = cfg.rank;
        avatarEl.className = `w-12 h-12 rounded-full border border-gray-800 bg-gray-950 flex items-center justify-center font-display font-bold text-gray-500 relative mb-2`;
      }
    }
  });

  rowsList.innerHTML = entries.map((u, index) => {
    const rank = u.rank || (index + 1);
    let rankBadge = `<span class="text-sm font-bold text-gray-400">${rank}</span>`;

    if (rank === 1) rankBadge = `<span class="w-7 h-7 rounded-full bg-neonYellow/20 border border-neonYellow/40 text-neonYellow flex items-center justify-center text-xs font-bold shadow-neon-yellow"><i class="fa-solid fa-crown text-[10px]"></i></span>`;
    else if (rank === 2) rankBadge = `<span class="w-7 h-7 rounded-full bg-slate-400/20 border border-slate-400/40 text-slate-300 flex items-center justify-center text-xs font-bold"><i class="fa-solid fa-medal text-[10px]"></i></span>`;
    else if (rank === 3) rankBadge = `<span class="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center text-xs font-bold"><i class="fa-solid fa-medal text-[10px]"></i></span>`;

    const name = u.username;
    let scoreDisplay = '';
    let detailDisplay = '';

    if (isGlobal) {
      scoreDisplay = `<span class="font-bold text-white text-glow-cyan">${u.totalScore} pts</span>`;
      detailDisplay = `<span class="text-xs text-gray-500">${u.totalQuizzesTaken} Quizzes</span>`;
    } else {
      scoreDisplay = `<span class="font-bold text-neonGreen text-glow-green">${u.percentage}%</span>`;
      const dateStr = u.timestamp ? new Date(u.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
      detailDisplay = `<span class="text-xs text-gray-500">${dateStr}</span>`;
    }

    return `
      <tr class="border-b border-glassBorder/40 hover:bg-white/5 transition-colors">
        <td class="py-4 text-center flex justify-center">${rankBadge}</td>
        <td class="py-4 pl-4">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-lg bg-neonPurple/10 text-neonPurple border border-neonPurple/20 flex items-center justify-center font-display font-semibold text-xs uppercase">${(name || '?').charAt(0)}</div>
            <span class="text-xs font-semibold text-gray-200">${name}</span>
          </div>
        </td>
        <td class="py-4 text-center text-sm">${scoreDisplay}</td>
        <td class="py-4 text-right text-xs font-medium">${detailDisplay}</td>
      </tr>
    `;
  }).join('');
}

// -------------------------------------------------------------
// Personal Analytics Screen Actions
// -------------------------------------------------------------
async function loadProfileView() {
  if (!currentUser) return;

  const avatarBadge = document.getElementById('prof-avatar-badge');
  const usernameTxt = document.getElementById('prof-username-txt');
  const emailTxt = document.getElementById('prof-email-txt');
  const totalScoreEl = document.getElementById('prof-metric-total-score');
  const favGenreEl = document.getElementById('prof-metric-fav-genre');
  const quizzesEl = document.getElementById('prof-metric-quizzes');
  const avgAccuracyEl = document.getElementById('prof-metric-avg');

  const roleTextBadge = document.getElementById('prof-role-badge');
  if (roleTextBadge) {
    roleTextBadge.textContent = currentRole === 'lecturer' ? "Certified Instructor" : "Active Competitor";
    roleTextBadge.className = currentRole === 'lecturer' 
      ? "inline-block mt-3 px-3 py-1 bg-neonPurple/15 border border-neonPurple/30 text-neonPurple rounded-full text-xs font-bold uppercase tracking-wider text-glow-purple"
      : "inline-block mt-3 px-3 py-1 bg-neonCyan/15 border border-neonCyan/30 text-neonCyan rounded-full text-xs font-bold uppercase tracking-wider text-glow-cyan";
  }

  if (avatarBadge) avatarBadge.textContent = (currentUser.displayName || 'Explorer').charAt(0).toUpperCase();
  if (usernameTxt) usernameTxt.textContent = currentUser.displayName || 'Explorer';
  if (emailTxt) emailTxt.textContent = currentUser.email || 'username@domain.com';

  if (totalScoreEl) totalScoreEl.textContent = "...";
  if (favGenreEl) favGenreEl.textContent = "...";
  if (quizzesEl) quizzesEl.textContent = "...";
  if (avgAccuracyEl) avgAccuracyEl.textContent = "...";

  try {
    const attempts = await dbService.getUserAttempts(currentUser.uid);
    const profile = await authService.getUserProfile(currentUser.uid);
    const historyList = document.getElementById('profile-history-list');

    if (!attempts || attempts.length === 0) {
      if (totalScoreEl) totalScoreEl.textContent = profile ? (profile.totalScore || 0) : 0;
      if (favGenreEl) favGenreEl.textContent = "None";
      if (quizzesEl) quizzesEl.textContent = "0";
      if (avgAccuracyEl) avgAccuracyEl.textContent = "0%";

      if (historyList) {
        historyList.innerHTML = `<div class="text-center py-12 text-gray-500 text-sm">You haven't played any quizzes yet! Enter a code on the dashboard to join.</div>`;
      }

      renderAnalyticsCharts([]);
      return;
    }

    const totalQuizzes = attempts.length;
    const totalScore = profile ? (profile.totalScore || 0) : 0;

    let totalCorrect = 0;
    let totalQuestions = 0;
    const genreTracker = {};

    attempts.forEach(att => {
      const correct = parseInt(att.score) || 0;
      const total = parseInt(att.totalQuestions) || 5;
      totalCorrect += correct;
      totalQuestions += total;

      if (att.genre) {
        genreTracker[att.genre] = (genreTracker[att.genre] || 0) + 1;
      }
    });

    const accuracyRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    let favGenre = 'None';
    let maxCount = 0;
    Object.keys(genreTracker).forEach(genre => {
      if (genreTracker[genre] > maxCount) {
        maxCount = genreTracker[genre];
        favGenre = genre;
      }
    });

    if (totalScoreEl) totalScoreEl.textContent = totalScore;
    if (favGenreEl) favGenreEl.textContent = favGenre;
    if (quizzesEl) quizzesEl.textContent = totalQuizzes;
    if (avgAccuracyEl) avgAccuracyEl.textContent = `${accuracyRate}%`;

    renderAnalyticsCharts(attempts);

    if (historyList) {
      const sortedLatestFirst = attempts.slice().reverse();

      historyList.innerHTML = sortedLatestFirst.map(att => {
        let percentColorBar = 'bg-neonPink';
        let percentTextColor = 'text-neonPink';
        if (att.percentage >= 70) {
          percentColorBar = 'bg-neonGreen';
          percentTextColor = 'text-neonGreen text-glow-green';
        } else if (att.percentage >= 40) {
          percentColorBar = 'bg-neonYellow';
          percentTextColor = 'text-neonYellow text-glow-yellow';
        } else {
          percentColorBar = 'bg-neonPink';
          percentTextColor = 'text-neonPink text-glow-pink';
        }

        const dateStr = att.timestamp ? new Date(att.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown Time';

        return `
          <div class="glass-panel rounded-2xl p-5 border border-glassBorder/60 hover:border-neonCyan/30 hover:scale-[1.005] transition-all duration-200 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div class="absolute top-0 left-0 bottom-0 w-1.5 ${percentColorBar}"></div>

            <div class="flex-grow pl-4 space-y-2 text-left w-full">
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="font-display font-bold text-white text-base leading-snug">${escapeHtml(att.quizTitle)}</h4>
                <span class="px-2 py-0.5 bg-gray-950 border border-glassBorder font-mono text-[9px] font-bold text-gray-400 rounded-md tracking-wider shadow-sm uppercase cursor-pointer hover:border-neonCyan hover:text-white transition-colors" onclick="navigator.clipboard.writeText('${att.quizId}'); showToast('Room code copied!', true);" title="Click to copy Room Code">${att.quizId}</span>
              </div>

              <div class="flex flex-wrap items-center gap-4 text-xs">
                <span id="badge-genre-${att.id}" class="uppercase font-extrabold text-[9px] tracking-wider"></span>
                <span class="text-gray-400 font-semibold">Score: <strong class="text-white">${att.score}</strong> / ${att.totalQuestions}</span>
                <span class="text-gray-400 font-semibold">Accuracy: <strong class="${percentTextColor}">${att.percentage}%</strong></span>
                <span class="text-gray-500 text-[10px] ml-auto font-bold flex items-center"><i class="fa-regular fa-calendar-days mr-1.5 text-neonCyan"></i>${dateStr}</span>
              </div>
            </div>

            <div class="flex items-center justify-center bg-gray-950/40 border border-glassBorder/60 rounded-xl p-2 relative w-[140px] h-[90px]">
              <canvas id="miniChart-${att.id}"></canvas>
            </div>
          </div>
        `;
      }).join('');

      sortedLatestFirst.forEach(att => {
        const badgeEl = document.getElementById(`badge-genre-${att.id}`);
        if (badgeEl) {
          badgeEl.textContent = att.genre || 'Other';
          updateGenreBadgeColors(badgeEl, att.genre || 'Other');
        }

        const ctxMini = document.getElementById(`miniChart-${att.id}`);
        if (ctxMini) {
          const correctCount = parseInt(att.score) || 0;
          const incorrectCount = (parseInt(att.totalQuestions) || 5) - correctCount;

          new window.Chart(ctxMini, {
            type: 'doughnut',
            data: {
              labels: ['Correct', 'Wrong'],
              datasets: [{
                data: [correctCount, incorrectCount],
                backgroundColor: [
                  'rgba(34, 197, 94, 0.35)',
                  'rgba(255, 0, 127, 0.35)'
                ],
                borderColor: ['#22C55E', '#ff007f'],
                borderWidth: 1.5
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '65%',
              plugins: {
                legend: { display: false },
                tooltip: {
                  enabled: true,
                  callbacks: {
                    label: function(context) {
                      return ` ${context.label}: ${context.raw}`;
                    }
                  }
                }
              }
            }
          });
        }
      });
    }

  } catch (err) {
    console.error("Failed to load user profile view stats:", err);
  }
}

// -------------------------------------------------------------
// Interactive Web Audio Sound Control
// -------------------------------------------------------------
function setupAudioControl() {
  const btn = document.getElementById('audio-toggle');
  const icon = document.getElementById('audio-icon');
  if (!btn || !icon) return;

  updateAudioIcon(audio.getMuteState());

  btn.addEventListener('click', () => {
    const isMuted = audio.toggleMute();
    updateAudioIcon(isMuted);

    if (!isMuted) {
      audio.playClick();
      showToast("Sounds Unmuted", true);
    } else {
      showToast("Sounds Muted", true);
    }
  });

  function updateAudioIcon(isMuted) {
    if (isMuted) {
      icon.className = "fa-solid fa-volume-xmark text-rose-500";
      btn.className = "w-10 h-10 rounded-lg flex items-center justify-center bg-rose-950/20 border border-rose-900/30 text-rose-400 hover:text-white transition-all duration-200";
    } else {
      icon.className = "fa-solid fa-volume-high text-neonCyan";
      btn.className = "w-10 h-10 rounded-lg flex items-center justify-center bg-gray-900/60 border border-glassBorder text-gray-400 hover:text-white hover:border-neonCyan transition-all duration-200";
    }
  }
}

// -------------------------------------------------------------
// Global Toast Alerts
// -------------------------------------------------------------
function showToast(message, isSuccess = true) {
  const toast = document.getElementById('global-toast');
  const text = document.getElementById('toast-message');
  const icon = document.getElementById('toast-icon');

  if (!toast || !text || !icon) return;

  text.textContent = message;

  if (isSuccess) {
    icon.className = "fa-solid fa-circle-check text-neonGreen text-xl";
    toast.className = "fixed bottom-6 right-6 z-50 transform transition-all duration-300 flex items-center space-x-3 px-5 py-4 rounded-xl glass-panel border-l-4 border-l-neonGreen shadow-neon-green pointer-events-none";
  } else {
    icon.className = "fa-solid fa-triangle-exclamation text-neonPink text-xl";
    toast.className = "fixed bottom-6 right-6 z-50 transform transition-all duration-300 flex items-center space-x-3 px-5 py-4 rounded-xl glass-panel border-l-4 border-l-neonPink shadow-neon-pink pointer-events-none";
  }

  toast.classList.remove('translate-y-20', 'opacity-0');

  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 4000);
}

// Helper to determine custom badge accent styles for genres
function updateGenreBadgeColors(badgeElement, genreName) {
  const normalized = (genreName || '').trim().toLowerCase();

  if (normalized.includes('cod')) {
    badgeElement.className = "px-3 py-1 bg-neonPurple/20 border border-neonPurple/30 rounded-full text-xs font-bold text-neonPurple uppercase";
  } else if (normalized.includes('gen')) {
    badgeElement.className = "px-3 py-1 bg-neonCyan/20 border border-neonCyan/30 rounded-full text-xs font-bold text-neonCyan uppercase";
  } else if (normalized.includes('sci')) {
    badgeElement.className = "px-3 py-1 bg-neonGreen/20 border border-neonGreen/30 rounded-full text-xs font-bold text-neonGreen uppercase";
  } else if (normalized.includes('his')) {
    badgeElement.className = "px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-bold text-amber-500 uppercase";
  } else if (normalized.includes('pop')) {
    badgeElement.className = "px-3 py-1 bg-neonPink/20 border border-neonPink/30 rounded-full text-xs font-bold text-neonPink uppercase";
  } else {
    badgeElement.className = "px-3 py-1 bg-gray-500/20 border border-gray-500/30 rounded-full text-xs font-bold text-gray-400 uppercase";
  }
}

function renderReviewSheet() {
  const reviewList = document.getElementById('review-list');
  if (!reviewList) return;

  reviewList.innerHTML = '';
  const choiceLetters = ['A', 'B', 'C', 'D'];

  quizQuestions.forEach((q, qIdx) => {
    const selectedOption = userSelections[qIdx];
    const correctOption = q.correctOption;

    let statusBadge = '';
    let borderLeftClass = '';

    if (selectedOption === null || selectedOption === undefined) {
      statusBadge = `<span class="px-3 py-1 bg-neonYellow/20 border border-neonYellow/30 rounded-full text-[10px] font-bold text-neonYellow uppercase flex items-center"><i class="fa-regular fa-clock mr-1"></i>Timed Out</span>`;
      borderLeftClass = 'border-l-neonYellow shadow-neon-yellow/5';
    } else if (selectedOption === correctOption) {
      statusBadge = `<span class="px-3 py-1 bg-neonGreen/20 border border-neonGreen/30 rounded-full text-[10px] font-bold text-neonGreen uppercase flex items-center"><i class="fa-solid fa-circle-check mr-1"></i>Correct</span>`;
      borderLeftClass = 'border-l-neonGreen shadow-neon-green/5';
    } else {
      statusBadge = `<span class="px-3 py-1 bg-neonPink/20 border border-neonPink/30 rounded-full text-[10px] font-bold text-neonPink uppercase flex items-center"><i class="fa-solid fa-circle-xmark mr-1"></i>Incorrect</span>`;
      borderLeftClass = 'border-l-neonPink shadow-neon-pink/5';
    }

    const optionsHtml = q.options.map((optText, optIdx) => {
      let optionClass = "flex items-center space-x-3 p-3.5 rounded-xl border text-xs font-medium transition-all duration-200 bg-white/5 border-glassBorder text-gray-300";
      let indicatorHtml = `<span class="w-6 h-6 rounded bg-white/5 border border-glassBorder flex items-center justify-center font-display font-bold text-[10px] text-gray-500">${choiceLetters[optIdx]}</span>`;
      let suffixHtml = '';

      if (optIdx === correctOption) {
        optionClass = "flex items-center space-x-3 p-3.5 rounded-xl border text-xs font-bold transition-all duration-200 bg-neonGreen/10 border-neonGreen/40 text-neonGreen shadow-neon-green/5";
        indicatorHtml = `<span class="w-6 h-6 rounded bg-neonGreen text-darkBg border border-neonGreen flex items-center justify-center font-display font-extrabold text-[10px]"><i class="fa-solid fa-check"></i></span>`;
        suffixHtml = `<span class="ml-auto text-[9px] font-bold uppercase tracking-wider text-neonGreen bg-neonGreen/10 px-2 py-0.5 rounded border border-neonGreen/20">Correct Option</span>`;
      } else if (optIdx === selectedOption) {
        optionClass = "flex items-center space-x-3 p-3.5 rounded-xl border text-xs font-bold transition-all duration-200 bg-neonPink/10 border-neonPink/40 text-neonPink shadow-neon-pink/5";
        indicatorHtml = `<span class="w-6 h-6 rounded bg-neonPink text-white border border-neonPink flex items-center justify-center font-display font-extrabold text-[10px]"><i class="fa-solid fa-xmark"></i></span>`;
        suffixHtml = `<span class="ml-auto text-[9px] font-bold uppercase tracking-wider text-neonPink bg-neonPink/10 px-2 py-0.5 rounded border border-neonPink/20">Your Choice</span>`;
      }

      return `
        <div class="${optionClass}">
          ${indicatorHtml}
          <span>${escapeHtml(optText)}</span>
          ${suffixHtml}
        </div>
      `;
    }).join('');

    const questionCard = `
      <div class="glass-panel rounded-2xl p-5 border border-glassBorder border-l-4 ${borderLeftClass} space-y-4 hover:scale-[1.01] transition-transform duration-200">
        <div class="flex justify-between items-center">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Question #${qIdx + 1} of ${quizQuestions.length}</span>
          ${statusBadge}
        </div>
        <p class="text-sm font-semibold text-white leading-relaxed">${escapeHtml(q.questionText)}</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          ${optionsHtml}
        </div>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = questionCard;
    reviewList.appendChild(wrapper.firstElementChild);
  });
}

function setupGameplayActions() {
  const btnNext = document.getElementById('btn-next-question');
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      audio.playClick();
      if (userSelectedOption === null) {
        showToast("Please choose an answer first, or let the timer run out.", false);
        return;
      }

      if (quizTimer) clearInterval(quizTimer);
      advanceQuizState();
    });
  }

  const btnReview = document.getElementById('btn-review-answers');
  const reviewPanel = document.getElementById('review-answers-panel');
  if (btnReview && reviewPanel) {
    btnReview.addEventListener('click', (e) => {
      e.preventDefault();
      audio.playClick();

      const isHidden = reviewPanel.classList.contains('hidden');
      if (isHidden) {
        renderReviewSheet();
        reviewPanel.classList.remove('hidden');
        setTimeout(() => {
          reviewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        reviewPanel.classList.add('hidden');
      }
    });
  }
}