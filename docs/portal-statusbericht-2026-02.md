# Virtue Compliance — Portal-Statusbericht & Strategieempfehlung

**Stand:** 23. Februar 2026 (aktualisiert)
**Erstellt von:** Strategieberatung (technisch)

---

## 1. Funktionsumfang — Kundenportal (Client Portal)

Das Client-Portal (`/app/portal`) ist ein rollengeschütztes Single-Page-Application mit fünf Hauptbereichen:

### 1.1 Dashboard

| Feature | Beschreibung |
|---------|-------------|
| Persönliche Begrüssung | Vorname des Benutzers + Organisationsname |
| Kritische Meldungen-Banner | Rot hinterlegter Hinweis bei kritischen Alerts, klickbar → direkte Navigation zur Meldung |
| Stat-Cards | 3 Kennzahlen (Neue Updates, Offene Massnahmen, Compliance-Status), alle klickbar |
| Letzte Meldungen | Preview der 3 neusten Alerts mit Severity-Badge |

**Reifegrad:** Hoch — funktioniert als Einstiegspunkt gut.

### 1.2 Regulatorische Meldungen

| Feature | Beschreibung |
|---------|-------------|
| Listenansicht | Alle für den Kunden relevanten Meldungen mit Severity- und Impact-Badge |
| Filter | Nach Schweregrad (Kritisch, Hoch, Mittel, Info), "Nur neue" Toggle |
| Quick-Filter Cards | Klickbare Zähler für Kritisch/Hoch/Neu |
| Detailansicht | Vollbild-Ansicht mit Summary, Rechtsgrundlage, Frist |
| Auswirkungsanalyse | Pro Meldung individuelle Risikoeinschätzung für den Kunden |
| Elena-Kommentar | Persönlicher Kommentar der Beraterin mit dynamischer Anrede ("Lieber Daniel, ...") |
| Massnahmen-Tracking | 3-Status-Zyklus (Offen → In Arbeit → Erledigt) mit interaktiven Checkboxen |
| Fortschrittsbalken | Zeigt erledigte und in-Arbeit-Anteile visuell |
| Kommentar-Funktion | Thread-basierte Kommentare auf Massnahmen (Kunde ↔ Beraterin) |
| Betroffene Dokumente | Sidebar mit verknüpften Dokumenten, klickbar → Dokument-Detailseite |
| Deep-Linking | Dashboard → Meldung, Dokument → Meldung (bidirektional) |

**Reifegrad:** Sehr hoch — ausgereiftes Feature mit optimistischen UI-Updates, Fehlerbehandlung, bidirektionaler Navigation und Dialog-Funktion.

### 1.3 Dokumentation

| Feature | Beschreibung |
|---------|-------------|
| Listenansicht | Gruppiert nach Kategorie, mit Format-Badge (DOCX/PDF/XLSX/PPTX), Version, Status |
| Filter | Nach Status (Aktuell, Review nötig, Entwurf, Veraltet), Kategorie, Volltextsuche |
| Quick-Filter Cards | Klickbare Zähler für Gesamt/Aktuell/Review/Mit Hinweisen |
| Detailansicht | Vollbild mit Metadaten-Grid (Aktualisiert, Rechtsgrundlage, Umfang) |
| Dokumentvorschau | Aufklappbarer Preview im Papier-Look mit Download-Toolbar |
| PDF-Export | Professionelles PDF mit VC-Branding, Kopf-/Fusszeile, Checkboxen, Formularfelder |
| Freigabe-Workflow | "Freigeben"-Button bei Status "Review", mit Bestätigungsdialog |
| Änderungsverlauf | Aufklappbare Timeline aller Dokumentänderungen (immutabler Audit Trail) |
| Versionierung mit Diff | Vergleich zwischen Dokumentversionen mit farbiger Hervorhebung |
| Verknüpfte Meldungen | Zeigt regulatorische Alerts, die dieses Dokument betreffen, klickbar → Alert-Detailseite |
| Elena-Kontakt | Direkter E-Mail-Link zur Beraterin (kontextbezogen mit Dokument-Subject) |

