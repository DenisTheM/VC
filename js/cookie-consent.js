/* ============================================================================
   VIRTUE COMPLIANCE — Cookie Consent Banner
   DSGVO/DSG-konform. Wird auf jeder Seite eingebunden.
   ============================================================================ */

(function () {
    // Returning visitor – bereits entschieden
    if (document.cookie.indexOf('vc_consent=') !== -1) {
        if (document.cookie.indexOf('vc_consent=1') !== -1) {
            gtag('consent', 'update', { 'analytics_storage': 'granted' });
        }
        return;
    }

    // Banner für neue Besucher
    var overlay = document.createElement('div');
    overlay.id = 'vc-cookie-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9998;backdrop-filter:blur(2px);';

    var b = document.createElement('div');
    b.id = 'vc-cookie';
    b.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);width:92%;max-width:520px;background:#fff;color:#111827;padding:28px 24px;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.18);z-index:9999;font-family:DM Sans,-apple-system,BlinkMacSystemFont,sans-serif;';
    b.innerHTML = ''
        + '<div style="font-size:16px;font-weight:700;margin-bottom:8px;color:#111827;">Ihre Privatsph\u00e4re ist uns wichtig</div>'
        + '<div style="font-size:14px;line-height:1.6;color:#6b7280;margin-bottom:20px;">'
        + 'Wir verwenden Cookies, um unsere Website zu verbessern und Ihren Besuch angenehmer zu gestalten. '
        + '<a href="/datenschutz.html" style="color:#16654e;text-decoration:underline;">Mehr erfahren</a>'
        + '</div>'
        + '<div style="display:flex;gap:10px;flex-wrap:wrap;">'
        + '<button onclick="vcAccept()" style="flex:1;min-width:140px;background:#16654e;color:#fff;border:none;border-radius:10px;padding:13px 24px;font-size:15px;font-weight:600;cursor:pointer;font-family:DM Sans,-apple-system,sans-serif;">Akzeptieren</button>'
        + '<button onclick="vcDecline()" style="flex:1;min-width:140px;background:#f9fafb;color:#6b7280;border:1px solid #f3f4f6;border-radius:10px;padding:13px 24px;font-size:14px;font-weight:500;cursor:pointer;font-family:DM Sans,-apple-system,sans-serif;">Nur notwendige</button>'
        + '</div>';

    document.body.appendChild(overlay);
    document.body.appendChild(b);

    function closeBanner() { b.remove(); overlay.remove(); }

    window.vcAccept = function () {
        document.cookie = 'vc_consent=1;path=/;max-age=31536000;SameSite=Lax';
        gtag('consent', 'update', { 'analytics_storage': 'granted' });
        closeBanner();
    };
    window.vcDecline = function () {
        document.cookie = 'vc_consent=0;path=/;max-age=31536000;SameSite=Lax';
        closeBanner();
    };
})();
