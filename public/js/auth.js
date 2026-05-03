/* ===== AUTHENTICATION (Local Fallback — No Firebase Required) ===== */
export function initAuth() {
  const authBtn = document.getElementById('authBtn');
  const authModal = document.getElementById('authModalOverlay');
  const authModalClose = document.getElementById('authModalClose');
  const emailInput = document.getElementById('authEmailInput');
  const passwordInput = document.getElementById('authPasswordInput');
  const emailLoginBtn = document.getElementById('emailLoginBtn');
  const emailSignUpBtn = document.getElementById('emailSignUpBtn');

  if (!authBtn || !authModal) return;

  // ------------------------------------------------------------------
  // Helper: update button to logged-in state
  // ------------------------------------------------------------------
  function setLoggedIn(email) {
    const display = email.split('@')[0];
    authBtn.textContent = `👤 ${display}`;
    authBtn.title = `Logged in as ${email} — click to logout`;
    authBtn.onclick = () => {
      localStorage.removeItem('indivote_user');
      localStorage.removeItem('indivote_pass');
      authBtn.textContent = 'Login';
      authBtn.title = '';
      authBtn.onclick = openModal;
    };
  }

  // ------------------------------------------------------------------
  // Helper: open the modal
  // ------------------------------------------------------------------
  function openModal() {
    authModal.style.display = 'flex';
    authModal.setAttribute('aria-hidden', 'false');
    if (emailInput) emailInput.focus();
  }

  // ------------------------------------------------------------------
  // Helper: close the modal
  // ------------------------------------------------------------------
  function closeModal() {
    authModal.style.display = 'none';
    authModal.setAttribute('aria-hidden', 'true');
  }

  // ------------------------------------------------------------------
  // Restore session from localStorage
  // ------------------------------------------------------------------
  const savedUser = localStorage.getItem('indivote_user');
  if (savedUser) {
    setLoggedIn(savedUser);
  } else {
    authBtn.addEventListener('click', openModal);
  }

  // Also add a delegated listener as backup (covers cases where onclick is wiped)
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'authBtn' && authBtn.textContent.trim() === 'Login') {
      openModal();
    }
  });

  // Close button
  if (authModalClose) authModalClose.onclick = closeModal;

  // Click outside modal backdrop
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) closeModal();
  });

  // ------------------------------------------------------------------
  // Login handler
  // ------------------------------------------------------------------
  if (emailLoginBtn) {
    emailLoginBtn.addEventListener('click', () => {
      const email = emailInput ? emailInput.value.trim() : '';
      const pass = passwordInput ? passwordInput.value.trim() : '';

      if (!email || !email.includes('@')) {
        showModalError('Please enter a valid email address.');
        return;
      }

      // Check if the user is registered
      const storedEmail = localStorage.getItem('indivote_user');
      const storedPass = localStorage.getItem('indivote_pass');

      if (storedEmail && storedEmail !== email) {
        showModalError('No account found for this email. Please sign up first.');
        return;
      }

      if (storedEmail && storedPass && storedPass !== pass) {
        showModalError('Incorrect password. Please try again.');
        return;
      }

      // First-time or re-login
      localStorage.setItem('indivote_user', email);
      if (pass) localStorage.setItem('indivote_pass', pass);
      closeModal();
      setLoggedIn(email);
      showSuccessToast(`Welcome back, ${email.split('@')[0]}! 🎉`);
    });
  }

  // ------------------------------------------------------------------
  // Sign Up handler
  // ------------------------------------------------------------------
  if (emailSignUpBtn) {
    emailSignUpBtn.addEventListener('click', () => {
      const email = emailInput ? emailInput.value.trim() : '';
      const pass = passwordInput ? passwordInput.value.trim() : '';

      if (!email || !email.includes('@')) {
        showModalError('Please enter a valid email address.');
        return;
      }
      if (!pass || pass.length < 6) {
        showModalError('Password must be at least 6 characters.');
        return;
      }

      localStorage.setItem('indivote_user', email);
      localStorage.setItem('indivote_pass', pass);
      closeModal();
      setLoggedIn(email);
      showSuccessToast(`Account created! Welcome to IndiVote, ${email.split('@')[0]}! 🗳️`);
    });
  }

  // ------------------------------------------------------------------
  // Enter key submits login
  // ------------------------------------------------------------------
  [emailInput, passwordInput].forEach((el) => {
    if (el) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (emailLoginBtn) emailLoginBtn.click();
        }
      });
    }
  });
}

// ------------------------------------------------------------------
// Inline error inside modal
// ------------------------------------------------------------------
function showModalError(msg) {
  let errEl = document.getElementById('authInlineError');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.id = 'authInlineError';
    errEl.style.cssText =
      'color:#ff6b6b;font-size:0.85rem;text-align:center;margin-top:0.5rem;';
    const loginBtn = document.getElementById('emailLoginBtn');
    if (loginBtn && loginBtn.parentElement)
      loginBtn.parentElement.after(errEl);
  }
  errEl.textContent = msg;
  setTimeout(() => {
    if (errEl) errEl.textContent = '';
  }, 4000);
}

// ------------------------------------------------------------------
// Toast notification
// ------------------------------------------------------------------
function showSuccessToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
    background: linear-gradient(135deg, #ff8c00, #e84393);
    color: #fff; padding: 0.85rem 1.75rem; border-radius: 2rem;
    font-family: inherit; font-size: 0.9rem; font-weight: 600;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4); z-index: 99999;
    animation: toastIn 0.35s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
