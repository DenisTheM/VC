#!/bin/bash
# Replace old cookie banner with new styled version
# Run from: ~/Projekte/virtue-compliance
cd ~/Projekte/virtue-compliance || exit 1

# ============================================
# STEP 1: Fix index.html - remove old, add new
# ============================================

# 1a. Remove old cookie CSS (replace with empty)
python3 << 'PYEOF'
import re

with open('index.html', 'r') as f:
    content = f.read()

# Remove old cookie CSS block
content = content.replace("""        /* ─── Cookie Banner ─── */
        .cookie-banner {
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
            background: var(--ink); color: rgba(255,255,255,0.65);
            padding: 16px 32px; font-size: 13px; line-height: 1.6;
            display: flex; align-items: center; justify-content: center; gap: 20px;
            box-shadow: 0 -4px 24px rgba(0,0,0,0.15);
            transform: translateY(100%); transition: transform 0.4s ease;
        }
        .cookie-banner.visible { transform: translateY(0); }
        .cookie-banner a { color: #6ee7b7; text-decoration: underline; }
        .cookie-banner-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .cookie-btn {
            padding: 7px 18px; border-radius: 6px; font-size: 12.5px;
            font-weight: 600; cursor: pointer; border: none;
            font-family: var(--font-sans); transition: all 0.2s;
        }
        .cookie-btn-accept { background: var(--accent); color: white; }
        .cookie-btn-accept:hover { background: #1a7a5e; }
        .cookie-btn-reject { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); }
        .cookie-btn-reject:hover { background: rgba(255,255,255,0.12); color: white; }""", "")

# Remove responsive cookie CSS
content = content.replace("            .cookie-banner { flex-direction: column; gap: 12px; text-align: center; padding: 14px 20px; }\n", "")
content = content.replace("            .cookie-btn { padding: 10px 20px; font-size: 13.5px; min-height: 44px; }\n", "")

# Remove old cookie banner HTML
content = content.replace("""<div class="cookie-banner" id="cookieBanner">
    <span>Diese Website verwendet Cookies zur Analyse und Verbesserung. Mehr dazu in unserer <a href="datenschutz.html#cookies">Datenschutzerklärung</a>.</span>
    <div class="cookie-banner-actions">
        <button class="cookie-btn cookie-btn-reject" onclick="setCookieConsent('rejected')">Ablehnen</button>
        <button class="cookie-btn cookie-btn-accept" onclick="setCookieConsent('accepted')">Akzeptieren</button>
    </div>
</div>""", "")

# Replace old cookie JS with new
content = content.replace("""// Cookie Banner
function setCookieConsent(value) {
    localStorage.setItem('cookie-consent', value);
    document.getElementById('cookieBanner').classList.remove('visible');
    if (value === 'accepted') {
        gtag('consent', 'update', { 'analytics_storage': 'granted' });
    }
}
(function() {
    var consent = localStorage.getItem('cookie-consent');
    if (!consent) {
        setTimeout(function() { document.getElementById('cookieBanner').classList.add('visible'); }, 1500);
    } else if (consent === 'accepted') {
        gtag('consent', 'update', { 'analytics_storage': 'granted' });
    }
})();""", """// Cookie Consent
(function(){
  // Check returning visitors
  if(document.cookie.indexOf('vc_consent=')!==-1){
    if(document.cookie.indexOf('vc_consent=1')!==-1){
      gtag('consent','update',{'analytics_storage':'granted'});
    }
    return;
  }
  // Show banner for new visitors
  var overlay=document.createElement('div');
  overlay.id='vc-cookie-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9998;backdrop-filter:blur(2px);';
  var b=document.createElement('div');
  b.id='vc-cookie';
  b.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);width:92%;max-width:520px;background:#fff;color:#111827;padding:28px 24px;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.18);z-index:9999;font-family:DM Sans,-apple-system,BlinkMacSystemFont,sans-serif;';
  b.innerHTML=''
    +'<div style="font-size:16px;font-weight:700;margin-bottom:8px;color:#111827;">Ihre Privatsph\\u00e4re ist uns wichtig</div>'
    +'<div style="font-size:14px;line-height:1.6;color:#6b7280;margin-bottom:20px;">'
    +'Wir verwenden Cookies, um unsere Website zu verbessern und Ihren Besuch angenehmer zu gestalten. '
    +'<a href="/datenschutz.html" style="color:#16654e;text-decoration:underline;">Mehr erfahren</a>'
    +'</div>'
    +'<div style="display:flex;gap:10px;flex-wrap:wrap;">'
    +'<button onclick="vcAccept()" style="flex:1;min-width:140px;background:#16654e;color:#fff;border:none;border-radius:10px;padding:13px 24px;font-size:15px;font-weight:600;cursor:pointer;font-family:DM Sans,-apple-system,sans-serif;">Akzeptieren</button>'
    +'<button onclick="vcDecline()" style="flex:1;min-width:140px;background:#f9fafb;color:#6b7280;border:1px solid #f3f4f6;border-radius:10px;padding:13px 24px;font-size:14px;font-weight:500;cursor:pointer;font-family:DM Sans,-apple-system,sans-serif;">Nur notwendige</button>'
    +'</div>';
  document.body.appendChild(overlay);
  document.body.appendChild(b);
  function closeBanner(){b.remove();overlay.remove();}
  window.vcAccept=function(){
    document.cookie='vc_consent=1;path=/;max-age=31536000;SameSite=Lax';
    gtag('consent','update',{'analytics_storage':'granted'});
    closeBanner();
  };
  window.vcDecline=function(){
    document.cookie='vc_consent=0;path=/;max-age=31536000;SameSite=Lax';
    closeBanner();
  };
})();""")

