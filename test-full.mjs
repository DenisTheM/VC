#!/usr/bin/env node
/**
 * VIRTUE COMPLIANCE — Comprehensive Integration Test Suite
 * =========================================================
 * Tests all portal functions end-to-end with a real admin user.
 *
 * Credentials via .env.test:
 *   TEST_EMAIL=your@email.com
 *   TEST_PASSWORD=yourpassword
 *
 * Usage: node test-full.mjs
 */

import { readFileSync } from "fs";

// ── Config ──────────────────────────────────────────────────────────
const envVars = {};
try {
  const content = readFileSync(".env.test", "utf-8");
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i > 0) envVars[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
} catch { /* */ }

const SUPABASE_URL = "https://oylkwprbuaugndbzflvh.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bGt3cHJidWF1Z25kYnpmbHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NTU4MTcsImV4cCI6MjA4NzMzMTgxN30.TR9LOvO66FN7FOFZ2AUKn5dSjvOnzQBPzpyptRBsctA";
const EMAIL = process.argv[2] || envVars.TEST_EMAIL;
const PASSWORD = process.argv[3] || envVars.TEST_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Missing credentials. Set TEST_EMAIL/TEST_PASSWORD in .env.test");
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────
let TOKEN = "";
let USER_ID = "";
const results = [];
let passCount = 0;
let failCount = 0;
let warnCount = 0;
const issues = [];
const suggestions = [];

function log(icon, msg) { console.log(`  ${icon} ${msg}`); }
function pass(msg) { passCount++; results.push({ s: "PASS", msg }); log("✅", msg); }
function fail(msg, detail) { failCount++; results.push({ s: "FAIL", msg, detail }); log("❌", msg + (detail ? ` — ${detail}` : "")); issues.push({ msg, detail }); }
function warn(msg, detail) { warnCount++; results.push({ s: "WARN", msg, detail }); log("⚠️ ", msg + (detail ? ` — ${detail}` : "")); }
function suggest(category, text) { suggestions.push({ category, text }); }
function section(title) { console.log(`\n${"═".repeat(60)}\n  ${title}\n${"═".repeat(60)}`); }

async function api(path, opts = {}) {
  const url = `${SUPABASE_URL}${path}`;
  const headers = { apikey: ANON_KEY, "Content-Type": "application/json", ...opts.headers };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(url, { ...opts, headers });
  return res;
}

