# Virtue Compliance — Portal-Statusbericht & Strategieempfehlung

**Stand:** 23. Februar 2026
**Erstellt von:** Strategieberatung (technisch)

---

## 1. Funktionsumfang — Kundenportal (Client Portal)

Das Client-Portal (`/app/portal`) ist ein rollengeschütztes Single-Page-Application mit drei Hauptbereichen:

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
| Betroffene Dokumente | Sidebar mit verknüpften Dokumenten, klickbar → Dokument-Detailseite |
| Deep-Linking | Dashboard → Meldung, Dokument → Meldung (bidirektional) |

**Reifegrad:** Sehr hoch — ausgereiftes Feature mit optimistischen UI-Updates, Fehlerbehandlung, bidirektionaler Navigation.

### 1.3 Dokumentation

| Feature | Beschreibung |
|---------|-------------|
| Listenansicht | Gruppiert nach Kategorie, mit Format-Badge (DOCX/PDF/XLSX/PPTX), Version, Status |
| Filter | Nach Status (Aktuell, Review nötig, Entwurf, Veraltet), Kategorie, Volltextsuche |
| Quick-Filter Cards | Klickbare Zähler für Gesamt/Aktuell/Review/Mit Hinweisen |
| Detailansicht | Vollbild mit Metadaten-Grid (Aktualisiert, Rechtsgrundlage, Umfang) |
| Dokumentvorschau | Aufklappbarer Preview im Papier-Look mit Download-Toolbar |
| Freigabe-Workflow | "Freigeben"-Button bei Status "Review", mit Bestätigungsdialog |
| Änderungsverlauf | Aufklappbare Timeline aller Dokumentänderungen (immutabler Audit Trail) |
| Verknüpfte Meldungen | Zeigt regulatorische Alerts, die dieses Dokument betreffen, klickbar → Alert-Detailseite |
| Download | Sofort-Download als Datei |
| Elena-Kontakt | Direkter E-Mail-Link zur Beraterin (kontextbezogen mit Dokument-Subject) |

**Reifegrad:** Sehr hoch — professionelle Dokumentverwaltung mit Audit Trail, Freigabe-Flow und Cross-Referencing.

### 1.4 Übergreifende Portal-Features

| Feature | Beschreibung |
|---------|-------------|
| Sidebar-Navigation | Dark-Theme Sidebar mit Logo, 3 Nav-Items, Elena-Kontaktkarte (E-Mail + Telefon), Org-Info, Logout |
| Authentifizierung | Supabase Auth mit Rollenprüfung ("client"), AuthGuard-Komponente |
| Row-Level Security | Kunden sehen nur ihre eigene Organisation (DB-Level) |
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
| Kundenliste | Alle Organisationen mit Dokumentanzahl |
| Neukunden-Formular | Inline-Formular mit Branche, SRO, Kontaktdaten |
| Zefix-Integration | Suche im Schweizer Handelsregister → automatische Befüllung (Name, UID, Rechtsform, Sitz) |
| Rechtsform-Mapping | Automatische Zuordnung der Zefix-Rechtsform auf interne Werte |

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

**Reifegrad:** Sehr hoch — produktionsreif mit Auto-Save, Validierung, relativem Zeitstempel.

### 2.4 Dokumentgenerierung (Wizard)

| Feature | Beschreibung |
|---------|-------------|
| 3-Schritt-Wizard | Dokumenttyp → Jurisdiktion + Profil → Spezifische Fragen |
| 6 Dokumenttypen | AML-Richtlinie, KYC-Checkliste, Risikoklassifizierung, Audit-Vorbereitung, KYT-Policy, Compliance-Jahresbericht |
| Jurisdiktions-Auswahl | CH, DE, EU (einige "Bald verfügbar") |
| Profilzusammenfassung | Read-only Übersicht der Firmendaten vor Generierung |
| Kapitelvorschau | Zeigt erwartete Dokumentkapitel |
| KI-Generierung | Claude AI (Sonnet) generiert den Dokumentinhalt basierend auf Profil + Antworten |

**Reifegrad:** Hoch — Kernprodukt funktioniert gut.

### 2.5 Dokumentenübersicht

| Feature | Beschreibung |
|---------|-------------|
| Dokumentliste | Alle generierten Dokumente mit Organisation, Typ, Jurisdiktion, Status |
| Expandierbare Zeilen | Dokumentinhalt, Audit Log, Wizard-Antworten |
| Audit Trail | Änderungsverlauf pro Dokument |

**Reifegrad:** Mittel — funktional, aber UI ist basisch im Vergleich zum Client-Portal.

### 2.6 Regulatorische Meldungen (Admin)

