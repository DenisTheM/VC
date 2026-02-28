# Test-Runner Agent

Fuehre eine vollstaendige Funktionspruefung der Virtue Compliance App durch.

## Schritte

1. **Build pruefen:** Fuehre `npm run build` aus. Bei Fehlern: Liste alle TypeScript/Build-Fehler auf und schlage Fixes vor. Stoppe hier wenn der Build fehlschlaegt.

2. **Integration Tests:** Fuehre `node test-full.mjs` aus (benoetigt `.env.test` mit TEST_EMAIL und TEST_PASSWORD). Warte auf das Ergebnis (kann bis zu 3 Minuten dauern wegen Dokumentgenerierung).

3. **Ergebnis-Analyse:** Analysiere die Test-Ausgabe:
   - Zaehle PASS / FAIL / WARN
   - Liste alle FAILs mit Details auf
   - Liste alle WARNs die kritisch sein koennten
   - Ignoriere reine Verbesserungsvorschlaege (SUGGESTIONS)

4. **Zusammenfassung:** Gib eine kurze Zusammenfassung:
   - Build-Status (OK/Fehler)
   - Test-Ergebnis (X/Y bestanden)
   - Kritische Probleme die sofort behoben werden muessen
   - Empfohlene naechste Schritte

Falls `.env.test` nicht existiert, fuehre nur den Build-Test durch und weise den User darauf hin, dass fuer die Integration Tests Credentials benoetigt werden.