# Also remove any previously added vc-cookie banner (from earlier attempt)
# Remove everything between <!-- Cookie Banner --> and </script> before </body>
import re
content = re.sub(r'\n<!-- Cookie Banner -->\n<script>\n\(function\(\)\{.*?</script>\n', '\n', content, flags=re.DOTALL)

with open('index.html', 'w') as f:
    f.write(content)

print("✅ index.html aktualisiert")
PYEOF

# ============================================
# STEP 2: Fix other pages - remove old banner if present, add GA + new banner
# ============================================

GA_BLOCK='    <script async src="https://www.googletagmanager.com/gtag/js?id=G-BT672TKMSL"></script>
    <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('\''consent'\'', '\''default'\'', {
        '\''analytics_storage'\'': '\''denied'\''
    });
    gtag('\''js'\'', new Date());
    gtag('\''config'\'', '\''G-BT672TKMSL'\'', { anonymize_ip: true });
    </script>'

COOKIE_BLOCK='<!-- Cookie Consent -->
<script>
(function(){
  if(document.cookie.indexOf("vc_consent=")!==-1){
    if(document.cookie.indexOf("vc_consent=1")!==-1){
      gtag("consent","update",{"analytics_storage":"granted"});
    }
    return;
  }
  var overlay=document.createElement("div");
  overlay.id="vc-cookie-overlay";
  overlay.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9998;backdrop-filter:blur(2px);";
  var b=document.createElement("div");
  b.id="vc-cookie";
  b.style.cssText="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);width:92%;max-width:520px;background:#fff;color:#111827;padding:28px 24px;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.18);z-index:9999;font-family:DM Sans,-apple-system,BlinkMacSystemFont,sans-serif;";
  b.innerHTML=""
    +"<div style=\"font-size:16px;font-weight:700;margin-bottom:8px;color:#111827;\">Ihre Privatsph\u00e4re ist uns wichtig<\/div>"
    +"<div style=\"font-size:14px;line-height:1.6;color:#6b7280;margin-bottom:20px;\">"
    +"Wir verwenden Cookies, um unsere Website zu verbessern und Ihren Besuch angenehmer zu gestalten. "
    +"<a href=\"/datenschutz.html\" style=\"color:#16654e;text-decoration:underline;\">Mehr erfahren<\/a>"
    +"<\/div>"
    +"<div style=\"display:flex;gap:10px;flex-wrap:wrap;\">"
    +"<button onclick=\"vcAccept()\" style=\"flex:1;min-width:140px;background:#16654e;color:#fff;border:none;border-radius:10px;padding:13px 24px;font-size:15px;font-weight:600;cursor:pointer;font-family:DM Sans,-apple-system,sans-serif;\">Akzeptieren<\/button>"
    +"<button onclick=\"vcDecline()\" style=\"flex:1;min-width:140px;background:#f9fafb;color:#6b7280;border:1px solid #f3f4f6;border-radius:10px;padding:13px 24px;font-size:14px;font-weight:500;cursor:pointer;font-family:DM Sans,-apple-system,sans-serif;\">Nur notwendige<\/button>"
    +"<\/div>";
  document.body.appendChild(overlay);
  document.body.appendChild(b);
  function closeBanner(){b.remove();overlay.remove();}
  window.vcAccept=function(){
    document.cookie="vc_consent=1;path=/;max-age=31536000;SameSite=Lax";
    gtag("consent","update",{"analytics_storage":"granted"});
    closeBanner();
  };
  window.vcDecline=function(){
    document.cookie="vc_consent=0;path=/;max-age=31536000;SameSite=Lax";
    closeBanner();
  };
})();
</script>'

