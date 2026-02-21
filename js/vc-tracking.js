/* ============================================================================
   VIRTUE COMPLIANCE — GA4 Custom Event Tracking
   Trackt den gesamten Funnel: Awareness → Interest → Consideration → Conversion
   
   EINBINDUNG: <script src="/js/vc-tracking.js"></script>
   → Muss NACH dem gtag-Snippet UND NACH cookie-consent.js geladen werden.
   → Events werden nur gesendet, wenn der Nutzer Cookies akzeptiert hat.
   ============================================================================ */

(function () {
  'use strict';

  // — Sicherstellen, dass gtag existiert —
  if (typeof gtag !== 'function') return;

  // — Hilfs-Funktion: Event senden —
  function track(eventName, params) {
    gtag('event', eventName, params || {});
  }

  // — Hilfs-Funktion: Einmal-Tracker (feuert nur 1x pro Session) —
  var fired = {};
  function trackOnce(eventName, params) {
    if (fired[eventName]) return;
    fired[eventName] = true;
    track(eventName, params);
  }

  // — Hilfs-Funktion: Klick-Tracking auf Elemente —
  function trackClicks(selector, eventName, paramsFn) {
    var elements = document.querySelectorAll(selector);
    for (var i = 0; i < elements.length; i++) {
      (function (el, index) {
        el.addEventListener('click', function () {
          var params = typeof paramsFn === 'function' ? paramsFn(el, index) : (paramsFn || {});
          track(eventName, params);
        });
      })(elements[i], i);
    }
  }

  // =========================================================================
  //  1. NAVIGATION — Wo klicken Besucher hin?
  // =========================================================================

  // Nav-Links
  trackClicks('.nav-links a:not(.nav-cta)', 'nav_click', function (el) {
    return { link_text: el.textContent.trim(), link_url: el.getAttribute('href') };
  });

  // Nav CTA "Termin buchen"
  trackClicks('.nav-cta', 'cta_click', function () {
    return { cta_location: 'navigation', cta_text: 'Termin buchen', cta_type: 'calendly' };
  });

  // =========================================================================
  //  2. HERO — Erster Eindruck & Haupt-CTAs
  // =========================================================================

  // Primärer Hero CTA → Calendly
  trackClicks('.hero .btn-primary', 'cta_click', function (el) {
    return { cta_location: 'hero', cta_text: el.textContent.trim(), cta_type: 'calendly' };
  });

  // Sekundärer Hero CTA → Scroll zu Services
  trackClicks('.hero .btn-secondary', 'cta_click', function (el) {
    return { cta_location: 'hero', cta_text: el.textContent.trim(), cta_type: 'scroll' };
  });

  // =========================================================================
  //  3. PRODUKTE / SERVICES — Interesse an konkreten Angeboten
  // =========================================================================

  // Service-Cards: Klick auf Produktkarten
  trackClicks('.service-card', 'product_interest', function (el) {
    var title = el.querySelector('.service-card-title, h3');
    return { product_name: title ? title.textContent.trim() : 'unknown' };
  });

  // "Mehr erfahren" Links auf Produktkarten
  trackClicks('a[href*="/produkte/"]', 'product_click', function (el) {
    return { product_page: el.getAttribute('href'), link_text: el.textContent.trim() };
  });

  // =========================================================================
  //  4. PRICING — Kaufbereitschaft messen
  // =========================================================================

  // Pricing-Section sichtbar → Kaufinteresse
  var pricingSection = document.getElementById('pricing');
  if (pricingSection) {
    var pricingObs = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        trackOnce('pricing_viewed');
        pricingObs.disconnect();
      }
    }, { threshold: 0.3 });
    pricingObs.observe(pricingSection);
  }

  // CO-Banner CTA (Compliance Officer Beratung buchen)
  trackClicks('.co-banner-cta', 'cta_click', function () {
    return { cta_location: 'pricing_co_banner', cta_text: 'Beratung buchen', cta_type: 'calendly' };
  });

  // Verifizierungsplan besprechen
  trackClicks('[href*="calendly"]', 'cta_click', function (el) {
    // Vermeidung von Duplikaten mit spezifischeren Selektoren
    var location = 'general';
    var parent = el.closest('section, .co-banner, .cta-section, .hero, nav');
    if (parent) {
      if (parent.classList.contains('hero')) location = 'hero';
      else if (parent.classList.contains('cta-section')) location = 'cta_section';
      else if (parent.id === 'pricing') location = 'pricing';
      else if (parent.tagName === 'NAV') location = 'navigation';
    }
    return { cta_location: location, cta_text: el.textContent.trim(), cta_type: 'calendly' };
  });

  // =========================================================================
  //  5. KONTAKTFORMULAR — Conversion-Event
  // =========================================================================

  var form = document.getElementById('contactForm');
  if (form) {
    // Formular-Start: Erstes Feld wird angeklickt
    var formStarted = false;
    var formFields = form.querySelectorAll('input, select, textarea');
    for (var f = 0; f < formFields.length; f++) {
      formFields[f].addEventListener('focus', function () {
        if (!formStarted) {
          formStarted = true;
          track('form_start', { form_name: 'kontakt' });
        }
      });
    }

    // Formular abgeschickt
    form.addEventListener('submit', function () {
      var branche = form.querySelector('[name="branche"]');
      var anliegen = form.querySelector('[name="anliegen"]');
      track('generate_lead', {
        form_name: 'kontakt',
        lead_source: 'website_form',
        industry: branche ? branche.value : '',
        interest: anliegen ? anliegen.value : '',
      });
    });
  }

  // =========================================================================
  //  6. FAQ — Welche Fragen interessieren am meisten?
  // =========================================================================

  trackClicks('.faq-question', 'faq_click', function (el) {
    var questionText = el.querySelector('span');
    return { question: questionText ? questionText.textContent.trim().substring(0, 80) : 'unknown' };
  });

  // =========================================================================
  //  7. BLOG — Content-Engagement
  // =========================================================================

  trackClicks('.blog-card', 'blog_click', function (el) {
    var title = el.querySelector('.blog-card-title');
    return { article_title: title ? title.textContent.trim() : 'unknown' };
  });

  // =========================================================================
  //  8. BRANCHEN-CARDS — Welche Zielgruppe schaut sich um?
  // =========================================================================

  trackClicks('.industry-card', 'industry_interest', function (el) {
    var title = el.querySelector('.industry-card-title, h3, h4');
    return { industry: title ? title.textContent.trim() : 'unknown' };
  });

  // =========================================================================
  //  9. SCROLL-TIEFE — Wie weit lesen Besucher?
  // =========================================================================

  var scrollMarks = [25, 50, 75, 90];
  var scrollFired = {};

  window.addEventListener('scroll', function () {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    var percent = Math.round((scrollTop / docHeight) * 100);

    for (var s = 0; s < scrollMarks.length; s++) {
      var mark = scrollMarks[s];
      if (percent >= mark && !scrollFired[mark]) {
        scrollFired[mark] = true;
        track('scroll_depth', { percent: mark });
      }
    }
  }, { passive: true });

  // =========================================================================
  //  10. SECTION VISIBILITY — Welche Sektionen werden wirklich gesehen?
  // =========================================================================

  var sections = document.querySelectorAll('section[id]');
  if (sections.length > 0) {
    var sectionObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          trackOnce('section_view_' + entry.target.id, { section: entry.target.id });
        }
      });
    }, { threshold: 0.2 });

    for (var i = 0; i < sections.length; i++) {
      sectionObs.observe(sections[i]);
    }
  }

  // =========================================================================
  //  11. OUTBOUND LINKS — Externe Klicks (LinkedIn, etc.)
  // =========================================================================

  trackClicks('a[href^="https://www.linkedin"]', 'outbound_click', function (el) {
    return { link_url: el.getAttribute('href'), link_text: 'LinkedIn' };
  });

  // =========================================================================
  //  12. COOKIE CONSENT — Consent-Rate messen
  // =========================================================================

  // Diese Events werden direkt im cookie-consent.js gefeuert,
  // aber als Fallback: Consent-Status beim Laden tracken
  var consent = document.cookie.match(/vc_consent=([01])/);
  if (consent) {
    trackOnce('consent_status', { accepted: consent[1] === '1' ? 'yes' : 'no' });
  }

})();
