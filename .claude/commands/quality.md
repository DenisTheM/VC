# Code Quality Agent

Pruefe die Codequalitaet der Virtue Compliance Codebase.

## Optionaler Parameter: $ARGUMENTS

- Ohne Argument: Vollstaendiger Check
- `types`: Nur TypeScript-Typen pruefen
- `performance`: Nur Performance-Probleme suchen
- `dead-code`: Nur toten/unbenutzten Code finden

## Pruefbereiche

### 1. TypeScript-Qualitaet
- `npm run build` ausfuehren — alle Compile-Fehler auflisten
- Suche nach `any` Types in `app/` Dateien (ausser `node_modules`)
- Suche nach `// @ts-ignore` und `// @ts-expect-error` — jedes Vorkommen pruefen ob gerechtfertigt
- Pruefen ob Supabase Generated Types verwendet werden (statt manuelle Interfaces)

### 2. Performance-Probleme
- **N+1 Queries:** Suche in Edge Functions nach Schleifen die innerhalb DB-Queries ausfuehren (for/forEach mit await supabase.from)
- **Unnoetige Re-Renders:** Suche nach fehlenden useMemo/useCallback bei teuren Berechnungen in React Components
- **Bundle Size:** Pruefen ob grosse Imports (lodash, moment) vorhanden sind die durch kleinere Alternativen ersetzt werden koennten

### 3. Toter Code
- Suche nach exportierten Functions/Components die nirgends importiert werden
- Suche nach auskommentiertem Code (groessere Bloecke)
- Pruefen ob die Nochda/Stillalive Edge Functions noch referenziert werden:
  - notify-contact, send-reminder, check-overdue, create-checkout, stripe-webhook
  - Falls nicht mehr verwendet: Als Kandidaten zum Entfernen markieren

### 4. Code-Konsistenz
- Pruefen ob Error-Handling konsistent ist (try/catch vs .catch())
- Pruefen ob Datum-Formatierung konsistent ist (toLocaleDateString vs manuell)
- Pruefen ob Supabase Client konsistent erstellt wird (admin vs anon)

### 5. Abhaengigkeiten
- `npm audit` ausfuehren — Sicherheitsluecken in Dependencies
- Pruefen ob veraltete Packages vorhanden sind (major version behind)

## Ausgabe
Erstelle einen Bericht mit Kategorien:
- **Fehler:** Muss behoben werden (Build-Fehler, Type-Fehler)
- **Warnung:** Sollte behoben werden (any Types, N+1 Queries)
- **Hinweis:** Kann verbessert werden (toter Code, Konsistenz)
- **OK:** Bereiche die gut aussehen

Zaehle Findings pro Kategorie und gib die Top-3 Prioritaeten an.
