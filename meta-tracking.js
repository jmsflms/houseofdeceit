/* House of Deceit: optional Meta and Google Analytics measurement, separate from email consent. */
(function () {
  'use strict';
  if (window.HODTracking) return;
  const GA_ID = 'G-RZGX9SX1GP';
  const ANALYTICS_KEY = 'hod-analytics-consent-v1';
  const GA_LEAD_KEY = 'hod-ga-lead-session-v1';
  const ANALYTICS_PAGE = location.pathname !== '/privacy.html';
  let analyticsChoice = readChoice(ANALYTICS_KEY);
  let analyticsInitialised = false;
  let analyticsPageSent = false;
  let analyticsPendingLead = false;
  let analyticsLeadSent = false;
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

  function readChoice(key) {
    try {
      const saved = JSON.parse(localStorage.getItem(key || CONSENT_KEY));
      if (saved && saved.expires > Date.now() && ['accepted', 'rejected'].includes(saved.choice)) return saved.choice;
    } catch (_) {}
    return null;
  }
  function analyticsLead() {
    if (analyticsChoice !== 'accepted' || !analyticsInitialised || !analyticsPendingLead || analyticsLeadSent) return;
    try { if (sessionStorage.getItem(GA_LEAD_KEY) === 'sent') return; } catch (_) {}
    window.gtag('event', 'generate_lead', {send_to: GA_ID, lead_source: 'Availability calendar'});
    analyticsLeadSent = true;
    analyticsPendingLead = false;
    try { sessionStorage.setItem(GA_LEAD_KEY, 'sent'); } catch (_) {}
  }
  function startAnalytics() {
    if (analyticsChoice !== 'accepted' || !ANALYTICS_PAGE) return;
    try {
      window['ga-disable-' + GA_ID] = false;
      if (!analyticsInitialised) {
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
        window.gtag('consent', 'default', {analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
        window.gtag('consent', 'update', {analytics_storage: 'granted'});
        window.gtag('js', new Date());
        window.gtag('config', GA_ID, {send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_location: location.origin + location.pathname + safeCampaignQuery()});
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
        document.head.appendChild(script);
        analyticsInitialised = true;
      } else window.gtag('consent', 'update', {analytics_storage: 'granted'});
      if (!analyticsPageSent) {
        window.gtag('event', 'page_view', {send_to: GA_ID});
        analyticsPageSent = true;
      }
      analyticsLead();
    } catch (_) { /* Analytics must never interrupt a booking. */ }
  }
  function safeCampaignQuery() {
    // Keep campaign labels for reporting, never email or booking query parameters.
    const input = new URLSearchParams(location.search);
    const output = new URLSearchParams();
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (key) {
      const value = input.get(key);
      if (value && !value.includes('@')) output.set(key, value.slice(0, 200));
    });
    return output.size ? '?' + output.toString() : '';
  }
  function stopAnalytics() {
    window['ga-disable-' + GA_ID] = true;
    if (window.gtag) window.gtag('consent', 'update', {analytics_storage: 'denied'});
    document.cookie.split(';').forEach(function (cookie) {
      const name = cookie.split('=')[0].trim();
      if (!/^_ga(?:_|$)|^_gid$|^_gat/.test(name)) return;
      ['', '; domain=' + location.hostname, '; domain=.houseofdeceit.com'].forEach(function (domain) {
        document.cookie = name + '=; Max-Age=0; path=/' + domain + '; SameSite=Lax; Secure';
      });
    });
    analyticsPendingLead = false;
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
  function choose(next, analyticsNext) {
    analyticsChoice = analyticsNext || next;
    try { localStorage.setItem(ANALYTICS_KEY, JSON.stringify({choice: analyticsChoice, expires: Date.now() + SIX_MONTHS})); } catch (_) {}
    if (analyticsChoice === 'accepted') startAnalytics(); else stopAnalytics();
    choice = next;
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify({choice: next, expires: Date.now() + SIX_MONTHS})); } catch (_) {}
    banner.hidden = true;
    if (next === 'accepted') startPixel(); else stopPixel();
    if (returnFocus) { returnFocus.focus(); returnFocus = null; }
  }
  function openSettings() {
    returnFocus = document.activeElement;
    banner.querySelector('[data-preference=analytics]').checked = analyticsChoice === 'accepted';
    banner.querySelector('[data-preference=advertising]').checked = choice === 'accepted';
    banner.hidden = false;
    banner.querySelector('button').focus();
  }

  const style = document.createElement('style');
  style.textContent = '#hod-cookie-banner{position:fixed;bottom:16px;left:16px;right:16px;z-index:1000;max-width:850px;margin:auto;padding:20px;background:#130c17;color:#f4ead8;border:1px solid #e7b85c;border-radius:10px;box-shadow:0 6px 30px #0009;font:16px/1.5 Arial,sans-serif;text-align:left;box-sizing:border-box;max-height:calc(100vh - 32px);overflow:auto}#hod-cookie-banner[hidden]{display:none}#hod-cookie-banner p{margin:0 0 14px;font-size:16px}#hod-cookie-banner a{color:#e7b85c}#hod-cookie-banner .hod-cookie-actions{display:flex;flex-wrap:wrap;gap:12px}#hod-cookie-banner button{flex:1;min-width:120px;padding:11px 18px;border:1px solid #e7b85c;border-radius:5px;background:#21142f;color:#fff;font:700 16px Arial,sans-serif;cursor:pointer}#hod-cookie-banner button:focus-visible,.hod-cookie-settings:focus-visible{outline:3px solid #e7b85c;outline-offset:3px}.hod-cookie-settings{display:inline-block;margin:14px 0 0;padding:4px 0;border:0;background:transparent;color:inherit;font:inherit;text-decoration:underline;cursor:pointer}';
  document.head.appendChild(style);
  const banner = document.createElement('section');
  banner.id = 'hod-cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie choices');
  banner.hidden = choice !== null && analyticsChoice !== null;
  banner.innerHTML = '<p><strong>Optional cookies</strong><br>Google Analytics measures website visits and successful sign-ups. Meta measures advertising visits and sign-ups. You can view dates and book if you reject both. <a href="privacy.html">Privacy notice</a></p><p><label><input type="checkbox" data-preference="analytics"> Website statistics (Google Analytics)</label><br><label><input type="checkbox" data-preference="advertising"> Advertising (Meta)</label></p><div class="hod-cookie-actions"><button type="button" data-choice="accepted">Accept all</button><button type="button" data-choice="rejected">Reject all</button><button type="button" data-save-preferences>Save choices</button></div>';
  banner.querySelector('[data-preference=analytics]').checked = analyticsChoice === 'accepted';
  banner.querySelector('[data-preference=advertising]').checked = choice === 'accepted';
  banner.querySelectorAll('[data-choice]').forEach(function (button) {
    button.addEventListener('click', function () { choose(button.getAttribute('data-choice')); });
  });
  banner.querySelector('[data-save-preferences]').addEventListener('click', function () {
    choose(banner.querySelector('[data-preference=advertising]').checked ? 'accepted' : 'rejected', banner.querySelector('[data-preference=analytics]').checked ? 'accepted' : 'rejected');
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
    lead: function () {
      if (analyticsChoice !== 'rejected') { analyticsPendingLead = true; analyticsLead(); }
      if (choice !== 'rejected') { pendingLead = true; sendLead(); }
    },
    openSettings: openSettings
  };
  // Apply preference changes made in another tab, including withdrawal.
  window.addEventListener('storage', function (event) {
    if (event.key !== CONSENT_KEY && event.key !== ANALYTICS_KEY && event.key !== null) return;
    analyticsChoice = readChoice(ANALYTICS_KEY);
    if (analyticsChoice === 'accepted') startAnalytics(); else stopAnalytics();
    choice = readChoice();
    banner.hidden = choice !== null && analyticsChoice !== null;
    if (choice === 'accepted') startPixel(); else stopPixel();
  });
  if (choice === 'accepted') startPixel(); else stopPixel();
  if (analyticsChoice === 'accepted') startAnalytics(); else stopAnalytics();
})();