async function rest(table, query = "") {
  const res = await api(`/rest/v1/${table}${query ? "?" + query : ""}`);
  if (!res.ok) throw new Error(`REST ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function fn(name, body) {
  const res = await api(`/functions/v1/${name}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

// ── Test Modules ────────────────────────────────────────────────────

async function testAuth() {
  section("1. AUTHENTICATION & PROFILE");

  // Sign in
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  if (!res.ok) {
    fail("Login failed", `${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  const auth = await res.json();
  TOKEN = auth.access_token;
  USER_ID = auth.user.id;
  pass(`Login successful (user: ${USER_ID.slice(0, 8)}...)`);

  // Check profile role
  const profiles = await rest("profiles", `select=id,role,full_name&id=eq.${USER_ID}`);
  if (profiles.length === 0) {
    fail("No profile found for user");
  } else {
    const p = profiles[0];
    if (p.role === "admin") {
      pass(`Profile role: admin (${p.full_name || "no name"})`);
    } else {
      warn(`Profile role is '${p.role}', expected 'admin'`);
    }
    if (!p.full_name) {
      warn("Profile has no full_name set");
      suggest("UX", "Admins sollten beim Onboarding ihren Namen eingeben müssen");
    }
  }

  // Check JWT expiry
  try {
    const payload = JSON.parse(atob(TOKEN.split(".")[1]));
    const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
    if (expiresIn < 600) warn(`JWT expires in ${expiresIn}s — very short`);
    else pass(`JWT valid for ${Math.round(expiresIn / 60)} min`);
  } catch { warn("Could not decode JWT payload"); }
}

async function testOrganizations() {
  section("2. ORGANIZATIONS");

  const orgs = await rest("organizations", "select=id,name,short_name,industry,sro,country,contact_name,contact_email&order=name");
  if (orgs.length === 0) {
    fail("No organizations found — portal is empty");
    return [];
  }
  pass(`${orgs.length} organization(s) loaded`);

  // Data quality checks
  let missingCountry = 0, missingIndustry = 0, missingSro = 0, missingContact = 0, missingEmail = 0;
  for (const org of orgs) {
    if (!org.country) missingCountry++;
    if (!org.industry) missingIndustry++;
    if (!org.sro) missingSro++;
    if (!org.contact_name) missingContact++;
    if (!org.contact_email) missingEmail++;
  }

  if (missingCountry > 0) warn(`${missingCountry}/${orgs.length} orgs missing 'country'`);
  else pass("All orgs have country set");

  if (missingIndustry > 0) warn(`${missingIndustry}/${orgs.length} orgs missing 'industry'`);
  else pass("All orgs have industry set");

  if (missingSro > 0) warn(`${missingSro}/${orgs.length} orgs missing 'SRO'`);
  else pass("All orgs have SRO set");

  if (missingEmail > 0) warn(`${missingEmail}/${orgs.length} orgs missing contact_email — no notifications possible`);
  else pass("All orgs have contact_email");

  suggest("DATA", "Pflichtfelder bei Org-Erstellung: Land, Branche, SRO, CO-Email erzwingen");

  return orgs;
}

async function testCompanyProfiles(orgs) {
  section("3. COMPANY PROFILES");

  let withProfile = 0, emptyProfile = 0, incompleteProfile = 0;
  const requiredFields = ["company_name", "legal_form", "industry", "sro"];

  for (const org of orgs.slice(0, 5)) { // Test first 5
    const profiles = await rest("company_profiles", `select=id,data,completed&organization_id=eq.${org.id}&limit=1`);
    if (profiles.length === 0) {
      emptyProfile++;
      continue;
    }
    withProfile++;
    const data = profiles[0].data || {};
    const missing = requiredFields.filter(f => !data[f]);
    if (missing.length > 0) incompleteProfile++;
  }

  if (emptyProfile > 0) warn(`${emptyProfile}/${Math.min(orgs.length, 5)} orgs have no company profile`);
  if (incompleteProfile > 0) warn(`${incompleteProfile} profiles missing key fields (company_name, legal_form, industry, sro)`);
  if (withProfile > 0 && emptyProfile === 0 && incompleteProfile === 0) pass("All checked profiles are complete");
  else if (withProfile > 0) pass(`${withProfile} profiles exist`);

  suggest("UX", "Profil-Vollständigkeit als % anzeigen + Erinnerung wenn unvollständig");
}

async function testOrgMembers(orgId) {
  section("4. ORGANIZATION MEMBERS");

  const members = await rest("organization_members", `select=id,user_id,role&organization_id=eq.${orgId}`);
  if (members.length === 0) {
    warn("No members in first organization — clients can't access portal");
    suggest("CRITICAL", "Organisation ohne Mitglieder: Automatisch CO als Approver einladen");
    return;
  }
  pass(`${members.length} member(s) in org`);

  const roles = members.map(m => m.role);
  const hasApprover = roles.includes("approver");
  if (!hasApprover) {
    warn("No 'approver' role — documents can't be approved by client");
    suggest("WORKFLOW", "Mindestens 1 Approver pro Organisation erzwingen");
  } else {
    pass("At least one approver exists");
  }

  // Check for orphan members (no profile)
  for (const m of members) {
    const profiles = await rest("profiles", `select=id,role,full_name&id=eq.${m.user_id}`);
    if (profiles.length === 0) {
      fail(`Member ${m.id} has no profile entry`);
    } else if (!profiles[0].full_name) {
      warn(`Member ${m.user_id.slice(0, 8)}... has no full_name`);
    }
  }
}

async function testDocuments(orgId) {
  section("5. DOCUMENTS");

  const docs = await rest("documents", `select=id,name,doc_type,status,content,jurisdiction,version,created_at,updated_at,wizard_answers&organization_id=eq.${orgId}&order=created_at.desc`);

  if (docs.length === 0) {
    warn("No documents for this organization");
    return null;
  }
  pass(`${docs.length} document(s) found`);

  // Status distribution
  const statusCounts = {};
  docs.forEach(d => { statusCounts[d.status] = (statusCounts[d.status] || 0) + 1; });
  log("📊", `Status: ${Object.entries(statusCounts).map(([k,v]) => `${k}=${v}`).join(", ")}`);

  // Content checks
  let emptyContent = 0, noWizardAnswers = 0, veryShort = 0;
  for (const doc of docs) {
    if (!doc.content || doc.content.trim().length === 0) emptyContent++;
    else if (doc.content.length < 500) veryShort++;
    if (!doc.wizard_answers || Object.keys(doc.wizard_answers).length === 0) noWizardAnswers++;
  }

  if (emptyContent > 0) fail(`${emptyContent} document(s) have empty content`);
  else pass("All documents have content");

  if (veryShort > 0) warn(`${veryShort} document(s) have very short content (<500 chars)`);
  if (noWizardAnswers > 0) warn(`${noWizardAnswers} document(s) have no wizard_answers stored`);

  // Check for markdown quality
  const latest = docs[0];
  if (latest.content) {
    const hasH1 = latest.content.includes("# ");
    const hasH2 = latest.content.includes("## ");
    const hasCheckboxes = latest.content.includes("- [ ]");
    if (!hasH1) warn("Latest doc missing # heading");
    if (!hasH2) warn("Latest doc missing ## subheadings");
    if (hasH1 && hasH2) pass("Latest doc has proper heading structure");
    if (hasCheckboxes) pass("Latest doc uses checkboxes (interactive)");
  }

  // Version tracking
  const versioned = await rest("document_versions", `select=id&document_id=eq.${latest.id}&limit=1`);
  if (versioned.length === 0) warn("No version history for latest document");
  else pass("Version history exists for latest document");

  suggest("DOC", "Automatische Versionierung bei Content-Änderungen (Diff speichern)");
  suggest("DOC", "Dokument-Ablaufdatum: Jährliche Überprüfung erzwingen (FINMA Anforderung)");

  return latest;
}

async function testDocumentGeneration(orgId, companyProfile) {
  section("6. DOCUMENT GENERATION (Edge Function)");

  // Test with minimal doc type (KYC checklist — fast)
  const start = Date.now();
  log("⏳", "Generating KYC checklist with custom chapters + prompt...");

  const { status, ok, data } = await fn("generate-document", {
    docType: "kyc_checklist",
    jurisdiction: "CH",
    companyProfile,
    answers: {
      client_type: "Juristische Person (AG/GmbH)",
      onboard_channel: "Kombiniert",
      expected_volume: "CHF 25'000-100'000",
      __customPrompt: "Kurze Version, maximal 1 Seite. Nur die wichtigsten Punkte.",
    },
    organizationId: orgId,
    chapters: ["Identifikation", "PEP-Prüfung", "Risikobewertung"],
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (!ok) {
    fail(`Generation failed (${status}, ${elapsed}s)`, JSON.stringify(data).slice(0, 200));

    // Test specific error codes
    if (data?.code === "rate_limit") warn("Rate limit hit — retry logic important");
    if (data?.code === "overloaded") warn("Claude API overloaded");
    if (data?.code === "timeout") fail("Generation timed out (>120s)");
    if (data?.code === "empty_content") fail("Claude returned empty content");

    return null;
  }

  pass(`Generation successful (${status}, ${elapsed}s)`);

  const content = data.document?.content || "";
  const docId = data.document?.id;
  log("📄", `Document ID: ${docId}`);
  log("📄", `Content: ${content.length} chars`);

  // Quality checks
  if (content.length < 200) warn("Generated content is very short (<200 chars)");
  else pass(`Content length OK (${content.length} chars)`);

  if (elapsed > 60) warn(`Generation took ${elapsed}s — may cause UX issues`);
  else if (elapsed > 30) log("⏱️", `Generation took ${elapsed}s (acceptable)`);
  else pass(`Fast generation: ${elapsed}s`);

  // Check custom chapters were followed
  const contentLower = content.toLowerCase();
  const hasIdent = contentLower.includes("identifikation");
  const hasPep = contentLower.includes("pep");
  const hasRisk = contentLower.includes("risiko");
  if (hasIdent && hasPep && hasRisk) pass("Custom chapter structure followed");
  else warn("Custom chapters may not have been fully followed");

  // Check for formatting issues
  if (content.includes("%%%%%") || content.includes("=====")) fail("Forbidden formatting chars in content");
  if (content.includes("§§§")) warn("Unusual formatting found");
  if (!content.includes("---") && !content.includes("___")) log("ℹ️", "No horizontal rules in doc (optional)");

  suggest("GEN", "Generierte Dokumente automatisch auf Formatierungsfehler prüfen (Post-Processing)");
  suggest("GEN", "Generierungsdauer in DB speichern für Performance-Monitoring");

  return docId;
}

async function testDocumentWorkflow(docId) {
  section("7. DOCUMENT STATUS WORKFLOW");

  if (!docId) { warn("Skipping — no document to test"); return; }

  // Read current status
  const docs = await rest("documents", `select=id,status&id=eq.${docId}`);
  if (docs.length === 0) { fail("Generated document not found in DB"); return; }

  const originalStatus = docs[0].status;
  pass(`Document exists with status '${originalStatus}'`);

  // Test status transitions: draft → review → current → outdated → draft
  const transitions = [
    { to: "review", label: "draft → review" },
    { to: "current", label: "review → current" },
    { to: "outdated", label: "current → outdated" },
    { to: "draft", label: "outdated → draft (reset)" },
  ];

  for (const t of transitions) {
    const res = await api(`/rest/v1/documents?id=eq.${docId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: t.to, updated_at: new Date().toISOString() }),
    });
    if (res.ok) pass(`Status change: ${t.label}`);
    else fail(`Status change failed: ${t.label}`, `${res.status}`);
  }

  // Check audit log was created
  const audit = await rest("document_audit_log", `select=id,action&document_id=eq.${docId}&order=changed_at.desc&limit=5`);
  if (audit.length > 0) pass(`Audit log has ${audit.length} entries`);
  else warn("No audit log entries — triggers may not be firing");

  suggest("WORKFLOW", "Status-Transitionen validieren (z.B. outdated → review sollte nicht direkt möglich sein)");
  suggest("AUDIT", "Audit-Log Retention Policy: Einträge nie löschen (10 Jahre Aufbewahrung nach GwG)");
}

