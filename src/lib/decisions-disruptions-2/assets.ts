import type { Asset, AssetId, AssetUpgrade, OwnedUpgrade } from "./types";

/**
 * The financial organisation's Enterprise Architecture (the paper's
 * Figure 2), each asset with its upgrade tiers. Resistance is the chance
 * (0-100) that an attack the asset defends against is stopped — never a
 * guaranteed block. Safe for client import: like D&D1's `defences.ts`, the
 * shop is public; only the event library is server-only.
 */
export const ASSETS: readonly Asset[] = [
  {
    id: "firewall",
    name: "Firewall",
    description:
      "The perimeter between the internet and the internal network, filtering inbound traffic.",
    external: false,
    baseResistance: 40,
    upgrades: [
      {
        id: "firewall-rules",
        assetId: "firewall",
        tier: 1,
        name: "Patch firewall rules",
        description:
          "Review years of accumulated allow-rules and patch the appliance firmware.",
        hoursCost: 12,
        profitCost: 0,
        resistance: 60,
      },
      {
        id: "firewall-ids",
        assetId: "firewall",
        tier: 2,
        name: "Enable IDS/IPS",
        description:
          "License and tune the intrusion detection and prevention module.",
        hoursCost: 16,
        profitCost: 40,
        resistance: 80,
      },
    ],
  },
  {
    id: "vpn",
    name: "VPN",
    description: "Remote access into the corporate network for staff.",
    external: false,
    baseResistance: 40,
    upgrades: [
      {
        id: "vpn-patch",
        assetId: "vpn",
        tier: 1,
        name: "Patch VPN appliance",
        description: "Apply the vendor's outstanding security updates.",
        hoursCost: 8,
        profitCost: 0,
        resistance: 60,
      },
      {
        id: "vpn-mfa",
        assetId: "vpn",
        tier: 2,
        name: "Enforce VPN MFA",
        description: "Require a second factor for every remote connection.",
        hoursCost: 12,
        profitCost: 15,
        resistance: 85,
      },
    ],
  },
  {
    id: "endpoints",
    name: "PCs & Laptops",
    description: "Staff workstations in head office and the branches.",
    external: false,
    baseResistance: 30,
    upgrades: [
      {
        id: "endpoints-av",
        assetId: "endpoints",
        tier: 1,
        name: "Endpoint AV rollout",
        description:
          "Get antivirus on every device and keep signatures current.",
        hoursCost: 16,
        profitCost: 25,
        resistance: 55,
      },
      {
        id: "endpoints-edr",
        assetId: "endpoints",
        tier: 2,
        name: "EDR & application allow-listing",
        description:
          "Behavioural detection plus blocking of unapproved executables and macros.",
        hoursCost: 20,
        profitCost: 40,
        resistance: 75,
      },
    ],
  },
  {
    id: "email",
    name: "Email & Productivity",
    description: "SaaS email, documents and collaboration for all staff.",
    external: true,
    baseResistance: 35,
    upgrades: [
      {
        id: "email-training",
        assetId: "email",
        tier: 1,
        name: "Phishing awareness training",
        description: "Run simulated phishing and short training for all staff.",
        hoursCost: 16,
        profitCost: 10,
        resistance: 55,
      },
      {
        id: "email-mfa",
        assetId: "email",
        tier: 2,
        name: "Enforce MFA on all accounts",
        description:
          "Turn on mandatory multi-factor sign-in across the tenant.",
        hoursCost: 12,
        profitCost: 10,
        resistance: 80,
      },
    ],
  },
  {
    id: "core-banking",
    name: "Core Banking System",
    description: "The ledger of record for every account and transaction.",
    external: false,
    baseResistance: 50,
    upgrades: [
      {
        id: "core-banking-patch",
        assetId: "core-banking",
        tier: 1,
        name: "Apply critical patches",
        description:
          "Schedule an out-of-hours maintenance window and patch the platform.",
        hoursCost: 16,
        profitCost: 20,
        resistance: 70,
      },
      {
        id: "core-banking-pam",
        assetId: "core-banking",
        tier: 2,
        name: "Privileged access management",
        description: "Vault admin credentials and record privileged sessions.",
        hoursCost: 20,
        profitCost: 35,
        resistance: 85,
      },
    ],
  },
  {
    id: "digital-banking",
    name: "Digital Banking Platform",
    description: "The customer-facing website and mobile banking app.",
    external: false,
    baseResistance: 45,
    upgrades: [
      {
        id: "digital-banking-waf",
        assetId: "digital-banking",
        tier: 1,
        name: "Web application firewall",
        description: "Filter malicious requests before they reach the app.",
        hoursCost: 12,
        profitCost: 30,
        resistance: 65,
      },
      {
        id: "digital-banking-mfa",
        assetId: "digital-banking",
        tier: 2,
        name: "App-based customer MFA",
        description: "Move customers off SMS codes to in-app approval.",
        hoursCost: 16,
        profitCost: 40,
        resistance: 85,
      },
    ],
  },
  {
    id: "sanctions",
    name: "Sanctions System",
    description:
      "Screens payments against sanctions lists before they are released.",
    external: false,
    baseResistance: 60,
    upgrades: [
      {
        id: "sanctions-automation",
        assetId: "sanctions",
        tier: 1,
        name: "Screening list automation",
        description: "Pull list updates automatically instead of by hand.",
        hoursCost: 12,
        profitCost: 15,
        resistance: 80,
      },
    ],
  },
  {
    id: "crm",
    name: "CRM",
    description:
      "A third-party SaaS holding customer contact and relationship data.",
    external: true,
    baseResistance: 50,
    upgrades: [
      {
        id: "crm-vendor-review",
        assetId: "crm",
        tier: 1,
        name: "Vendor security review",
        description:
          "Assess the provider's controls, certifications and breach history.",
        hoursCost: 8,
        profitCost: 0,
        resistance: 65,
      },
      {
        id: "crm-sso",
        assetId: "crm",
        tier: 2,
        name: "SSO & least privilege",
        description:
          "Put the CRM behind single sign-on and trim who can export data.",
        hoursCost: 12,
        profitCost: 10,
        resistance: 80,
      },
    ],
  },
  {
    id: "payment-handler",
    name: "Payment Handler",
    description: "An external processor that clears card and bank payments.",
    external: true,
    baseResistance: 55,
    upgrades: [
      {
        id: "payment-handler-audit",
        assetId: "payment-handler",
        tier: 1,
        name: "Contract & audit rights",
        description:
          "Renegotiate the contract for security SLAs and the right to audit.",
        hoursCost: 8,
        profitCost: 10,
        resistance: 70,
      },
      {
        id: "payment-handler-monitoring",
        assetId: "payment-handler",
        tier: 2,
        name: "Transaction anomaly monitoring",
        description: "Flag unusual payment patterns in near real time.",
        hoursCost: 12,
        profitCost: 25,
        resistance: 85,
      },
    ],
  },
  {
    id: "soc",
    name: "SOC / SIEM",
    description:
      "Security monitoring: how likely the team is to spot what is really going on.",
    external: false,
    baseResistance: 30,
    upgrades: [
      {
        id: "soc-triage",
        assetId: "soc",
        tier: 1,
        name: "24/7 alert triage",
        description: "Staff an overnight rota so alerts are never left unread.",
        hoursCost: 16,
        profitCost: 40,
        resistance: 55,
      },
      {
        id: "soc-threat-intel",
        assetId: "soc",
        tier: 2,
        name: "Threat intel & playbooks",
        description:
          "Subscribe to a sector threat feed and write response playbooks.",
        hoursCost: 12,
        profitCost: 20,
        resistance: 75,
      },
    ],
  },
];

export function getAsset(id: AssetId): Asset {
  // AssetId is a closed union and every member has a catalog entry.
  return ASSETS.find((asset) => asset.id === id) as Asset;
}

export function ownsUpgrade(
  owned: readonly OwnedUpgrade[],
  upgradeId: string,
): boolean {
  return owned.some((entry) => entry.upgradeId === upgradeId);
}

/** The highest owned tier's resistance, or the asset's base value. */
export function currentResistance(
  assetId: AssetId,
  owned: readonly OwnedUpgrade[],
): number {
  const asset = getAsset(assetId);
  return asset.upgrades.reduce(
    (resistance, upgrade) =>
      ownsUpgrade(owned, upgrade.id)
        ? Math.max(resistance, upgrade.resistance)
        : resistance,
    asset.baseResistance,
  );
}

/** The cheapest tier not yet owned, or undefined once the asset is maxed out. */
export function nextUpgrade(
  assetId: AssetId,
  owned: readonly OwnedUpgrade[],
): AssetUpgrade | undefined {
  return getAsset(assetId).upgrades.find(
    (upgrade) => !ownsUpgrade(owned, upgrade.id),
  );
}