**Reifegrad:** Sehr hoch — professionelle Dokumentverwaltung mit PDF-Export, Audit Trail, Versionierung, Freigabe-Flow und Cross-Referencing.

### 1.4 Endkunden-Verwaltung (KYC/KYB) — NEU

| Feature | Beschreibung |
|---------|-------------|
| Kundenliste | Alle Endkunden mit Typ (natürliche/juristische Person), Risikostufe, Status, Dokumentanzahl |
| Kundenerfassung | Formular für natürliche Personen und juristische Personen (mit Zefix-Integration) |
| Dokumenten-Workflow | Pro Endkunde: Erstellen → Ausfüllen → Einreichen → Freigeben/Ablehnen → Überarbeiten |
| Kontakte-Verwaltung | Ansprechpersonen pro Endkunde (Rolle, E-Mail, Telefon) |
| Kunden löschen/archivieren | Löschung mit vollständiger Archivierung aller Daten (Kontakte, Dokumente, Audit Log) |
| Hilfe-Anfragen | Direkte Anfrage an Virtue Compliance aus dem Portal heraus, mit E-Mail-Benachrichtigung |
| Audit Trail | Lückenlose Protokollierung aller Änderungen an Kundendaten und Dokumenten |
| PDF-Export | Kundendokumente und Audit Trail als professionelles PDF exportierbar |
| Statistiken | Übersicht: Aktive Kunden, fällige Reviews, Dokumentstatus (Entwurf/Review/Freigegeben) |

**Reifegrad:** Hoch — vollständiger CDD-Workflow (Client-Level Due Diligence) mit Audit Trail und Archivierung.

### 1.5 Übergreifende Portal-Features

| Feature | Beschreibung |
|---------|-------------|
| Sidebar-Navigation | Dark-Theme Sidebar mit Logo, Nav-Items, Elena-Kontaktkarte (E-Mail + Telefon), Org-Info, Logout |
| In-App Notifications | Bell-Icon mit Dropdown, Unread-Zähler, Typen: neue Alerts, fällige Massnahmen, freigegebene Dokumente |
| Authentifizierung | Supabase Auth mit Rollenprüfung, AuthGuard-Komponente |
| Multi-User | Mehrere Benutzer pro Organisation mit Rollen (Viewer, Editor, Approver) |
| Row-Level Security | Kunden sehen nur ihre eigene Organisation (DB-Level) |
| Responsive Layout | Mobile-tauglich: Hamburger-Drawer, mobile Top-Bar, adaptive Paddings (≤768px / ≤1024px) |
| Lazy Loading | Seiten werden per `React.lazy()` nachgeladen |
| Design System | Konsistentes Token-basiertes Design (Farben, Abstände, Schatten) |

---

## 2. Funktionsumfang — Admin-System (DocGen)

Das Admin-System (`/app/docgen`) ist die interne Plattform für Virtue Compliance:

### 2.1 Dashboard

| Feature | Beschreibung |
|---------|-------------|
| Admin-Begrüssung | Personalisiert mit Vorname |
| Profil-Warnung | Hinweis bei unvollständigem Firmenprofil |
| Stat-Cards | Dokumente, Jurisdiktionen, Reg. Alerts — alle klickbar |
| Dokumenttypen-Grid | 6 Dokumenttypen mit Icon, Beschreibung, Zeitschätzung, Komplexität |
| Schnellstart | Gradient-Button + 3-Schritt-Workflow-Erklärung |

### 2.2 Kundenverwaltung (Organisationen)

| Feature | Beschreibung |
|---------|-------------|
| Kundenliste | Alle Organisationen mit Dokumentanzahl, Delete-Button |
| Neukunden-Formular | Inline-Formular mit Branche, SRO, Kontaktdaten |
| Zefix-Integration | Suche im Schweizer Handelsregister → automatische Befüllung (Name, UID, Rechtsform, Sitz) |
| Rechtsform-Mapping | Automatische Zuordnung der Zefix-Rechtsform auf interne Werte |
| Kunden löschen | Delete mit Bestätigungsdialog |

**Reifegrad:** Hoch — Zefix-Integration ist ein starkes Differenzierungsmerkmal.

### 2.3 Firmenprofil (Ebene A)