for f in impressum.html datenschutz.html 404.html blog/index.html blog/aml-compliance-kosten.html; do
  if [ ! -f "$f" ]; then
    echo "⚠️  $f nicht gefunden"
    continue
  fi

  # Remove any previously added cookie banner (from earlier attempt)
  python3 -c "
import re
with open('$f', 'r') as file:
    content = file.read()
content = re.sub(r'\n<!-- Cookie Banner -->\n<script>.*?</script>\n', '\n', content, flags=re.DOTALL)
content = re.sub(r'\n<!-- Cookie Consent -->\n<script>.*?</script>\n', '\n', content, flags=re.DOTALL)
with open('$f', 'w') as file:
    file.write(content)
"

  # Add GA if not present
  if ! grep -q 'googletagmanager' "$f"; then
    python3 -c "
with open('$f', 'r') as file:
    content = file.read()
ga = '''    <script async src=\"https://www.googletagmanager.com/gtag/js?id=G-BT672TKMSL\"></script>
    <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent', 'default', {
        'analytics_storage': 'denied'
    });
    gtag('js', new Date());
    gtag('config', 'G-BT672TKMSL', { anonymize_ip: true });
    </script>'''
content = content.replace('</head>', ga + '\n</head>', 1)
with open('$f', 'w') as file:
    file.write(content)
"
    echo "✅ GA hinzugefügt: $f"
  else
    echo "ℹ️  GA vorhanden: $f"
  fi

  # Add new cookie consent banner before </body>
  python3 -c "
with open('$f', 'r') as file:
    content = file.read()
banner = '''<!-- Cookie Consent -->
<script>
(function(){
  if(document.cookie.indexOf('vc_consent=')!==-1){
    if(document.cookie.indexOf('vc_consent=1')!==-1){
      gtag('consent','update',{'analytics_storage':'granted'});
    }
    return;
  }
  var overlay=document.createElement('div');
  overlay.id='vc-cookie-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9998;backdrop-filter:blur(2px);';
  var b=document.createElement('div');
  b.id='vc-cookie';
  b.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);width:92%25;max-width:520px;background:#fff;color:#111827;padding:28px 24px;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.18);z-index:9999;font-family:DM Sans,-apple-system,BlinkMacSystemFont,sans-serif;';
  b.innerHTML=''
    +'<div style=\"font-size:16px;font-weight:700;margin-bottom:8px;color:#111827;\">Ihre Privatsph\\\\u00e4re ist uns wichtig</div>'
    +'<div style=\"font-size:14px;line-height:1.6;color:#6b7280;margin-bottom:20px;\">'
    +'Wir verwenden Cookies, um unsere Website zu verbessern und Ihren Besuch angenehmer zu gestalten. '
    +'<a href=\"/datenschutz.html\" style=\"color:#16654e;text-decoration:underline;\">Mehr erfahren</a>'
    +'</div>'
    +'<div style=\"display:flex;gap:10px;flex-wrap:wrap;\">'
    +'<button onclick=\"vcAccept()\" style=\"flex:1;min-width:140px;background:#16654e;color:#fff;border:none;border-radius:10px;padding:13px 24px;font-size:15px;font-weight:600;cursor:pointer;font-family:DM Sans,-apple-system,sans-serif;\">Akzeptieren</button>'
    +'<button onclick=\"vcDecline()\" style=\"flex:1;min-width:140px;background:#f9fafb;color:#6b7280;border:1px solid #f3f4f6;border-radius:10px;padding:13px 24px;font-size:14px;font-weight:500;cursor:pointer;font-family:DM Sans,-apple-system,sans-serif;\">Nur notwendige</button>'
    +'</div>';
  document.body.appendChild(overlay);
  document.body.appendChild(b);
  function closeBanner(){b.remove();overlay.remove();}
  window.vcAccept=function(){
    document.cookie='vc_consent=1;path=/;max-age=31536000;SameSite=Lax';
    gtag('consent','update',{'analytics_storage':'granted'});
    closeBanner();
  };
  window.vcDecline=function(){
    document.cookie='vc_consent=0;path=/;max-age=31536000;SameSite=Lax';
    closeBanner();
  };
})();
</script>'''
content = content.replace('</body>', banner + '\n</body>', 1)
with open('$f', 'w') as file:
    file.write(content)
"
  echo "✅ Cookie-Banner hinzugefügt: $f"
done

echo ""
echo "========================================="
echo "✅ Fertig! Jetzt pushen:"
echo "   git add -A && git commit -m 'New cookie banner + GA on all pages' && git push"
echo "========================================="