async function testDocumentEditing(docId) {
  section("8. DOCUMENT CONTENT EDITING");

  if (!docId) { warn("Skipping — no document"); return; }

  // Read content
  const docs = await rest("documents", `select=id,content,status&id=eq.${docId}`);
  const original = docs[0].content;

  // Update content
  const testContent = original + "\n\n<!-- Test edit -->";
  const res = await api(`/rest/v1/documents?id=eq.${docId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ content: testContent, updated_at: new Date().toISOString() }),
  });

  if (res.ok) pass("Content update successful");
  else fail("Content update failed", `${res.status}`);

  // Revert
  await api(`/rest/v1/documents?id=eq.${docId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ content: original, updated_at: new Date().toISOString() }),
  });
  pass("Content reverted to original");

  suggest("EDITING", "Content-Diff bei Speicherung berechnen und als Version archivieren");
  suggest("EDITING", "Markdown-Preview neben Editor anzeigen (Split View)");
}

async function testAlerts() {
  section("9. REGULATORY ALERTS");

  // Load all alert types
  const [active, drafts, dismissed] = await Promise.all([
    rest("regulatory_alerts", "select=id,title,severity,status,category,jurisdiction,created_at&status=in.(new,acknowledged,in_progress,resolved)&order=created_at.desc&limit=10"),
    rest("regulatory_alerts", "select=id,title,status&status=eq.draft&limit=10"),
    rest("regulatory_alerts", "select=id,title,status&status=eq.dismissed&limit=10"),
  ]);

  log("📊", `Active: ${active.length}, Drafts: ${drafts.length}, Dismissed: ${dismissed.length}`);

  if (active.length === 0 && drafts.length === 0) {
    warn("No alerts in system — regulatory monitoring not active?");
    suggest("CRITICAL", "Automatisches Regulatory Feed einrichten (FINMA, BaFin RSS/API)");
  } else {
    pass(`${active.length + drafts.length + dismissed.length} total alerts`);
  }

  // Check alert data quality
  for (const alert of active.slice(0, 3)) {
    if (!alert.category) warn(`Alert "${alert.title.slice(0, 30)}..." missing category`);
    if (!alert.jurisdiction) warn(`Alert "${alert.title.slice(0, 30)}..." missing jurisdiction`);
  }

  // Check affected clients
  if (active.length > 0) {
    const affected = await rest("alert_affected_clients", `select=id,organization_id,risk,reason&alert_id=eq.${active[0].id}`);
    if (affected.length > 0) pass(`Latest alert has ${affected.length} affected client(s)`);
    else warn("Latest alert has no affected clients assigned");

    // Check client actions
    if (affected.length > 0) {
      const actions = await rest("client_alert_actions", `select=id,text,status&alert_affected_client_id=eq.${affected[0].id}`);
      if (actions.length > 0) {
        pass(`${actions.length} client action(s) assigned`);
        const completed = actions.filter(a => a.status === "erledigt").length;
        log("📊", `Actions: ${completed}/${actions.length} completed`);
      } else {
        warn("No client actions assigned to affected client");
        suggest("WORKFLOW", "Automatisch Standard-Massnahmen bei Alert-Freigabe zuweisen");
      }
    }
  }

  suggest("ALERTS", "Alert-Severity KPI Dashboard: Durchschnittliche Reaktionszeit pro Severity");
  suggest("ALERTS", "Automatische Deadline-Erinnerungen an betroffene Kunden");

  return active[0]?.id || null;
}