| Feature | Beschreibung |
|---------|-------------|
| 3-Tab-Ansicht | Aktiv, Entwürfe, Abgewiesen |
| Automatische Generierung | Täglicher Cron-Job liest RSS-Feeds, KI klassifiziert und erstellt Entwürfe |
| KI-Matching | Automatische Zuordnung betroffener Kunden basierend auf Branche/SRO/Profil |
| Draft-Editor | Vollständiger Editor für Entwürfe (Titel, Severity, Zusammenfassung, Rechtsgrundlage etc.) |
| Publish-Workflow | Entwurf → Aktiv → Abgewiesen (mit Restore-Option) |
| Kundenzuordnung | Betroffene Kunden mit individueller Risikoeinschätzung + Elena-Kommentar |
| Massnahmen-Editor | Anlegen/Bearbeiten/Löschen von Massnahmen pro Kundenzuordnung |

**Reifegrad:** Sehr hoch — ausgereiftes System mit KI-Pipeline, Draft/Publish-Workflow, Client-Matching.

### 2.7 Backend (Supabase Edge Functions)

| Funktion | Beschreibung |
|----------|-------------|
| `generate-document` | KI-Dokumentgenerierung via Claude API |
| `fetch-regulatory-updates` | Täglicher Cron: RSS-Parsing → KI-Analyse → Draft-Alerts |
| `zefix-lookup` | Handelsregister-Suche (ZEFIX API) |
| `notify-contact` | Kontaktformular-Benachrichtigung |
| `stripe-webhook` | Stripe Payment-Events |
| `create-checkout` | Stripe Checkout Session erstellen |
| `send-reminder` | Erinnerungs-E-Mails |
| `check-overdue` | Überfälligkeitsprüfung (Cron) |

---

## 3. Strategische Bewertung

### 3.1 Stärken

1. **Hoher Reifegrad für ein MVP** — Audit Trails, optimistische Updates, Deep-Linking, RLS — das ist kein Prototyp mehr, das ist produktionsnahes Software-Engineering.

2. **KI-Pipeline als Differenzierungsmerkmal** — Die automatische Regulierungs-Überwachung (RSS → KI-Analyse → Draft-Alert → Client-Matching) ist ein starkes Alleinstellungsmerkmal. Kein Wettbewerber im Schweizer Markt bietet das in dieser Form.

3. **Elena als persönliches Element** — Die durchgehende Präsenz der Beraterin (Kommentare, Kontaktkarten, dynamische Anrede) schafft Vertrauen und unterscheidet das Portal von anonymen SaaS-Tools.

4. **Zefix-Integration** — Automatische Kundendaten-Erfassung spart Admin-Zeit und reduziert Fehler.

5. **Immutabler Audit Trail** — Trigger-basiert, nicht manipulierbar — das ist compliance-relevant und ein Verkaufsargument.

### 3.2 Schwächen

1. **Kein echtes Dokumentformat** — Dokumente werden als Plaintext gespeichert/angezeigt. Kein DOCX/PDF-Rendering, kein professionelles Layout. Für CHF 2'000+/Monat erwarten Kunden druckfertige Dokumente.

2. **Keine Echtzeit-Updates** — Client sieht neue Alerts erst beim Seiten-Reload. Kein Websocket/SSE.

3. **Kein Benachrichtigungssystem** — Keine Push-Notifications, keine E-Mail bei neuen Alerts oder fälligen Massnahmen im Portal.

4. **Keine mobile Nutzung** — Sidebar-Layout ist Desktop-only. Compliance Officer auf dem Weg zum Meeting können nichts nachschauen.

5. **Kein Multi-User pro Organisation** — Ein Client-User pro Firma. In der Realität brauchen VR, Compliance Officer und GL jeweils Zugang.

6. **Keine Tests** — Kein einziger Unit- oder Integrationstest. Bei wachsender Komplexität steigt das Risiko von Regressionen.

7. **Admin-Dokumentenansicht** ist deutlich weniger ausgereift als das Client-Portal.

---

## 4. Strategieempfehlung — Weiterentwicklung

### Phase 1: Sofort (nächste 2-4 Wochen) — "Production Readiness"

| Priorität | Massnahme | Begründung |
|-----------|-----------|------------|
| **Kritisch** | **PDF-Export für Dokumente** | Kunden brauchen druckfertige, professionell formatierte Dokumente. Empfehlung: Server-seitiges PDF-Rendering (z.B. via Puppeteer Edge Function oder WeasyPrint). Jedes generierte Dokument bekommt ein VC-gebrandetes PDF mit Inhaltsverzeichnis, Kopf-/Fusszeile, Versionsnummer. |
| **Kritisch** | **E-Mail-Benachrichtigungen bei neuen Alerts** | Wenn Elena einen Alert publiziert, muss der Kunde eine E-Mail bekommen: "Neue regulatorische Meldung: [Titel] — Bitte prüfen Sie die Details in Ihrem Portal." Sonst loggt niemand ein. |
| **Hoch** | **Fälligkeits-Erinnerungen** | Massnahmen mit Frist müssen automatisch Erinnerungen auslösen (z.B. 7 Tage vorher, am Tag, 1 Tag überfällig). Die Edge Function `send-reminder` existiert — sie muss an die Massnahmen angebunden werden. |
| **Hoch** | **Admin-Dokumentenansicht modernisieren** | Die Admin-Seite für Dokumente hinkt dem Client-Portal hinterher. Gleiches List/Detail-Pattern, bessere Übersicht, Bulk-Aktionen (Status ändern, mehrere Dokumente freigeben). |

