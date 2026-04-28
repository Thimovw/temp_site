/* cookie-consent.js
 * Shows the cookie consent banner on first visit.
 * Stores consent in localStorage and sets a consent cookie.
 */
(function () {
  'use strict';

  var CONSENT_KEY = 'vs_cookie_consent';
  var banner      = document.getElementById('cookie-banner');

  function hideBanner() { if (banner) banner.style.display = 'none'; }
  function showBanner() { if (banner) banner.style.display = 'flex'; }

  // Show banner if no consent decision has been stored yet
  if (!localStorage.getItem(CONSENT_KEY)) {
    showBanner();
  } else {
    hideBanner();
  }

  window.acceptCookies = function () {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    document.cookie = 'vs_consent=1; SameSite=Strict; Secure; Max-Age=31536000; Path=/';
    hideBanner();
  };

  window.declineCookies = function () {
    localStorage.setItem(CONSENT_KEY, 'declined');
    document.cookie = 'vs_consent=0; SameSite=Strict; Secure; Max-Age=31536000; Path=/';
    hideBanner();
  };
}());