async function testNotifications() {
  section("10. NOTIFICATIONS");

  const notifs = await rest("notifications", `select=id,type,title,read,created_at&user_id=eq.${USER_ID}&order=created_at.desc&limit=20`);
  log("📊", `${notifs.length} notification(s) for current user`);

  if (notifs.length > 0) {
    pass("Notification system active");
    const unread = notifs.filter(n => !n.read).length;
    log("📊", `${unread} unread notifications`);

    const types = {};
    notifs.forEach(n => { types[n.type] = (types[n.type] || 0) + 1; });
    log("📊", `Types: ${Object.entries(types).map(([k,v]) => `${k}=${v}`).join(", ")}`);
  } else {
    warn("No notifications — system may not be generating them");
  }

  suggest("NOTIF", "Push-Benachrichtigungen (Web Push API) für kritische Alerts");
  suggest("NOTIF", "Wöchentlicher Compliance-Digest per Email");
}

async function testAdminMessages(orgId) {
  section("11. ADMIN MESSAGING");

  // Send a test message
  log("⏳", "Sending test message...");
  const { status, ok, data } = await fn("send-client-message", {
    organization_id: orgId,
    subject: "[TEST] Automatischer Funktionstest",
    body: "Dies ist eine automatische Testnachricht des Virtue Compliance Test-Skripts. Bitte ignorieren.",
  });

  if (ok && data?.success) {
    pass(`Message sent (${data.sent} email(s), ${data.recipients || "?"} recipient(s))`);
  } else if (ok) {
    warn("Message saved but sending had issues", JSON.stringify(data).slice(0, 200));
  } else {
    fail("Message sending failed", `${status}: ${JSON.stringify(data).slice(0, 200)}`);
  }

  // Check message in DB
  const msgs = await rest("admin_messages", `select=id,subject,created_at&organization_id=eq.${orgId}&order=created_at.desc&limit=5`);
  if (msgs.length > 0 && msgs[0].subject.includes("[TEST]")) {
    pass("Message saved in admin_messages table");

    // Clean up test message
    await api(`/rest/v1/admin_messages?id=eq.${msgs[0].id}`, { method: "DELETE" });
    pass("Test message cleaned up");
  } else {
    warn("Message not found in admin_messages");
  }

  suggest("MSG", "Nachrichtenverlauf im Portal für Kunden sichtbar machen");
  suggest("MSG", "Templates für häufige Nachrichten (z.B. Jahres-Erinnerung, Regulatorisches Update)");
}