| Feature | Beschreibung |
|---------|-------------|
| Sektionsbasiertes Formular | 5 Bereiche: Stammdaten, Geschäftstätigkeit, Organisation, Regulierung, Risikoprofil |
| 28 Felder | 21 davon Pflicht, verschiedene Typen (Text, Select, Multi-Select, Toggle, Datum) |
| Fortschrittsanzeige | Prozentualer Fortschrittsbalken |
| Auto-Save | Debounced (2s), mit Status-Indikator (Speichert.../Gespeichert/Fehler) |
| Zugehörige Dokumente | Zeigt alle generierten Dokumente für dieses Profil |
| Sektion-Navigation | Sticky-Navigation zum Springen zwischen Bereichen |
| Zefix-Personen | Automatische Übernahme von Personen aus dem Handelsregister |

**Reifegrad:** Sehr hoch — produktionsreif mit Auto-Save, Validierung, relativem Zeitstempel.

### 2.4 Dokumentgenerierung (Wizard)

| Feature | Beschreibung |
|---------|-------------|
| 3-Schritt-Wizard | Dokumenttyp → Jurisdiktion + Profil → Spezifische Fragen |
| 6 Dokumenttypen | AML-Richtlinie, KYC-Checkliste, Risikoklassifizierung, Audit-Vorbereitung, KYT-Policy, Compliance-Jahresbericht |
| Jurisdiktions-Auswahl | CH, DE, EU (einige "Bald verfügbar") |
| Profilzusammenfassung | Read-only Übersicht der Firmendaten vor Generierung |
| Kapitelvorschau | Zeigt erwartete Dokumentkapitel |
| KI-Generierung | Claude Opus 4 generiert den Dokumentinhalt basierend auf Profil + Antworten |

**Reifegrad:** Hoch — Kernprodukt funktioniert gut.

### 2.5 Dokumentenübersicht

| Feature | Beschreibung |
|---------|-------------|
| Dokumentliste | Alle generierten Dokumente mit Organisation, Typ, Jurisdiktion, Status |
| List/Detail-Pattern | Modernisierte Ansicht nach Portal-Vorbild |
| Stat-Cards | Schnellübersicht über Dokumentstatus |
| Bulk-Aktionen | Mehrere Dokumente gleichzeitig freigeben / Status ändern |
| PDF-Export | Professionelles PDF mit VC-Branding |
| Audit Trail | Änderungsverlauf pro Dokument |
| Versionierung mit Diff | Visueller Vergleich zwischen Dokumentversionen |

**Reifegrad:** Hoch — modernisiert auf das Niveau des Client-Portals mit Bulk-Aktionen und PDF-Export.

### 2.6 Regulatorische Meldungen (Admin)

| Feature | Beschreibung |
|---------|-------------|
| 3-Tab-Ansicht | Aktiv, Entwürfe, Abgewiesen |
| Automatische Generierung | Täglicher Cron-Job liest RSS-Feeds, KI klassifiziert und erstellt Entwürfe |
| KI-Matching | Automatische Zuordnung betroffener Kunden basierend auf Branche/SRO/Profil |
| Draft-Editor | Vollständiger Editor für Entwürfe (Titel, Severity, Zusammenfassung, Rechtsgrundlage etc.) |
| Publish-Workflow | Entwurf → Aktiv → Abgewiesen (mit Restore-Option) |
| E-Mail-Benachrichtigung | Beim Publizieren: automatische E-Mail an betroffene Kunden mit Tracking |
| Kundenzuordnung | Betroffene Kunden mit individueller Risikoeinschätzung + Elena-Kommentar |
| Massnahmen-Editor | Anlegen/Bearbeiten/Löschen von Massnahmen pro Kundenzuordnung |
| Kommentar-Zähler | Zeigt Anzahl Kommentare pro Massnahme (Admin sieht Kunden-Feedback) |
| Benachrichtigungs-Log | Übersicht gesendeter E-Mails mit Status (gesendet/fehlgeschlagen), Erneut-Senden möglich |

**Reifegrad:** Sehr hoch — ausgereiftes System mit KI-Pipeline, Draft/Publish-Workflow, Client-Matching und E-Mail-Tracking.

