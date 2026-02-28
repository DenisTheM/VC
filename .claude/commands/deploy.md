# Deploy Agent

Deploye die Virtue Compliance App auf Vercel (Frontend) und Supabase (Edge Functions).

## Optionaler Parameter: $ARGUMENTS

- Ohne Argument: Deploye alles (Frontend + alle geaenderten Edge Functions)
- `frontend` oder `vercel`: Nur Frontend deployen
- `functions` oder `supabase`: Nur Edge Functions deployen
- `<function-name>`: Nur eine bestimmte Edge Function deployen (z.B. `generate-document`)

## Schritte

1. **Pre-Flight Check:**
   - `git status` pruefen — warnen wenn uncommitted Changes existieren
   - `npm run build` ausfuehren — bei Fehler abbrechen

2. **Frontend Deploy** (wenn nicht uebersprungen):
   - `npx vercel --prod` ausfuehren
   - Auf erfolgreiche Ausgabe pruefen (URL wird angezeigt)

3. **Edge Functions Deploy** (wenn nicht uebersprungen):
   - Pruefen welche Functions unter `supabase/functions/` existieren
   - Per `git diff HEAD~1 --name-only` pruefen welche Functions sich geaendert haben
   - Nur geaenderte Functions deployen, ausser explizit alle gewuenscht
   - Deploy-Befehl: `npx supabase functions deploy <name> --no-verify-jwt`
   - Bekannte Functions: generate-document, send-client-message, zefix-lookup, invite-member, notify-approval, notify-alert, notify-help-request, check-action-reminders, check-customer-reviews

4. **Post-Deploy:**
   - Zusammenfassung: Was wurde deployed, welche URLs
   - Bei Fehlern: Fehler auflisten und Loesungsvorschlaege machen