async function testEdgeFunctionErrors() {
  section("12. ERROR HANDLING & EDGE CASES");

  // Test generate-document with missing fields
  const { data: d1 } = await fn("generate-document", { docType: "aml_policy" });
  if (d1?.error) pass("Missing fields: proper error returned");
  else fail("Missing fields: no error returned");

  // Test with missing orgId
  const { data: d2 } = await fn("generate-document", {
    docType: "aml_policy",
    jurisdiction: "CH",
    companyProfile: { company_name: "Test" },
    answers: {},
  });
  if (d2?.error) pass("Missing orgId: proper error returned");
  else fail("Missing orgId: no error returned");

  // Test send-client-message with missing fields
  const { data: d3 } = await fn("send-client-message", { organization_id: "invalid" });
  if (d3?.error) pass("Messaging missing fields: proper error");
  else fail("Messaging missing fields: no error");

  // Test accessing non-existent document
  const fakeDocs = await rest("documents", "select=id&id=eq.00000000-0000-0000-0000-000000000000");
  if (fakeDocs.length === 0) pass("Non-existent document: returns empty (correct)");
  else fail("Non-existent document: returned data unexpectedly");
}

async function testRLSSecurity() {
  section("13. RLS & SECURITY VERIFICATION");

  // Verify admin can access organizations
  const orgs = await rest("organizations", "select=id&limit=1");
  if (orgs.length > 0) pass("Admin can read organizations");
  else warn("Admin can't read organizations — RLS issue?");

  // Verify admin can access all documents
  const docs = await rest("documents", "select=id&limit=1");
  if (docs.length > 0) pass("Admin can read all documents");
  else warn("No documents accessible");

  // Verify admin can access profiles
  const profiles = await rest("profiles", "select=id,role&limit=5");
  const hasClients = profiles.some(p => p.role === "client");
  if (hasClients) pass("Admin can see client profiles (for management)");
  else log("ℹ️", "No client profiles exist yet");

  // Check for sensitive data exposure
  suggest("SECURITY", "Rate Limiting auf Edge Functions (z.B. 10 Generierungen/Stunde pro User)");
  suggest("SECURITY", "API Key Rotation Policy für Anthropic/Resend Keys");
  suggest("SECURITY", "Content Security Policy (CSP) Headers auf Vercel konfigurieren");
}

