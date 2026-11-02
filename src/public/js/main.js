/**
 * Hotel Reservation & Management System (HRMS)
 * Premium Client-Side Application Script
 * Phase 8: Enhanced User Interactions, Sidebar Toggle, Loading States & Confirmations
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Sidebar Mobile Toggle & Backdrop Handling
  const sidebar = document.getElementById('appSidebar');
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const backdrop = document.getElementById('sidebarBackdrop');

  if (toggleBtn && sidebar && backdrop) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sidebar.classList.toggle('show');
      backdrop.classList.toggle('show');
    });

    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('show');
      backdrop.classList.remove('show');
    });

    // Close sidebar on mobile when navigating links
    const navLinks = sidebar.querySelectorAll('.sidebar-link');
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 992) {
          sidebar.classList.remove('show');
          backdrop.classList.remove('show');
        }
      });
    });
  }

  // 2. Live Topbar Clock
  const clockElement = document.getElementById('topbarClock');
  if (clockElement) {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      clockElement.textContent = timeStr;
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  // 3. Auto-Dismiss Bootstrap Alerts after 5 seconds
  const alerts = document.querySelectorAll('.alert-dismissible');
  alerts.forEach((alert) => {
    setTimeout(() => {
      try {
        const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
        if (bsAlert) {
          bsAlert.close();
        }
      } catch (e) {
        // Ignored if already closed
      }
    }, 6000);
  });

  // 4. Initialize Bootstrap Tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map((tooltipTriggerEl) => {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // 5. Data-Confirm Interceptor for Safe Destructive Actions
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-confirm]');
    if (target) {
      const message = target.getAttribute('data-confirm') || 'Are you sure you want to proceed?';
      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });

  // 6. Loading States for Form Submissions (Prevents Double-Clicks)
  const forms = document.querySelectorAll('form:not([data-no-loading])');
  forms.forEach((form) => {
    form.addEventListener('submit', function (e) {
      if (!this.checkValidity()) {
        return; // Let browser HTML5 validation fire
      }
      const submitBtn = this.querySelector('button[type="submit"]:not(.no-spin)');
      if (submitBtn && !submitBtn.disabled) {
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Processing...`;
        
        // Re-enable after 8 seconds timeout as safety fallback
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }, 8000);
      }
    });
  });
});
