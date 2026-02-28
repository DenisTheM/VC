# Security Audit Agent

Fuehre einen umfassenden Security-Audit der Virtue Compliance Codebase durch.

## Pruefbereiche

### 1. CORS-Konfiguration
- Suche nach `Access-Control-Allow-Origin` in allen Edge Functions unter `supabase/functions/`
- Pruefen ob `*` (Wildcard) verwendet wird — sollte auf `virtue-compliance.ch` und `vercel.app` beschraenkt sein
- Ergebnis: Liste aller Functions mit ihrer CORS-Konfiguration

### 2. Authentifizierung & Autorisierung
- Pruefe alle Edge Functions auf Auth-Checks (Authorization Header, getUser, Rollen-Pruefung)
- Finde Functions ohne Auth-Check — diese sind potentiell offen
- Pruefe ob Admin-only Functions auch wirklich `role === "admin"` pruefen
- Pruefe `supabase/config.toml` auf `minimum_password_length` (sollte >= 8 sein)

### 3. Input-Validierung & Injection
- Suche nach `dangerouslySetInnerHTML` — pruefen ob DOMPurify vorgeschaltet ist
- Suche nach direkter String-Interpolation in SQL/Supabase Queries (SQL Injection)
- Suche nach `eval()`, `Function()`, `innerHTML` ohne Sanitization
- Pruefe HTML-Escaping in Edge Functions die HTML generieren (z.B. Email-Templates)

### 4. Secrets & Konfiguration
- Pruefe ob `.env`-Dateien im Git tracked werden (`git ls-files | grep -i env`)
- Suche nach hardcodierten API Keys, Passworten, Tokens in der Codebase
- Pruefe `.gitignore` auf relevante Eintraege

### 5. Content Security Policy
- Pruefe `vercel.json` auf Security Headers (CSP, X-Frame-Options, etc.)
- Falls fehlend: Schlage eine passende CSP-Konfiguration vor

### 6. Supabase RLS
- Pruefe ob Row Level Security auf kritischen Tabellen aktiv ist
- Suche in Migrations nach `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`

## Bekannte offene Issues (aus vorherigem Audit)
- CORS `*` auf allen Edge Functions
- `minimum_password_length = 6` in config.toml
- Content-Security-Policy fehlt in vercel.json
- N+1 Queries in notify-alert, check-action-reminders, check-customer-reviews

## Ausgabe
Erstelle einen Bericht mit:
- **KRITISCH** (sofort beheben): Sicherheitsluecken
- **HOCH** (bald beheben): Konfigurationsprobleme
- **MITTEL** (planen): Best-Practice-Verbesserungen
- **INFO**: Hinweise ohne unmittelbaren Handlungsbedarf

Am Ende: Zusammenfassung mit Anzahl Findings pro Severity.
