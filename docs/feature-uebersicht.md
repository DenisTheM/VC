# Virtue Compliance — Feature-Übersicht

**Stand:** 23. Februar 2026

---

## 1. Admin-System (internes Tool)

Das Admin-System ist die zentrale Plattform, mit der Virtue Compliance ihre Kunden betreut.

### Kundenverwaltung
- Kundenliste mit Dokumentanzahl und Status-Übersicht
- Neue Kunden anlegen mit Branche, SRO-Zugehörigkeit und Kontaktdaten
- **Zefix-Integration:** Automatische Übernahme von Firmendaten aus dem Schweizer Handelsregister (Name, UID, Rechtsform, Sitz)
- Kunden löschen mit automatischer Archivierung aller zugehörigen Daten

### Firmenprofil
- Strukturiertes Formular mit 28 Feldern in 5 Bereichen (Stammdaten, Geschäftstätigkeit, Organisation, Regulierung, Risikoprofil)
- Fortschrittsanzeige und automatische Speicherung
- Grundlage für die KI-gestützte Dokumentgenerierung

### KI-Dokumentgenerierung
- 3-Schritt-Wizard: Dokumenttyp wählen, Jurisdiktion bestätigen, spezifische Fragen beantworten
- 6 Dokumenttypen: AML-Richtlinie, KYC-Checkliste, Risikoklassifizierung, Audit-Vorbereitung, KYT-Policy, Compliance-Jahresbericht
- Generierung per Claude AI basierend auf dem individuellen Firmenprofil
- PDF-Export mit professionellem Layout (Kopf-/Fusszeile, Virtue-Branding)

### Dokumentenverwaltung
- Übersicht aller generierten Dokumente mit Status (Entwurf, Review, Aktuell, Veraltet)
- Einzeln oder mehrere Dokumente gleichzeitig freigeben
- Vollständiger Audit Trail (wer hat wann was geändert)
- Versionierung mit Änderungsvergleich

### Regulatorische Meldungen
- **Automatische Überwachung:** Täglicher Scan von Regulierungs-Feeds (RSS), KI-Analyse und automatische Erstellung von Meldungs-Entwürfen
- **KI-Matching:** Automatische Zuordnung, welche Kunden von einer Meldung betroffen sind, basierend auf Branche und Profil
- Draft-Editor für manuelle Überarbeitung vor Veröffentlichung
- Publish-Workflow mit E-Mail-Benachrichtigung an betroffene Kunden
- Massnahmen-Tracking pro Kunde

### Mitgliederverwaltung
- Mehrere Benutzer pro Organisation (Viewer, Editor, Approver)
- Einladung per E-Mail
- Rollenbasierte Berechtigungen

---

## 2. Kundenportal

Das Kundenportal ist die Schnittstelle zu den Compliance-Kunden. Es bietet einen geschützten Bereich, in dem Kunden ihre regulatorische Situation im Blick behalten.

### Dashboard
- Persönliche Begrüssung und Organisationsname
- Kennzahlen auf einen Blick: Neue Updates, offene Massnahmen, Compliance-Status
- Hervorhebung kritischer Meldungen
- Direkte Navigation zu den neuesten Meldungen

### Regulatorische Meldungen
- Liste aller für den Kunden relevanten Meldungen mit Schweregrad und Risikobewertung
- Filterung nach Schweregrad und Status
- Detailansicht mit Zusammenfassung, Rechtsgrundlage und Fristen
- Individuelle Auswirkungsanalyse pro Kunde
- Persönlicher Elena-Kommentar mit dynamischer Anrede
- Massnahmen-Tracking mit 3-Status-Zyklus (Offen, In Arbeit, Erledigt)
- Kommentarfunktion auf Massnahmen (Dialog zwischen Kunde und Beraterin)

### Dokumente
- Übersicht aller Compliance-Dokumente, gruppiert nach Kategorie
- Freigabe-Workflow: Kunden können Dokumente im Status "Review" freigeben
- Änderungsverlauf (Audit Trail) pro Dokument
- Verknüpfung mit regulatorischen Meldungen (bidirektional)
- PDF-Download

### Endkunden-Verwaltung (KYC/KYB)
- Erfassung von Endkunden (natürliche Personen und juristische Personen)
- Zefix-Integration für automatische Firmendaten
- Dokumenten-Workflow pro Endkunde: Erstellen, Ausfüllen, Einreichen, Freigeben/Ablehnen
- Kontakte pro Endkunde verwalten
- Archivierung und Löschung mit vollständiger Datenarchivierung
- Hilfe-Anfragen an Virtue Compliance direkt aus dem Portal
- Audit Trail für alle Änderungen an Kundendaten und Dokumenten

---

## 3. Stärken

- **KI-Pipeline als Alleinstellungsmerkmal:** Die automatische Regulierungs-Überwachung (RSS-Feed → KI-Analyse → Entwurf → Kundenzuordnung) ist einzigartig im Schweizer Markt. Keine manuelle Recherche nötig.

- **Vollständiger Audit Trail:** Alle Änderungen an Dokumenten und Kundendaten werden lückenlos protokolliert — unveränderbar auf Datenbankebene. Erfüllt Compliance-Anforderungen und ist ein starkes Argument bei SRO-Prüfungen.

- **Zefix-Integration:** Automatische Übernahme von Handelsregister-Daten spart Zeit und reduziert Erfassungsfehler.

- **Elena als persönliches Element:** Die durchgehende Präsenz der Beraterin (Kommentare, Kontaktkarten, dynamische Anrede) schafft Vertrauen und unterscheidet das Portal von anonymen SaaS-Tools.

- **Row-Level Security:** Kunden sehen auf Datenbankebene ausschliesslich ihre eigenen Daten — keine Zugriffsfehler möglich.

---

## 4. Nächste Schritte

1. **Test-Abdeckung aufbauen** — Automatisierte Tests für alle API-Funktionen und kritische Workflows (umgesetzt)
2. **E-Mail-Benachrichtigungen ausbauen** — Alerts bei neuen Meldungen, Fälligkeits-Erinnerungen für Massnahmen
3. **Mobile Nutzung** — Responsive Layout für Tablet und Smartphone
4. **Compliance-Kalender** — Kalenderansicht aller Fristen und Deadlines
5. **Mehrsprachigkeit** — DE/FR/IT/EN für den Schweizer und EU-Markt
