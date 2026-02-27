/* ============================================================================
   VIRTUE COMPLIANCE — Cookie Consent Banner
   DSGVO/DSG-konform. Wird auf jeder Seite eingebunden.
   ============================================================================ */

document.addEventListener('DOMContentLoaded', function () {

    // Returning visitor – bereits entschieden
    if (document.cookie.indexOf('vc_consent=') !== -1) {
        if (document.cookie.indexOf('vc_consent=1') !== -1) {
            if (typeof gtag === 'function') {
                gtag('consent', 'update', { 'analytics_storage': 'granted' });
            }
            loadLinkedInInsight();
        }
        return;
    }

    // Overlay
    var overlay = document.createElement('div');
    overlay.id = 'vc-cookie-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9998;backdrop-filter:blur(2px);';

    // Banner
    var banner = document.createElement('div');
    banner.id = 'vc-cookie';
    var isMobile = window.innerWidth < 600;
    banner.style.cssText = isMobile
        ? 'position:fixed;bottom:0;left:0;right:0;width:100%;background:#fff;color:#111827;padding:20px 18px;border-radius:16px 16px 0 0;box-shadow:0 -4px 30px rgba(0,0,0,0.15);z-index:9999;font-family:DM Sans,-apple-system,BlinkMacSystemFont,sans-serif;max-height:100dvh;overflow-y:auto;box-sizing:border-box;'
        : 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);width:92%;max-width:520px;background:#fff;color:#111827;padding:28px 24px;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.18);z-index:9999;font-family:DM Sans,-apple-system,BlinkMacSystemFont,sans-serif;';

    // Titel
    var title = document.createElement('div');
    title.style.cssText = isMobile
        ? 'font-size:15px;font-weight:700;margin-bottom:6px;color:#111827;'
        : 'font-size:16px;font-weight:700;margin-bottom:8px;color:#111827;';
    title.textContent = 'Ihre Privatsph\u00e4re ist uns wichtig';

    // Text
    var text = document.createElement('div');
    text.style.cssText = isMobile
        ? 'font-size:13px;line-height:1.5;color:#6b7280;margin-bottom:14px;'
        : 'font-size:14px;line-height:1.6;color:#6b7280;margin-bottom:20px;';
    text.innerHTML = 'Wir verwenden Cookies, um unsere Website zu verbessern und Ihren Besuch angenehmer zu gestalten. <a href="/datenschutz.html" style="color:#16654e;text-decoration:underline;">Mehr erfahren</a>';

    // Buttons
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;';

    var btnAccept = document.createElement('button');
    btnAccept.textContent = 'Akzeptieren';
    btnAccept.style.cssText = isMobile
        ? 'flex:1;min-width:120px;background:#16654e;color:#fff;border:none;border-radius:10px;padding:12px 18px;font-size:14px;font-weight:600;cursor:pointer;font-family:DM Sans,-apple-system,sans-serif;'
        : 'flex:1;min-width:140px;background:#16654e;color:#fff;border:none;border-radius:10px;padding:13px 24px;font-size:15px;font-weight:600;cursor:pointer;font-family:DM Sans,-apple-system,sans-serif;';

    var btnDecline = document.createElement('button');
    btnDecline.textContent = 'Nur notwendige';
    btnDecline.style.cssText = isMobile
        ? 'flex:1;min-width:120px;background:#f9fafb;color:#6b7280;border:1px solid #f3f4f6;border-radius:10px;padding:12px 18px;font-size:13px;font-weight:500;cursor:pointer;font-family:DM Sans,-apple-system,sans-serif;'
        : 'flex:1;min-width:140px;background:#f9fafb;color:#6b7280;border:1px solid #f3f4f6;border-radius:10px;padding:13px 24px;font-size:14px;font-weight:500;cursor:pointer;font-family:DM Sans,-apple-system,sans-serif;';

    // Close helper
    function closeBanner() {
        banner.remove();
        overlay.remove();
    }

    // Event Listeners
    btnAccept.addEventListener('click', function () {
        document.cookie = 'vc_consent=1;path=/;max-age=31536000;SameSite=Lax';
        if (typeof gtag === 'function') {
            gtag('consent', 'update', { 'analytics_storage': 'granted' });
        }
        loadLinkedInInsight();
        closeBanner();
    });

    btnDecline.addEventListener('click', function () {
        document.cookie = 'vc_consent=0;path=/;max-age=31536000;SameSite=Lax';
        closeBanner();
    });

    // Zusammenbauen
    btnRow.appendChild(btnAccept);
    btnRow.appendChild(btnDecline);
    banner.appendChild(title);
    banner.appendChild(text);
    banner.appendChild(btnRow);
    document.body.appendChild(overlay);
    document.body.appendChild(banner);

});

// ── LinkedIn Insight Tag (consent-gated) ────────────────────────────────────
function loadLinkedInInsight() {
    if (window._linkedin_insight_loaded) return;
    window._linkedin_insight_loaded = true;
    window._linkedin_partner_id = '8742258';
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(window._linkedin_partner_id);
    var s = document.getElementsByTagName('script')[0];
    var b = document.createElement('script');
    b.type = 'text/javascript';
    b.async = true;
    b.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
    s.parentNode.insertBefore(b, s);
}