### 2.7 Mitgliederverwaltung — NEU

| Feature | Beschreibung |
|---------|-------------|
| Mitgliederliste | Alle Benutzer einer Organisation mit Rolle und Name |
| Rollen-Zuweisung | Viewer, Editor, Approver — änderbar per Dropdown |
| Einladung per E-Mail | Neue Benutzer per E-Mail einladen (Edge Function) |
| Mitglieder entfernen | Benutzer aus Organisation entfernen |

**Reifegrad:** Hoch — vollständige Multi-User-Verwaltung.

### 2.8 Backend (Supabase Edge Functions)

| Funktion | Beschreibung |
|----------|-------------|
| `generate-document` | KI-Dokumentgenerierung via Claude Opus 4 |
| `fetch-regulatory-updates` | Täglicher Cron: RSS-Parsing → KI-Analyse → Draft-Alerts |
| `notify-alert` | E-Mail-Benachrichtigung bei Alert-Veröffentlichung mit Tracking |
| `notify-help-request` | Benachrichtigung bei Hilfe-Anfrage aus dem Portal |
| `invite-member` | Benutzer-Einladung per E-Mail mit Multi-Org-Support |
| `check-action-reminders` | Fälligkeits-Erinnerungen für Massnahmen |
| `check-customer-reviews` | Erinnerung an fällige Kunden-Reviews |
| `customer-export` | Kundendaten-Export |
| `zefix-lookup` | Handelsregister-Suche (ZEFIX API) |
| `notify-contact` | Kontaktformular-Benachrichtigung |
| `stripe-webhook` | Stripe Payment-Events |
| `create-checkout` | Stripe Checkout Session erstellen |
| `send-reminder` | Erinnerungs-E-Mails |
| `check-overdue` | Überfälligkeitsprüfung (Cron) |

---

## 3. Strategische Bewertung

### 3.1 Stärken

1. **Produktionsreifer Reifegrad** — Audit Trails, optimistische Updates, Deep-Linking, RLS, PDF-Export, Multi-User, Responsive Layout — das System ist über das MVP-Stadium hinausgewachsen.

2. **KI-Pipeline als Differenzierungsmerkmal** — Die automatische Regulierungs-Überwachung (RSS → KI-Analyse → Draft-Alert → Client-Matching) ist ein starkes Alleinstellungsmerkmal. Kein Wettbewerber im Schweizer Markt bietet das in dieser Form.

3. **Endkunden-Verwaltung (CDD)** — Der vollständige KYC/KYB-Workflow auf Endkunden-Ebene (Erfassung, Dokumentation, Freigabe, Archivierung) ist ein starker Mehrwert für Finanzintermediäre.

4. **Elena als persönliches Element** — Die durchgehende Präsenz der Beraterin (Kommentare, Kontaktkarten, dynamische Anrede) schafft Vertrauen und unterscheidet das Portal von anonymen SaaS-Tools.

5. **Zefix-Integration** — Automatische Kundendaten-Erfassung spart Admin-Zeit und reduziert Fehler. Verfügbar sowohl im Admin-System als auch in der Endkunden-Erfassung.

6. **Immutabler Audit Trail** — Trigger-basiert, nicht manipulierbar — das ist compliance-relevant und ein Verkaufsargument. Durchgängig implementiert für Dokumente, Kundendaten und Endkunden.

7. **Test-Abdeckung** — 120 automatisierte Tests über alle API-Schichten (Admin, Portal, Kunden, PDF-Export). Vitest + Supabase-Mock-Infrastruktur.

### 3.2 Behobene Schwächen (seit Erstbericht)