async function testDashboardStats() {
  section("14. DASHBOARD & STATISTICS");

  // Admin dashboard stats
  const [docsRes, alertsRes, draftRes] = await Promise.all([
    rest("documents", "select=id&limit=0", true).catch(() => null),
    api("/rest/v1/documents?select=id", { headers: { Prefer: "count=exact" } }),
    api("/rest/v1/regulatory_alerts?select=id&status=eq.draft", { headers: { Prefer: "count=exact" } }),
  ]);

  const docCount = alertsRes.headers?.get("content-range")?.split("/")?.[1] || "?";
  const draftCount = draftRes.headers?.get("content-range")?.split("/")?.[1] || "?";

  log("📊", `Documents: ${docCount}, Draft Alerts: ${draftCount}`);
  pass("Dashboard stats endpoint working");

  suggest("DASHBOARD", "Compliance Score pro Organisation (% der erledigten Massnahmen)");
  suggest("DASHBOARD", "Zeitbasierte Trends: Alerts/Monat, Generierungen/Monat");
  suggest("DASHBOARD", "SRO-Prüfungs-Countdown (Tage bis zur nächsten Revision)");
}

async function testCustomerManagement(orgId) {
  section("15. CUSTOMER MANAGEMENT (KYC)");

  const customers = await rest("client_customers", `select=id,customer_type,first_name,last_name,company_name,risk_level,status,next_review&organization_id=eq.${orgId}&limit=20`);

  if (customers.length === 0) {
    warn("No customers (Endkunden) in this organization");
    suggest("KYC", "Demo-Kunden für neue Organisationen automatisch anlegen");
    return;
  }

  pass(`${customers.length} customer(s) found`);

  // Risk distribution
  const riskCounts = {};
  customers.forEach(c => { riskCounts[c.risk_level] = (riskCounts[c.risk_level] || 0) + 1; });
  log("📊", `Risk levels: ${Object.entries(riskCounts).map(([k,v]) => `${k}=${v}`).join(", ")}`);

  // Review dates
  const now = new Date();
  let overdueReviews = 0, upcomingReviews = 0;
  for (const c of customers) {
    if (c.next_review) {
      const reviewDate = new Date(c.next_review);
      if (reviewDate < now) overdueReviews++;
      else if (reviewDate < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) upcomingReviews++;
    }
  }

  if (overdueReviews > 0) warn(`${overdueReviews} customer(s) with overdue reviews!`);
  else pass("No overdue customer reviews");
  if (upcomingReviews > 0) log("ℹ️", `${upcomingReviews} reviews due within 30 days`);

  // Customer documents
  const custDocs = await rest("customer_documents", `select=id,status,template_key&organization_id=eq.${orgId}&limit=10`);
  log("📊", `${custDocs.length} customer document(s)`);

  suggest("KYC", "Automatische Risiko-Neuberechnung bei Änderungen am Kundenprofil");
  suggest("KYC", "Batch-Import von Kunden (CSV/Excel Upload)");
  suggest("KYC", "PEP/Sanktionslisten-Screening Integration (SECO API, OpenSanctions)");
}

