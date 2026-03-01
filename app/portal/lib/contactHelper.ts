import type { ClientOrg } from "./api";

// Portal contact shows the assigned CO from DB fields, with fallback to Virtue Compliance defaults.

export function coName(org: ClientOrg | null): string {
  return org?.contact_name || "Virtue Compliance";
}

export function coFirstName(org: ClientOrg | null): string {
  if (org?.contact_name) return org.contact_name.split(" ")[0];
  return "Virtue Compliance";
}

export function coInitials(org: ClientOrg | null): string {
  const name = org?.contact_name;
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return "VC";
}

export function coEmail(org: ClientOrg | null): string {
  return org?.contact_email || "info@virtue-compliance.ch";
}

export function coPhone(org: ClientOrg | null): string {
  return org?.contact_phone || "";
}

export function coRole(org: ClientOrg | null): string {
  return org?.contact_role || "Compliance-Beraterin";
}