| Ursprüngliche Schwäche | Status | Umsetzung |
|------------------------|--------|-----------|
| ~~Kein PDF-Export~~ | **Behoben** | Professioneller PDF-Export mit VC-Branding, Checkboxen, Formularfelder, Kopf-/Fusszeile |
| ~~Kein Benachrichtigungssystem~~ | **Behoben** | E-Mail bei Alert-Veröffentlichung + In-App Notifications (Bell-Dropdown) |
| ~~Keine mobile Nutzung~~ | **Behoben** | Responsive Layout mit Hamburger-Drawer, mobiler Top-Bar, adaptiven Paddings |
| ~~Kein Multi-User~~ | **Behoben** | Rollen (Viewer, Editor, Approver), Einladung per E-Mail, Mitgliederverwaltung |
| ~~Keine Tests~~ | **Behoben** | 120 Tests (Vitest): Admin-API, Portal-API, Kunden-API, PDF-Export |
| ~~Admin-Dokumentenansicht basisch~~ | **Behoben** | Modernisiert: List/Detail-Pattern, Stat-Cards, Bulk-Aktionen, PDF-Export |
| ~~Keine Kommentar-Funktion~~ | **Behoben** | Thread-basierte Kommentare auf Massnahmen (Kunde ↔ Admin) |
| ~~Keine Dokumenten-Versionierung~~ | **Behoben** | Versionierung mit visuellem Text-Diff |

### 3.3 Verbleibende Schwächen

1. **Keine Echtzeit-Updates** — Client sieht neue Alerts erst beim Seiten-Reload. Kein Websocket/SSE für Live-Updates.

2. **Kein Error Monitoring** — Fehler gehen in `console.error` verloren. Kein Sentry oder vergleichbares Tool.

3. **Keine CI/CD-Pipeline** — Kein automatisierter TypeScript-Check oder Build bei jedem Push.

4. **Keine API-Dokumentation** — Edge Functions sind undokumentiert. Wichtig für Team-Scaling.

---

## 4. Strategieempfehlung — Weiterentwicklung

### Phase 1: Sofort (nächste 2-4 Wochen) — "Stabilisierung & Qualität"

| Priorität | Massnahme | Begründung |
|-----------|-----------|------------|
| **Hoch** | **CI/CD-Pipeline** | GitHub Actions: TypeScript-Check + Tests + Build bei jedem Push. Verhindert Regressionen und Broken Deploys. Die 120 Tests existieren — sie müssen automatisch laufen. |
| **Hoch** | **Error Monitoring (Sentry)** | Produktionsfehler werden aktuell nicht erfasst. Sentry einbinden für Frontend + Edge Functions. Kritisch für professionellen Betrieb. |
| **Mittel** | **Test-Coverage erweitern** | Aktuelle 120 Tests decken API-Schicht ab. React-Komponenten (Freigabe-Flow, Status-Toggle, Notification Bell) sollten ebenfalls getestet werden. Ziel: 60% Coverage auf Geschäftslogik. |

### Phase 2: Kurzfristig (1-2 Monate) — "Client Value"

| Priorität | Massnahme | Begründung |
|-----------|-----------|------------|
| **Hoch** | **Compliance-Kalender** | Neue Seite im Portal: Kalenderansicht aller Fristen (Massnahmen, Dokumenten-Reviews, regulatorische Deadlines). Exportierbar als ICS. Compliance Officer leben nach Kalendern. |
| **Hoch** | **Automatisierte Compliance-Checks** | Basierend auf dem Firmenprofil: "Ihre KYC-Checkliste ist seit 14 Monaten nicht aktualisiert — gemäss Art. 3 GwG sollte sie jährlich überprüft werden." Proaktive Hinweise statt reaktive Alerts. |
| **Mittel** | **Echtzeit-Updates** | Supabase Realtime Subscriptions für Alerts und Dokumente. Client soll neue Alerts sofort sehen, ohne Reload. |

### Phase 3: Mittelfristig (3-6 Monate) — "Platform"

| Priorität | Massnahme | Begründung |
|-----------|-----------|------------|
| **Hoch** | **Client-Dashboard: Compliance Score** | Aggregierter Score basierend auf: Dokumentenaktualität, offene Massnahmen, Fristeneinhaltung. Visuell als Gauge/Donut. Gamification-Element ("Ihr Score: 87/100 — Sehr gut"). |
| **Mittel** | **White-Label / Branding** | Kunden (v.a. grössere FIs) wollen ihr Logo im Portal sehen. Empfehlung: Organisations-Logo + Primärfarbe konfigurierbar. Niedrig-hängende Frucht mit hohem Perceived Value. |
| **Mittel** | **API für Drittsysteme** | REST-API für CRM-Integration (Salesforce, HubSpot) und Buchhaltung. Ermöglicht Enterprise-Kunden die Integration in bestehende Workflows. |