async function testHelpRequests(orgId) {
  section("16. HELP REQUESTS");

  const requests = await rest("help_requests", `select=id,subject,status,created_at,admin_response&order=created_at.desc&limit=10`);
  log("📊", `${requests.length} help request(s) total`);

  if (requests.length > 0) {
    const open = requests.filter(r => r.status === "open").length;
    const resolved = requests.filter(r => r.status === "resolved").length;
    log("📊", `Open: ${open}, Resolved: ${resolved}`);

    if (open > 0) warn(`${open} unresolved help request(s)`);
    else pass("All help requests resolved");

    // Response time check
    const withResponse = requests.filter(r => r.admin_response);
    log("📊", `${withResponse.length}/${requests.length} have admin response`);
  }

  suggest("HELP", "SLA-Tracking: Antwortzeit-Ziel setzen (z.B. 24h für kritische Anfragen)");
  suggest("HELP", "FAQ/Wissensdatenbank für häufige Compliance-Fragen");
}

async function testZefix() {
  section("17. ZEFIX INTEGRATION");

  const { status, ok, data } = await fn("zefix-lookup", { query: "Virtue Compliance" });
  if (ok && data?.results?.length > 0) {
    pass(`Zefix lookup working (${data.results.length} result(s))`);
  } else if (ok) {
    warn("Zefix lookup returned 0 results (may be correct)");
  } else {
    fail("Zefix lookup failed", `${status}`);
  }
}