### Phase 2: Kurzfristig (1-2 Monate) — "Client Value"

| Priorität | Massnahme | Begründung |
|-----------|-----------|------------|
| **Hoch** | **Multi-User pro Organisation** | VR-Mitglieder, Compliance Officer, Geschäftsleitung — alle brauchen Zugang mit unterschiedlichen Berechtigungen. Empfehlung: Rollen innerhalb der Organisation (Viewer, Editor, Approver). Der Approver gibt Dokumente frei, der Viewer sieht nur. |
| **Hoch** | **In-App Notifications** | Bell-Icon in der Sidebar mit Zähler. Neue Alerts, fällige Massnahmen, freigegebene Dokumente — alles als Notification mit Timestamp. Vermeidet "Login-Vergessen"-Problem. |
| **Mittel** | **Responsive/Mobile Layout** | Mindestens Tablet-tauglich. Sidebar wird zu Hamburger-Menu, Cards stacken vertikal. Compliance Officer im Zug muss Massnahmen abhaken können. |
| **Mittel** | **Kommentar-Funktion auf Massnahmen** | Client kann bei einer Massnahme einen Kommentar hinterlassen ("Anwalt prüft gerade den Vertrag"). Elena sieht das im Admin-Panel. Schafft Dialog ohne E-Mail-Ping-Pong. |
| **Mittel** | **Dokumenten-Versionierung mit Diff** | Wenn Elena ein Dokument aktualisiert, will der Kunde sehen was sich geändert hat. Empfehlung: Einfacher Text-Diff (Änderungen hervorgehoben), gespeichert pro Version. |

### Phase 3: Mittelfristig (3-6 Monate) — "Platform"

| Priorität | Massnahme | Begründung |
|-----------|-----------|------------|
| **Hoch** | **Compliance-Kalender** | Neue Seite im Portal: Kalenderansicht aller Fristen (Massnahmen, Dokumenten-Reviews, regulatorische Deadlines). Exportierbar als ICS. Compliance Officer leben nach Kalendern. |
| **Hoch** | **Automatisierte Compliance-Checks** | Basierend auf dem Firmenprofil: "Ihre KYC-Checkliste ist seit 14 Monaten nicht aktualisiert — gemäss Art. 3 GwG sollte sie jährlich überprüft werden." Proaktive Hinweise statt reaktive Alerts. |
| **Mittel** | **Client-Dashboard: Compliance Score** | Aggregierter Score basierend auf: Dokumentenaktualität, offene Massnahmen, Fristeneinhaltung. Visuell als Gauge/Donut. Gamification-Element ("Ihr Score: 87/100 — Sehr gut"). |
| **Mittel** | **White-Label / Branding** | Kunden (v.a. grössere FIs) wollen ihr Logo im Portal sehen. Empfehlung: Organisations-Logo + Primärfarbe konfigurierbar. Niedrig-hängende Frucht mit hohem Perceived Value. |
| **Niedrig** | **API für Drittsysteme** | REST-API für CRM-Integration (Salesforce, HubSpot) und Buchhaltung. Ermöglicht Enterprise-Kunden die Integration in bestehende Workflows. |

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
| **Testing** | Vitest + React Testing Library einführen. Mindestens API-Funktionen und kritische Flows (Freigabe, Status-Toggle) testen. Ziel: 60% Coverage auf Geschäftslogik. |
| **Error Monitoring** | Sentry oder ähnliches einbinden. Aktuell gehen Fehler in `console.error` verloren. |
| **Performance** | Supabase Realtime Subscriptions für Alerts evaluieren. Client soll neue Alerts sofort sehen, ohne Reload. |
| **CI/CD** | GitHub Actions: TypeScript-Check + Build bei jedem Push. Verhindert Broken Deploys. |
| **Dokumentation** | API-Dokumentation für Edge Functions (OpenAPI/Swagger). Wichtig für Team-Scaling. |

---

## 6. Fazit

Das Portal ist für ein Startup in dieser Phase **bemerkenswert ausgereift**. Die KI-Pipeline (RSS → Analyse → Client-Matching → Alert) und der immutable Audit Trail sind echte Differenzierungsmerkmale, die Wettbewerber in diesem Marktsegment nicht bieten.

Die **grösste Lücke** ist der fehlende PDF-Export — ein Compliance-Dokument, das nicht als professionelles PDF ausdruckbar ist, wird von Kunden und Auditoren nicht akzeptiert. Dies sollte die nächste Priorität sein.

Die **zweitgrösste Lücke** sind fehlende Benachrichtigungen. Ein Portal, in das niemand einloggt, ist wertlos. Push-E-Mails bei neuen Alerts und Fälligkeiten sind existenziell.

Der vorgeschlagene Fahrplan baut systematisch auf den bestehenden Stärken auf und adressiert die Schwächen in der richtigen Reihenfolge: zuerst Production Readiness, dann Client Value, dann Platform, dann Scale.
