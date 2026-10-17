/* House of Deceit: optional Meta measurement, separate from email consent. */
(function () {
  'use strict';
  if (window.HODTracking) return;
  const PIXEL_ID = '897956483285845';
  const MEASURE_PAGE = ['/', '/index.html', '/bookings.html'].includes(location.pathname);
  const CONSENT_KEY = 'hod-advertising-consent-v1';
  const LEAD_KEY = 'hod-meta-lead-session-v1';
  const SIX_MONTHS = 180 * 24 * 60 * 60 * 1000;
  let choice = readChoice();
  let initialised = false;
  let pageViewSent = false;
  let pendingLead = false;
  let leadSent = false;
  let returnFocus = null;

  function readChoice() {
    try {
      const saved = JSON.parse(localStorage.getItem(CONSENT_KEY));
      if (saved && saved.expires > Date.now() && ['accepted', 'rejected'].includes(saved.choice)) return saved.choice;
    } catch (_) {}
    return null;
  }
  function hasLead() {
    try { return sessionStorage.getItem(LEAD_KEY) === 'sent'; } catch (_) { return false; }
  }
  function sendLead() {
    if (choice !== 'accepted' || !initialised || !pendingLead || leadSent || hasLead()) return;
    try {
      window.fbq('track', 'Lead', {content_name: 'Availability unlocked', content_category: 'House of Deceit'});
      leadSent = true;
      pendingLead = false;
      try { sessionStorage.setItem(LEAD_KEY, 'sent'); } catch (_) {}
    } catch (_) { /* Measurement must never interrupt a booking. */ }
  }
  function startPixel() {
    if (choice !== 'accepted' || !MEASURE_PAGE) return;
    try {
      if (!initialised) {
        // Meta's standard bootstrap, run only after advertising consent.
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        // Manual events only; do not automatically extract form information.
        window.fbq('set', 'autoConfig', false, PIXEL_ID);
        window.fbq('consent', 'grant');
        window.fbq('init', PIXEL_ID);
        initialised = true;
      } else {
        window.fbq('consent', 'grant');
      }
      if (!pageViewSent) {
        window.fbq('track', 'PageView');
        pageViewSent = true;
      }
      sendLead();
    } catch (_) { /* The form remains usable if tracking is blocked. */ }
  }
  function stopPixel() {
    if (window.fbq) {
      try { window.fbq('consent', 'revoke'); } catch (_) {}
    }
    // Remove first-party Meta cookies when consent is withdrawn.
    ['_fbp', '_fbc'].forEach(function (name) {
      ['', '; domain=' + location.hostname, '; domain=.houseofdeceit.com'].forEach(function (domain) {
        document.cookie = name + '=; Max-Age=0; path=/' + domain + '; SameSite=Lax; Secure';
      });
    });
    pendingLead = false;
  }
  function choose(next) {
    choice = next;
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify({choice: next, expires: Date.now() + SIX_MONTHS})); } catch (_) {}
    banner.hidden = true;
    if (next === 'accepted') startPixel(); else stopPixel();
    if (returnFocus) { returnFocus.focus(); returnFocus = null; }
  }
  function openSettings() {
    returnFocus = document.activeElement;
    banner.hidden = false;
    banner.querySelector('button').focus();
  }

  const style = document.createElement('style');
  style.textContent = '#hod-cookie-banner{position:fixed;bottom:16px;left:16px;right:16px;z-index:1000;max-width:850px;margin:auto;padding:20px;background:#130c17;color:#f4ead8;border:1px solid #e7b85c;border-radius:10px;box-shadow:0 6px 30px #0009;font:16px/1.5 Arial,sans-serif;text-align:left;box-sizing:border-box;max-height:calc(100vh - 32px);overflow:auto}#hod-cookie-banner[hidden]{display:none}#hod-cookie-banner p{margin:0 0 14px;font-size:16px}#hod-cookie-banner a{color:#e7b85c}#hod-cookie-banner .hod-cookie-actions{display:flex;flex-wrap:wrap;gap:12px}#hod-cookie-banner button{flex:1;min-width:120px;padding:11px 18px;border:1px solid #e7b85c;border-radius:5px;background:#21142f;color:#fff;font:700 16px Arial,sans-serif;cursor:pointer}#hod-cookie-banner button:focus-visible,.hod-cookie-settings:focus-visible{outline:3px solid #e7b85c;outline-offset:3px}.hod-cookie-settings{display:inline-block;margin:14px 0 0;padding:4px 0;border:0;background:transparent;color:inherit;font:inherit;text-decoration:underline;cursor:pointer}';
  document.head.appendChild(style);
  const banner = document.createElement('section');
  banner.id = 'hod-cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Advertising cookie choice');
  banner.hidden = choice !== null;
  banner.innerHTML = '<p><strong>Advertising cookies</strong><br>With your permission, we use Meta cookies to measure which ads lead to visits and email sign-ups. You can book and view dates if you reject them. <a href="privacy.html">Privacy notice</a></p><div class="hod-cookie-actions"><button type="button" data-choice="accepted">Accept</button><button type="button" data-choice="rejected">Reject</button></div>';
  banner.querySelectorAll('[data-choice]').forEach(function (button) {
    button.addEventListener('click', function () { choose(button.getAttribute('data-choice')); });
  });
  document.body.appendChild(banner);
  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'hod-cookie-settings';
  settings.textContent = 'Cookie settings';
  settings.addEventListener('click', openSettings);
  const settingsContainer = document.createElement('div');
  settingsContainer.appendChild(settings);
  (document.querySelector('footer .wrap') || document.querySelector('footer') || document.querySelector('main') || document.body).appendChild(settingsContainer);

  window.HODTracking = {
    // Called only after saveLead succeeds AND the date calendar loads.
    lead: function () { if (choice === 'rejected') return; pendingLead = true; sendLead(); },
    openSettings: openSettings
  };
  // Apply preference changes made in another tab, including withdrawal.
  window.addEventListener('storage', function (event) {
    if (event.key !== CONSENT_KEY) return;
    choice = readChoice();
    banner.hidden = choice !== null;
    if (choice === 'accepted') startPixel(); else stopPixel();
  });
  if (choice === 'accepted') startPixel(); else stopPixel();
})();