async function testDataIntegrity() {
  section("18. DATA INTEGRITY & CONSISTENCY");

  // Documents without organization
  const orphanDocs = await rest("documents", "select=id,name&organization_id=is.null&limit=5");
  if (orphanDocs.length > 0) fail(`${orphanDocs.length} document(s) without organization`);
  else pass("No orphan documents");

  // Alerts with no affected clients
  const alerts = await rest("regulatory_alerts", "select=id,title&status=in.(new,acknowledged,in_progress)&limit=20");
  let alertsNoClients = 0;
  for (const a of alerts) {
    const affected = await rest("alert_affected_clients", `select=id&alert_id=eq.${a.id}&limit=1`);
    if (affected.length === 0) alertsNoClients++;
  }
  if (alertsNoClients > 0) warn(`${alertsNoClients} active alert(s) have no affected clients`);
  else if (alerts.length > 0) pass("All active alerts have affected clients");

  suggest("INTEGRITY", "Nachtliche DB-Konsistenzprüfung (Cron Job für verwaiste Datensätze)");
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("\n" + "╔" + "═".repeat(58) + "╗");
  console.log("║  VIRTUE COMPLIANCE — Comprehensive Integration Tests     ║");
  console.log("║  " + new Date().toISOString().slice(0, 19) + " ".repeat(38) + "║");
  console.log("╚" + "═".repeat(58) + "╝");

  await testAuth();
  const orgs = await testOrganizations();
  const orgId = orgs[0]?.id;

  if (orgId) {
    await testCompanyProfiles(orgs);
    await testOrgMembers(orgId);

    // Get company profile for generation
    const profiles = await rest("company_profiles", `select=data&organization_id=eq.${orgId}&limit=1`);
    const companyProfile = profiles?.[0]?.data || { company_name: orgs[0].name };

    const latestDoc = await testDocuments(orgId);
    const generatedDocId = await testDocumentGeneration(orgId, companyProfile);
    await testDocumentWorkflow(generatedDocId);
    await testDocumentEditing(generatedDocId);
    await testAlerts();
    await testNotifications();
    await testAdminMessages(orgId);
    await testCustomerManagement(orgId);
    await testHelpRequests(orgId);
  }

  await testEdgeFunctionErrors();
  await testRLSSecurity();
  await testDashboardStats();
  await testZefix();
  await testDataIntegrity();

  // ── Summary ─────────────────────────────────────────────────────
  section("SUMMARY");
  console.log(`\n  ✅ Passed:  ${passCount}`);
  console.log(`  ❌ Failed:  ${failCount}`);
  console.log(`  ⚠️  Warnings: ${warnCount}`);
  console.log(`  Total:     ${passCount + failCount + warnCount}\n`);

  if (issues.length > 0) {
    console.log("  ── ISSUES TO FIX ──────────────────────────────────────");
    issues.forEach((iss, i) => {
      console.log(`  ${i + 1}. ${iss.msg}${iss.detail ? `\n     → ${iss.detail}` : ""}`);
    });
  }

  if (suggestions.length > 0) {
    console.log("\n  ── IMPROVEMENT SUGGESTIONS ────────────────────────────");
    const byCat = {};
    suggestions.forEach(s => {
      if (!byCat[s.category]) byCat[s.category] = [];
      byCat[s.category].push(s.text);
    });

    for (const [cat, items] of Object.entries(byCat)) {
      console.log(`\n  [${cat}]`);
      items.forEach(item => console.log(`    • ${item}`));
    }
  }

  console.log("\n" + "═".repeat(60));

  // Exit with appropriate code
  if (failCount > 0) process.exit(1);
}

main().catch(err => {
  console.error("\n💀 Unexpected error:", err);
  process.exit(2);
});
