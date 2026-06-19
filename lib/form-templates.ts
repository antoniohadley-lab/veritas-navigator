// Extracted from veritas-document-library.jsx — Housing/Eviction MVP templates

export type FieldType = "text" | "textarea" | "select" | "date" | "tel" | "email" | "checkbox";
export type MatterType = "housing" | "family_court" | "billing_dispute" | "business_formation" | "judgment_defense" | "other";

export interface FormField {
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

export interface FormTemplate {
  id: string;
  title: string;
  desc: string;
  category: MatterType;
  redFlagGate: boolean;
  fields: FormField[];
  signature: boolean;
  disclaimer?: string;
  triggerKeywords: string[];
  whoIsIt: "landlord" | "tenant" | "either";
}

export const HOUSING_TEMPLATES: FormTemplate[] = [
  {
    id: "notice-7day",
    title: "7-Day Notice to Quit (Non-Payment of Rent)",
    desc: "Michigan statutory notice — MCL 600.5714(1)(a). Landlord notifies tenant of overdue rent and right to pay or vacate.",
    category: "housing",
    redFlagGate: false,
    whoIsIt: "landlord",
    triggerKeywords: ["landlord", "rent not paid", "7 day", "notice to quit", "evict tenant", "nonpayment"],
    fields: [
      { label: "Landlord / Property Owner Name", type: "text", required: true },
      { label: "Landlord Mailing Address", type: "text", required: true },
      { label: "Tenant Full Name(s)", type: "text", placeholder: "All tenants on lease", required: true },
      { label: "Rental Property Address", type: "text", required: true },
      { label: "City, State, ZIP", type: "text", required: true },
      { label: "Monthly Rent Amount", type: "text", placeholder: "$0.00", required: true },
      { label: "Total Amount Past Due", type: "text", placeholder: "$0.00", required: true },
      { label: "Rent Due Date (per lease)", type: "text", placeholder: "e.g. 1st of each month", required: true },
      { label: "Notice Date", type: "date", required: true },
      { label: "Expiration Date (7 days from notice)", type: "date", required: true },
      { label: "Payment Instructions", type: "textarea", placeholder: "Where and how tenant may submit payment" },
    ],
    signature: true,
    disclaimer: "This notice is prepared pursuant to MCL 600.5714. Service must comply with Michigan law. Retain proof of service.",
  },
  {
    id: "tenant-response",
    title: "Tenant Response to Eviction Notice",
    desc: "Self-represented tenant's written response to a landlord notice or summary proceedings filing.",
    category: "housing",
    redFlagGate: true,
    whoIsIt: "tenant",
    triggerKeywords: ["received eviction notice", "landlord gave me notice", "7 days to pay or leave", "respond to eviction", "fight eviction", "tenant response"],
    fields: [
      { label: "Tenant Full Name", type: "text", required: true },
      { label: "Rental Property Address", type: "text", required: true },
      { label: "Landlord / Agent Name", type: "text", required: true },
      { label: "Notice or Case Number (if filed)", type: "text" },
      { label: "Date of Notice Received", type: "date", required: true },
      { label: "Grounds for Response", type: "select", options: ["Payment was made", "Habitability / code violations", "Retaliatory eviction", "Improper notice / service", "Discriminatory motive", "Other"], required: true },
      { label: "Supporting Facts", type: "textarea", placeholder: "Describe your defense in detail.", required: true },
      { label: "Evidence Available", type: "textarea", placeholder: "Receipts, photos, texts, repair requests, etc." },
      { label: "Relief Requested", type: "textarea", placeholder: "What do you want the court or landlord to do?" },
    ],
    signature: true,
    disclaimer: "Veritas prepares this response for informational purposes only. This is not legal advice. Consider consulting a licensed attorney before filing.",
  },
  {
    id: "habitability-demand",
    title: "Habitability Demand Letter",
    desc: "Formal written demand to landlord for repairs and safe conditions under MCL 125.534.",
    category: "housing",
    redFlagGate: false,
    whoIsIt: "tenant",
    triggerKeywords: ["repairs", "mold", "no heat", "broken", "unsafe", "pest", "habitability", "demand landlord fix", "withhold rent"],
    fields: [
      { label: "Tenant Name", type: "text", required: true },
      { label: "Tenant Address (Rental)", type: "text", required: true },
      { label: "Landlord / Property Manager Name", type: "text", required: true },
      { label: "Landlord Address", type: "text", required: true },
      { label: "Date of Letter", type: "date", required: true },
      { label: "List of Conditions / Defects", type: "textarea", placeholder: "e.g. No heat, mold, broken locks, pest infestation...", required: true },
      { label: "Date(s) Previously Reported", type: "text" },
      { label: "Repair Deadline Requested", type: "date", required: true },
      { label: "Intended Next Steps if Ignored", type: "select", options: ["File with local housing authority", "Rent escrow / withholding", "File in district court", "Contact media / legal aid"] },
    ],
    signature: true,
    disclaimer: "Retain a copy. Send via certified mail with return receipt requested. MCL 125.534 — Michigan Housing Law.",
  },
];

export const ALL_MVP_TEMPLATES: FormTemplate[] = [...HOUSING_TEMPLATES];

export function findTemplate(id: string): FormTemplate | undefined {
  return ALL_MVP_TEMPLATES.find((t) => t.id === id);
}

export function getRequiredFields(template: FormTemplate): FormField[] {
  return template.fields.filter((f) => f.required);
}
