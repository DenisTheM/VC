#!/usr/bin/env node
/**
 * Test script for the generate-document edge function.
 *
 * Credentials via .env.test (not committed):
 *   TEST_EMAIL=denis@virtue-compliance.ch
 *   TEST_PASSWORD=yourpassword
 *
 * Or via CLI args: node test-generate.mjs <email> <password>
 */

import { readFileSync } from "fs";

// Load .env.test
const envVars = {};
try {
  const envContent = readFileSync(".env.test", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx > 0) envVars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
} catch { /* .env.test not found, use CLI args */ }

const SUPABASE_URL = "https://oylkwprbuaugndbzflvh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bGt3cHJidWF1Z25kYnpmbHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NTU4MTcsImV4cCI6MjA4NzMzMTgxN30.TR9LOvO66FN7FOFZ2AUKn5dSjvOnzQBPzpyptRBsctA";

const email = process.argv[2] || envVars.TEST_EMAIL;
const password = process.argv[3] || envVars.TEST_PASSWORD;

if (!email || !password) {
  console.error("Credentials missing. Either:");
  console.error("  1. Create .env.test with TEST_EMAIL and TEST_PASSWORD");
  console.error("  2. Run: node test-generate.mjs <email> <password>");
  process.exit(1);
}

async function main() {
  // 1. Sign in
  console.log("🔐 Signing in as", email, "...");
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!authRes.ok) {
    const err = await authRes.text();
    console.error("Auth failed:", authRes.status, err);
    process.exit(1);
  }

  const { access_token, user } = await authRes.json();
  console.log("  User ID:", user.id);
  console.log("  Token:", access_token.slice(0, 30) + "...");

  // 2. Get first organization
  console.log("\n📋 Loading organizations...");
  const orgsRes = await fetch(`${SUPABASE_URL}/rest/v1/organizations?select=id,name&order=name&limit=1`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${access_token}`,
    },
  });

  if (!orgsRes.ok) {
    console.error("Failed to load orgs:", await orgsRes.text());
    process.exit(1);
  }

  const orgs = await orgsRes.json();
  if (orgs.length === 0) {
    console.error("No organizations found. Create one first.");
    process.exit(1);
  }

  const org = orgs[0];
  console.log("  Using org:", org.name, `(${org.id})`);

  // 3. Load company profile
  console.log("\n👤 Loading company profile...");
  const profRes = await fetch(
    `${SUPABASE_URL}/rest/v1/company_profiles?select=data&organization_id=eq.${org.id}&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${access_token}`,
      },
    },
  );

  const profiles = await profRes.json();
  const companyProfile = profiles?.[0]?.data ?? { company_name: org.name };
  console.log("  Profile keys:", Object.keys(companyProfile).join(", "));

  // 4. Call generate-document
  console.log("\n🚀 Calling generate-document edge function...");
  console.log("  docType: kyc_checklist");
  console.log("  jurisdiction: CH");
  console.log("  chapters: [Vertragspartei-Identifikation, PEP-Screening, Risikokategorie]");
  console.log("  customPrompt: Bitte kurz halten (max 2 Seiten).");
  console.log("");

  const startTime = Date.now();

  const fnRes = await fetch(`${SUPABASE_URL}/functions/v1/generate-document`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      docType: "kyc_checklist",
      jurisdiction: "CH",
      companyProfile,
      answers: {
        client_type: "Juristische Person (AG/GmbH)",
        onboard_channel: "Kombiniert",
        expected_volume: "CHF 25'000-100'000",
        __customPrompt: "Bitte kurz halten (max 2 Seiten).",
      },
      organizationId: org.id,
      chapters: ["Vertragspartei-Identifikation", "PEP-Screening", "Risikokategorie"],
    }),
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Response: ${fnRes.status} ${fnRes.statusText} (${elapsed}s)`);

  const rawText = await fnRes.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    console.error("\n❌ Non-JSON response:", rawText.slice(0, 500));
    process.exit(1);
  }

  if (!fnRes.ok || data.error) {
    console.error("\n❌ Generation failed:");
    console.error("  Status:", fnRes.status);
    console.error("  Response:", rawText.slice(0, 500));
    process.exit(1);
  }

  // 5. Show result
  const content = data.document?.content ?? "";
  const lines = content.split("\n");
  console.log(`\n✅ Document generated successfully!`);
  console.log(`  Document ID: ${data.document?.id}`);
  console.log(`  Content length: ${content.length} chars, ${lines.length} lines`);
  console.log(`  Time: ${elapsed}s`);

  // Show first 20 lines as preview
  console.log("\n--- Preview (first 20 lines) ---");
  console.log(lines.slice(0, 20).join("\n"));
  console.log("--- ... ---\n");

  // Check custom chapters
  const hasChapter1 = content.includes("Vertragspartei-Identifikation");
  const hasChapter2 = content.includes("PEP-Screening");
  const hasChapter3 = content.includes("Risikokategorie");
  console.log("📝 Chapter verification:");
  console.log(`  Vertragspartei-Identifikation: ${hasChapter1 ? "✅" : "⚠️ not found"}`);
  console.log(`  PEP-Screening: ${hasChapter2 ? "✅" : "⚠️ not found"}`);
  console.log(`  Risikokategorie: ${hasChapter3 ? "✅" : "⚠️ not found"}`);

  console.log("\n🎉 Test complete!");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