### Phase 4: Langfristig (6-12 Monate) — "Scale"

| Priorität | Massnahme | Begründung |
|-----------|-----------|------------|
| **Hoch** | **Mehrsprachigkeit (DE/FR/IT/EN)** | Schweizer Markt ist dreisprachig. EU-Expansion braucht EN. i18n-Framework einführen (z.B. react-intl). Dokumente müssen ebenfalls mehrsprachig generierbar sein. |
| **Hoch** | **Automatisierter Compliance-Report** | Quartals-/Jahresbericht als PDF: "Ihr Compliance-Status Q1 2026". Zeigt erledigte Massnahmen, aktualisierte Dokumente, regulatorische Entwicklungen. Wird automatisch generiert und per E-Mail verschickt. |
| **Mittel** | **Audit-Mode für SRO-Prüfungen** | Spezielle Ansicht für Auditoren: Alle Dokumente, Audit Trail, Massnahmen-Historie auf einen Blick. Read-only Zugang per Einladungslink (zeitlich begrenzt). Reduziert Audit-Aufwand massiv. |
| **Mittel** | **Workflow-Engine** | Definierbare Workflows: "Wenn neuer Alert mit Severity Critical → automatisch E-Mail an VR + Compliance Officer + Massnahme mit Frist 30 Tage anlegen". Reduziert manuelle Admin-Arbeit. |

---

## 5. Technische Empfehlungen

| Bereich | Empfehlung |
|---------|------------|
| **Testing** | ~~Vitest + React Testing Library einführen.~~ **Umgesetzt:** 120 Tests (4 Suites). Nächster Schritt: Component-Tests und Coverage-Report. |
| **Error Monitoring** | Sentry oder ähnliches einbinden. Aktuell gehen Fehler in `console.error` verloren. |
| **Performance** | Supabase Realtime Subscriptions für Alerts evaluieren. Client soll neue Alerts sofort sehen, ohne Reload. |
| **CI/CD** | GitHub Actions: TypeScript-Check + Tests + Build bei jedem Push. Verhindert Broken Deploys. |
| **Dokumentation** | API-Dokumentation für Edge Functions (OpenAPI/Swagger). Wichtig für Team-Scaling. |

---

## 6. Fazit

Das Portal hat seit der Erstbewertung **erhebliche Fortschritte** gemacht. Alle acht ursprünglich identifizierten Schwächen wurden adressiert:

- **PDF-Export** — Professionell gebrandete PDFs mit Checkboxen, Formularfeldern und Kopf-/Fusszeile
- **Benachrichtigungen** — E-Mail bei Alert-Veröffentlichung + In-App Notification Bell
- **Mobile Layout** — Responsive mit Hamburger-Drawer und adaptiven Breakpoints
- **Multi-User** — Drei Rollen (Viewer, Editor, Approver) mit Einladungs-Workflow
- **Tests** — 120 automatisierte Tests über alle API-Schichten
- **Admin-Dokumentenansicht** — Modernisiert mit Bulk-Aktionen und PDF-Export
- **Kommentar-Funktion** — Thread-basierter Dialog auf Massnahmen
- **Dokumenten-Versionierung** — Visueller Diff zwischen Versionen

Zusätzlich wurde ein **komplett neues Feature** implementiert: die **Endkunden-Verwaltung (KYC/KYB)** mit vollständigem CDD-Workflow, Kontakte-Management, Dokumenten-Freigabe, Archivierung und Audit Trail.

Die KI-Pipeline (RSS → Analyse → Client-Matching → Alert → E-Mail) und der immutable Audit Trail bleiben die zentralen Differenzierungsmerkmale. Die **nächsten Prioritäten** sind Stabilisierung (CI/CD, Error Monitoring), gefolgt von Compliance-Kalender und automatisierten Compliance-Checks als nächste Wertschöpfungs-Features.

Das System ist von einem **fortgeschrittenen MVP** zu einer **produktionsreifen Plattform** herangewachsen.
