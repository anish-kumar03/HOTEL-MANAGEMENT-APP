/**
 * Hotel Reservation & Management System (HRMS)
 * Client-Side Application Script
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('HRMS: Express & EJS client pipeline active.');

  // Auto-dismiss bootstrap alerts after 5 seconds if present
  const alerts = document.querySelectorAll('.alert-dismissible');
  alerts.forEach((alert) => {
    setTimeout(() => {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
      if (bsAlert) {
        bsAlert.close();
      }
    }, 5000);
  });
});

