export interface RedFlag {
  id: string;
  label: string;
  level: "critical" | "high";
}

export const RED_FLAGS: RedFlag[] = [
  { id: "court_deadline",      label: "Active court deadline within 14 days",                           level: "critical" },
  { id: "eviction_hearing",    label: "Eviction hearing already scheduled",                             level: "critical" },
  { id: "garnishment",         label: "Wage or bank garnishment already started",                       level: "critical" },
  { id: "custody_order",       label: "Existing custody or parenting time order",                       level: "high"     },
  { id: "dv_allegation",       label: "Domestic violence allegation (any party)",                       level: "critical" },
  { id: "criminal_charge",     label: "Criminal charge involved or pending",                            level: "critical" },
  { id: "appeal_deadline",     label: "Appeal deadline approaching or passed",                          level: "critical" },
  { id: "default_judgment",    label: "Default judgment already entered against client",                level: "high"     },
  { id: "capacity_concern",    label: "Signer's mental capacity to understand the document is in question", level: "critical" },
  { id: "active_guardianship", label: "An active guardianship or conservatorship already exists",       level: "high"     },
  { id: "family_pressure",     label: "Family member is pressuring the signer or directing the signing", level: "critical" },
];

export const CRISIS_RESOURCES = `
If you or someone you know is in danger, please reach out immediately:
- **National DV Hotline**: 1-800-799-7233 (24/7, free, confidential)
- **Crisis Text Line**: Text HOME to 741741
- **911** for immediate danger
`.trim();

export const ATTORNEY_REFERRALS_MI = [
  { name: "Legal Aid of Western Michigan", phone: "1-888-783-8190", url: "https://www.legalaidwestmich.net", counties: ["Van Buren", "Kalamazoo", "Kent", "Ottawa", "Muskegon"] },
  { name: "Michigan Legal Help", phone: null, url: "https://michiganlegalhelp.org", counties: ["all"] },
  { name: "State Bar of Michigan Lawyer Referral Service", phone: "1-800-968-0738", url: "https://www.michbar.org", counties: ["all"] },
  { name: "Michigan Attorney General — Consumer Protection", phone: "1-877-765-8388", url: "https://www.michigan.gov/ag", counties: ["all"] },
];
