import type { ClientOrg } from "./api";

// Portal contact always shows Virtue Compliance / Elena as the compliance advisor.
// org.contact_name from DB is not used — it may contain outdated or incorrect names.

export function coName(_org: ClientOrg | null): string {
  return "Virtue Compliance";
}

export function coFirstName(_org: ClientOrg | null): string {
  return "Elena";
}

export function coInitials(_org: ClientOrg | null): string {
  return "VC";
}

export function coEmail(_org: ClientOrg | null): string {
  return "info@virtue-compliance.ch";
}

export function coPhone(_org: ClientOrg | null): string {
  return "";
}

export function coRole(_org: ClientOrg | null): string {
  return "Compliance-Beraterin";
}
