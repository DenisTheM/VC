# Virtue Compliance - Projektrichtlinien

## Projekt

Statische Website der **Virtue Compliance GmbH** (Uznach, Schweiz) - AML Compliance, KYC/KYB und regulatorische Betreuung für Finanzintermediäre (Schweiz & EU).

- Domain: `www.virtue-compliance.ch`
- Sprache der Website: Deutsch (de_CH)

## Tech Stack

- **Frontend:** Statisches HTML/CSS/JS - kein Build-Tool, kein Framework
- **CSS:** Modulare Architektur unter `styles/` (tokens.css, nav.css, components.css, footer.css, homepage.css, blog.css)
- **JS:** `js/main.js`, `js/cookie-consent.js`, `js/vc-tracking.js`
- **Fonts:** Google Fonts (DM Sans, Source Serif 4)
- **Backend:** Supabase Edge Functions (Deno/TypeScript) unter `supabase/functions/`
- **Payments:** Stripe via Supabase Edge Functions (`create-checkout`, `stripe-webhook`)
- **Tracking:** GA4 mit Cookie-Consent

## Projektstruktur

```
index.html              # Hauptseite / Landing Page
blog/
  index.html            # Blog-Übersicht
  aml-compliance-kosten.html
datenschutz.html        # Datenschutzerklärung
impressum.html          # Impressum
404.html                # Fehlerseite
styles/                 # Modulares CSS
  tokens.css            # Design Tokens (Farben, Spacing, etc.)
  nav.css               # Navigation
  components.css        # Wiederverwendbare Komponenten
  footer.css            # Footer
  homepage.css          # Homepage-spezifisch
  blog.css              # Blog-spezifisch
js/
  main.js               # Hauptlogik
  cookie-consent.js     # Cookie-Banner
  vc-tracking.js        # GA4 Event Tracking
supabase/functions/     # Supabase Edge Functions (Deno)
  send-reminder/        # Erinnerungs-E-Mails
  check-overdue/        # Überfällige Prüfungen
  notify-contact/       # Kontaktformular-Benachrichtigung
  create-checkout/      # Stripe Checkout Session
  stripe-webhook/       # Stripe Webhook Handler
```

## Konventionen

- HTML-Seiten binden CSS-Dateien einzeln ein (kein Bundling)
- CSS Design Tokens in `styles/tokens.css` definiert - diese für Farben, Abstände, etc. nutzen
- Alle Seiten brauchen: Cookie-Consent-Banner, GA4 Tracking, konsistente Nav/Footer
- SEO beachten: Schema.org JSON-LD, Open Graph Tags, Meta-Descriptions
- Supabase Functions verwenden Deno (nicht Node.js)

## Wichtige Hinweise

- `index.html` ist sehr groß (~447 KB) - enthält vermutlich Inline-SVGs oder andere eingebettete Assets
- Keine `.env`-Datei committen - Supabase/Stripe Secrets gehören in Supabase Environment Variables
- `Sicherungen/` enthält Backup-Dateien - nicht bearbeiten
- `node_modules/` ist nur für die Supabase JS Client Library
