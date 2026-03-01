import type { ClientOrg } from "./api";

export function coName(org: ClientOrg | null): string {
  return org?.contact_name || "Ihr Compliance-Berater";
}

export function coFirstName(org: ClientOrg | null): string {
  return org?.contact_name?.split(" ")[0] || "Compliance";
}

export function coInitials(org: ClientOrg | null): string {
  if (!org?.contact_name) return "VC";
  const parts = org.contact_name.split(" ");
  return (parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "");
}

export function coEmail(org: ClientOrg | null): string {
  return org?.contact_email || "info@virtue-compliance.ch";
}

export function coPhone(org: ClientOrg | null): string {
  return org?.contact_phone || "";
}

export function coRole(org: ClientOrg | null): string {
  return org?.contact_role || "Compliance-Berater/in";
}
