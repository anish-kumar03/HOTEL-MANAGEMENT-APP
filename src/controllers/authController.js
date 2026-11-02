/**
 * =============================================================================
 * HOTEL RESERVATION & MANAGEMENT SYSTEM (HRMS)
 * Authentication Controller
 * =============================================================================
 * 
 * Manages:
 * - Rendering administrator login view
 * - Processing login submissions with session creation
 * - Terminating sessions on logout
 * =============================================================================
 */

import authService from '../services/authService.js';

/**
 * Renders the administrator login screen.
 * Redirects to dashboard if already authenticated.
 */
export async function renderLogin(req, res) {
  if (req.session && req.session.adminUser) {
    return res.redirect('/');
  }

  const { error, logout, timeout } = req.query;
  let errorMessage = null;
  let successMessage = null;

  if (error === 'unauthorized') {
    errorMessage = 'Please sign in to access the administrative dashboard.';
  } else if (error === 'session_expired') {
    errorMessage = 'Your session has expired. Please sign in again.';
  }

  if (logout === 'success') {
    successMessage = 'You have been successfully signed out.';
  }

  res.render('auth/login', {
    title: 'Administrator Login | Grand Horizon Hotel',
    error: errorMessage,
    success: successMessage,
    formData: {
      username: ''
    }
  });
}

/**
 * Handles administrator authentication submission.
 */
export async function processLogin(req, res) {
  const { username, password } = req.body;

  // 1. Input Validation
  const validationErrors = authService.validateLoginInput({ username, password });
  if (validationErrors.length > 0) {
    return res.status(400).render('auth/login', {
      title: 'Administrator Login | Grand Horizon Hotel',
      error: validationErrors[0],
      success: null,
      formData: { username: username || '' }
    });
  }

  // 2. Authenticate credentials
  const authResult = await authService.authenticate(username, password);

  if (!authResult.success) {
    return res.status(401).render('auth/login', {
      title: 'Administrator Login | Grand Horizon Hotel',
      error: authResult.message,
      success: null,
      formData: { username: username || '' }
    });
  }

  // 3. Establish secure session
  const targetRedirect = req.session.returnTo || '/';
  
  req.session.regenerate((err) => {
    if (err) {
      console.error('[Auth Session Error]: Failed to regenerate session:', err);
      return res.status(500).render('error', {
        title: 'Authentication Error',
        message: 'Could not establish secure administrator session.',
        error: err
      });
    }

    req.session.adminUser = authResult.user;

    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('[Auth Session Error]: Failed to save session:', saveErr);
        return res.status(500).render('error', {
          title: 'Authentication Error',
          message: 'Could not persist administrator session.',
          error: saveErr
        });
      }

      return res.redirect(targetRedirect);
    });
  });
}

/**
 * Terminates administrator session and clears session cookie.
 */
export async function logout(req, res) {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('[Auth Logout Error]: Failed to destroy session:', err);
      }
      res.clearCookie('hrms_session_id');
      return res.redirect('/login?logout=success');
    });
  } else {
    res.clearCookie('hrms_session_id');
    return res.redirect('/login?logout=success');
  }
}

export default {
  renderLogin,
  processLogin,
  logout
};

