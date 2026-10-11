import "server-only";
import type { EventDefinition } from "./types";

/**
 * The starter event library (SPEC §5): a financial-sector set modelled on
 * the paper's example cards (Ticket #123, Ticket #106, Direct #124, Direct
 * #222, News #219, the found USB stick and the off-sick CSIRT member).
 * Guarded with `server-only` like D&D1's `attacks.server.ts`: choice
 * consequences, criteria and trigger chains must never reach a player's
 * browser. Players only ever see an event once it is drawn, as an
 * `OpenEvent` carrying its title, description and choice prices.
 *
 * Costs are hours (of the team's 80 per day) and thousands of pounds of
 * projected profit. Trigger chains, roughly:
 *
 * - phishing -> credential harvest -> ransomware / data exfiltration
 * - data exfiltration -> press leak -> regulator inquiry
 * - USB stick -> USB malware -> lateral movement into core banking -> ransomware
 * - risky third-party code -> CRM breach -> data exfiltration
 * - HR pretext / VPN password spraying / firewall zero-day -> VPN intrusion
 * - researcher-reported flaw -> account takeover -> regulator inquiry
 */
export const EVENTS: readonly EventDefinition[] = [
  // --- Reconnaissance --------------------------------------------------
  {
    id: "port-scan",
    title: "Ticket #101: Scanning against the perimeter",
    kind: "ticket",
    tactic: "reconnaissance",
    description:
      "The firewall logs show a sustained sweep of the perimeter from a handful of overseas addresses, probing the VPN gateway in particular.",
    repeatable: true,
    resistedBy: "firewall",
    choices: [
      {
        id: "block",
        label: "Block the source ranges",
        hoursCost: 4,
        profitCost: 0,
        outcome: {
          narrative:
            "The ranges are blocked and the scanning stops — from those addresses, at least.",
        },
      },
      {
        id: "investigate",
        label: "Investigate who is scanning",
        hoursCost: 10,
        profitCost: 0,
        check: {
          against: { asset: "soc" },
          success: {
            narrative:
              "The pattern matches a known credential-stuffing crew. You patch the VPN appliance before they come back.",
            grantUpgrades: ["vpn-patch"],
          },
          failure: {
            narrative:
              "Hours of log-trawling turn up nothing conclusive about who was behind it.",
          },
        },
      },
    ],
    onIgnore: {
      narrative:
        "Nobody acted on the scans. Whoever mapped the VPN gateway is now trying passwords against it.",
      triggers: ["vpn-bruteforce"],
    },
  },

  // --- Phishing chain --------------------------------------------------
  {
    id: "phishing-macro",
    title: "Ticket #123: Spreadsheet with macros from 'Finance'",
    kind: "ticket",
    tactic: "initial-access",
    description:
      "Several staff received a spreadsheet titled 'Q3 bonus allocations' asking them to enable macros. One user says they clicked 'Enable' before reporting it.",
    repeatable: true,
    resistedBy: "email",
    choices: [
      {
        id: "quarantine",
        label: "Quarantine the email and reset the user's password",
        hoursCost: 10,
        profitCost: 0,
        outcome: {
          narrative:
            "The message is pulled from every inbox and the user's credentials are rotated before anyone uses them.",
        },
      },
      {
        id: "forensics",
        label: "Full forensic triage of the user's laptop",
        hoursCost: 20,
        profitCost: 0,
        outcome: {
          narrative:
            "You find and remove a dropper before it can call home, and extract indicators to block across the estate.",
        },
      },
      {
        id: "warn",
        label: "Send a staff-wide warning",
        hoursCost: 2,
        profitCost: 0,
        check: {
          against: { asset: "endpoints" },
          success: {
            narrative:
              "Endpoint protection had already blocked the macro's payload. The warning stops anyone else opening it.",
          },
          failure: {
            narrative:
              "The warning goes out, but the macro had already run and harvested the user's saved passwords.",
            triggers: ["credential-harvest"],
          },
        },
      },
    ],
    onIgnore: {
      narrative:
        "The phishing email sat in inboxes for another day, and more people opened it.",
      triggers: ["credential-harvest"],
    },
  },
  {
    id: "credential-harvest",
    title: "Ticket #131: Impossible-travel logins on finance mailboxes",
    kind: "ticket",
    tactic: "credential-access",
    description:
      "Three finance mailboxes signed in from London and Lagos within ten minutes of each other. Inbox rules forwarding invoices to an external address have appeared.",
    triggerOnly: true,
    resistedBy: "email",
    choices: [
      {
        id: "reset-all",
        label: "Force an organisation-wide password reset",
        hoursCost: 20,
        profitCost: 0,
        outcome: {
          narrative:
            "Every account is reset. The helpdesk is swamped and the morning is lost, but the attacker is locked out.",
          sharePrice: -4,
        },
      },
      {
        id: "disable",
        label: "Disable the affected accounts and investigate",
        hoursCost: 8,
        profitCost: 0,
        check: {
          against: { asset: "soc" },
          success: {
            narrative:
              "The investigation finds and removes every foothold the attacker had established.",
          },
          failure: {
            narrative:
              "The three accounts are disabled, but the attacker had already moved on to a fourth one you didn't spot.",
            triggers: ["ransomware"],
          },
        },
      },
      {
        id: "observe",
        label: "Monitor quietly to learn the attacker's intent",
        hoursCost: 4,
        profitCost: 0,
        outcome: {
          narrative:
            "You learn a great deal about the attacker — including that they were staging customer data for export.",
          triggers: ["data-exfil"],
        },
      },
    ],
    onIgnore: {
      narrative:
        "The compromised mailboxes stayed open. The attacker used them to push malware deeper into the network.",
      triggers: ["ransomware"],
    },
  },
  {
    id: "ransomware",
    title: "Ticket #106: Ransom note on core banking file shares",
    kind: "ticket",
    tactic: "impact",
    description:
      "Files on the core banking file shares have been encrypted. A note demands £150k in cryptocurrency within 48 hours, or the data will be published.",
    criteria: { minRound: 4, excludesUpgrades: ["endpoints-edr"] },
    resistedBy: "endpoints",
    choices: [
      {
        id: "rebuild",
        label: "Rebuild from backups",
        hoursCost: 32,
        profitCost: 60,
        outcome: {
          narrative:
            "A slow, expensive rebuild — but the systems come back clean and you never deal with the criminals.",
          sharePrice: -10,
        },
      },
      {
        id: "pay",
        label: "Pay the ransom",
        hoursCost: 4,
        profitCost: 150,
        check: {
          against: { probability: 60 },
          success: {
            narrative:
              "The decryptor works. Systems are restored quickly, though word that you paid gets around.",
            sharePrice: -20,
          },
          failure: {
            narrative:
              "The decryptor corrupts half the files, and the data is leaked anyway. You rebuild from backups after all.",
            profit: -100,
            sharePrice: -30,
            triggers: ["regulator-inquiry"],
          },
        },
      },
      {
        id: "insurer",
        label: "Call the cyber insurer",
        hoursCost: 8,
        profitCost: 30,
        check: {
          against: { probability: 70 },
          success: {
            narrative:
              "The insurer's incident response firm takes over and restores service within the day.",
            sharePrice: -6,
          },
          failure: {
            narrative:
              "The insurer invokes a policy exclusion. You're left paying for the recovery yourselves, a day later.",
            profit: -200,
            sharePrice: -16,
          },
        },
      },
    ],
    onIgnore: {
      narrative:
        "Core banking file shares stayed encrypted for another day. Branches are working on paper.",
      profit: -160,
      sharePrice: -20,
    },
  },
  {
    id: "data-exfil",
    title: "Ticket #142: Large outbound transfer from a CRM export",
    kind: "ticket",
    tactic: "exfiltration",
    description:
      "Network monitoring flags 40GB leaving the network overnight to a cloud storage provider, originating from a CRM export job nobody scheduled.",
    triggerOnly: true,
    choices: [
      {
        id: "disclose",
        label: "Cut the connection and notify the regulator",
        hoursCost: 12,
        profitCost: 0,
        outcome: {
          narrative:
            "Prompt disclosure costs some confidence, but the regulator notes your openness.",
          sharePrice: -10,
        },
      },
      {
        id: "investigate",
        label: "Investigate quietly before saying anything",
        hoursCost: 12,
        profitCost: 0,
        check: {
          against: { asset: "soc" },
          success: {
            narrative:
              "You trace and halt the transfer before any customer records leave the network.",
          },
          failure: {
            narrative:
              "By the time you understand what happened, the customer records are gone.",
            triggers: ["press-leak"],
          },
        },
      },
    ],
    onIgnore: {
      narrative:
        "The transfer finished overnight. Customer records are now in the attacker's hands.",
      triggers: ["press-leak"],
    },
  },
  {
    id: "press-leak",
    title: "News #219: Your customer records for sale on a dark web forum",
    kind: "news",
    tactic: "impact",
    description:
      "A journalist has a sample of what appear to be your customers' records, listed for sale on a criminal forum, and asks for comment before publishing.",
    triggerOnly: true,
    choices: [
      {
        id: "statement",
        label: "Public statement and free credit monitoring for customers",
        hoursCost: 8,
        profitCost: 60,
        outcome: {
          narrative:
            "Coverage is critical but brief; your response is reported as responsible.",
          sharePrice: -10,
        },
      },
      {
        id: "no-comment",
        label: "Decline to comment",
        hoursCost: 0,
        profitCost: 0,
        outcome: {
          narrative:
            "'Bank refuses to comment on leak' makes the front page. The regulator starts asking questions.",
          sharePrice: -40,
          triggers: ["regulator-inquiry"],
        },
      },
    ],
    onIgnore: {
      narrative:
        "The story ran without your side of it, and the regulator took notice.",
      sharePrice: -30,
      triggers: ["regulator-inquiry"],
    },
  },
  {
    id: "regulator-inquiry",
    title: "Direct #301: Regulator demands an incident report within 72 hours",
    kind: "direct",
    tactic: "impact",
    description:
      "The financial regulator's supervision team has written to the CEO asking for a full account of the incident, the data affected and your remediation plan.",
    triggerOnly: true,
    choices: [
      {
        id: "cooperate",
        label: "Full cooperation, with a dedicated team",
        hoursCost: 24,
        profitCost: 20,
        outcome: {
          narrative:
            "A thorough report satisfies the regulator. No further action is taken.",
        },
      },
      {
        id: "minimal",
        label: "Send the minimum the rules require",
        hoursCost: 8,
        profitCost: 0,
        check: {
          against: { probability: 40 },
          success: {
            narrative:
              "The regulator accepts the report, if without enthusiasm.",
          },
          failure: {
            narrative:
              "The regulator finds the report inadequate and issues a fine.",
            profit: -200,
            sharePrice: -20,
          },
        },
      },
    ],
    onIgnore: {
      narrative:
        "The deadline passed. The regulator fined you for non-cooperation.",
      profit: -300,
      sharePrice: -30,
    },
  },

  // --- Insider / physical ------------------------------------------------
  {
    id: "usb-stick",
    title: "Direct #145: A USB stick found in the car park",
    kind: "direct",
    tactic: "initial-access",
    description:
      "A branch manager hands in a USB stick labelled 'Payroll 2024' that was lying in the staff car park, and asks what to do with it.",
    choices: [
      {
        id: "analyse",
        label: "Forensically analyse it",
        hoursCost: 12,
        profitCost: 0,
        outcome: {
          narrative:
            "It contains malware built for your branch PCs. You share the indicators with the sector and block them everywhere.",
          sharePrice: 1,
        },
      },
      {
        id: "destroy",
        label: "Destroy it",
        hoursCost: 1,
        profitCost: 0,
        outcome: {
          narrative: "The stick is shredded. Whatever was on it is gone.",
        },
      },
      {
        id: "lost-property",
        label: "Hand it to IT to find the owner",
        hoursCost: 1,
        profitCost: 0,
        check: {
          against: { asset: "endpoints" },
          success: {
            narrative:
              "IT plugs it in to look for a name. Endpoint protection blocks the malware on it.",
          },
          failure: {
            narrative:
              "IT plugs it in to look for a name. Nothing visible happens — which is the problem.",
            triggers: ["usb-malware"],
          },
        },
      },
    ],
    onIgnore: {
      narrative:
        "With no instructions, a curious colleague plugged the stick into a branch PC.",
      triggers: ["usb-malware"],
    },
  },
  {
    id: "usb-malware",
    title: "Ticket #152: Malware beaconing from a branch PC",
    kind: "ticket",
    tactic: "execution",
    description:
      "A branch workstation is contacting a known command-and-control server every 60 seconds.",
    triggerOnly: true,
    resistedBy: "endpoints",
    choices: [
      {
        id: "reimage",
        label: "Isolate and reimage the PC",
        hoursCost: 12,
        profitCost: 0,
        outcome: {
          narrative: "The PC is wiped and rebuilt. The beaconing stops.",
        },
      },
      {
        id: "hunt",
        label: "Isolate it and hunt for lateral movement",
        hoursCost: 16,
        profitCost: 0,
        check: {
          against: { asset: "soc" },
          success: {
            narrative:
              "The hunt confirms the malware never left the PC. It is rebuilt and the case closed.",
          },
          failure: {
            narrative:
              "You clean the PC, but the hunt misses the admin credentials the malware had already stolen.",
            triggers: ["lateral-core-banking"],
          },
        },
      },
    ],
    onIgnore: {
      narrative:
        "The infected PC stayed on the network, and the attacker used it as a stepping stone.",
      triggers: ["lateral-core-banking"],
    },
  },
  {
    id: "lateral-core-banking",
    title: "Ticket #160: Admin logins on core banking from a branch PC",
    kind: "ticket",
    tactic: "lateral-movement",
    description:
      "Privileged accounts are signing in to the core banking system from a branch workstation that should never have admin access.",
    triggerOnly: true,
    resistedBy: "core-banking",
    choices: [
      {
        id: "shutdown",
        label: "Emergency shutdown of core banking",
        hoursCost: 16,
        profitCost: 80,
        outcome: {
          narrative:
            "Payments stop for half a day, but the attacker is cut off before doing any damage.",
          sharePrice: -16,
        },
      },
      {
        id: "rotate",
        label: "Rotate privileged credentials with the system live",
        hoursCost: 12,
        profitCost: 0,
        check: {
          against: { asset: "core-banking" },
          success: {
            narrative:
              "The credentials are rotated and the attacker's sessions are killed without downtime.",
          },
          failure: {
            narrative:
              "The attacker had a backdoor account you didn't know about. They are still in.",
            triggers: ["ransomware"],
          },
        },
      },
    ],
    onIgnore: {
      narrative:
        "The attacker kept their admin access to core banking for another day, and prepared their next move.",
      sharePrice: -10,
      triggers: ["ransomware"],
    },
  },
  {
    id: "insider-download",
    title: "Ticket #280: Departing employee downloads the client list",
    kind: "ticket",
    tactic: "collection",
    description:
      "A relationship manager who resigned yesterday exported the full high-net-worth client list to a personal email address.",
    criteria: { minRound: 2 },
    choices: [
      {
        id: "revoke",
        label: "Revoke their access and interview them",
        hoursCost: 10,
        profitCost: 0,
        outcome: {
          narrative:
            "They admit to it and delete the copy under supervision. Their access is removed for their notice period.",
        },
      },
      {
        id: "legal",
        label: "Send a solicitor's letter",
        hoursCost: 4,
        profitCost: 10,
        outcome: {
          narrative:
            "The letter has the desired effect, at a price. The copy is deleted.",
        },
      },
    ],
    onIgnore: {
      narrative:
        "The client list surfaced at a competitor — and then in the press.",
      triggers: ["press-leak"],
    },
  },

  // --- Third-party / supply chain ----------------------------------------
  {
    id: "third-party-code",
    title: "Direct #124: Copied open-source code in the CRM integration",
    kind: "direct",
    tactic: "initial-access",
    description:
      "Your IT lead has noticed the CRM vendor's integration module reuses an unmaintained open-source library with known vulnerabilities.",
    choices: [
      {
        id: "audit",
        label: "Commission an independent code audit",
        hoursCost: 16,
        profitCost: 15,
        outcome: {
          narrative:
            "The audit confirms the risk and the vendor ships a fix under contract pressure.",
        },
      },
      {
        id: "assurance",
        label: "Ask the vendor for written assurance",
        hoursCost: 2,
        profitCost: 0,
        check: {
          against: { asset: "crm" },
          success: {
            narrative:
              "The vendor already knew and had patched it. Their assurance holds up.",
          },
          failure: {
            narrative: "The vendor's reassuring letter turns out to be wrong.",
            triggers: ["crm-breach"],
          },
        },
      },
    ],
    onIgnore: {
      narrative:
        "Nobody followed up with the vendor, and the vulnerable library was exploited.",
      triggers: ["crm-breach"],
    },
  },
  {
    id: "crm-breach",
    title: "News #230: CRM provider confirms a security incident",
    kind: "news",
    tactic: "initial-access",
    description:
      "Your CRM provider has announced that attackers accessed some customer tenants. They have not said which.",
    criteria: { minRound: 3, excludesUpgrades: ["crm-vendor-review"] },
    resistedBy: "crm",
    choices: [
      {
        id: "rotate",
        label: "Rotate CRM API keys and audit access logs",
        hoursCost: 16,
        profitCost: 0,
        outcome: {
          narrative:
            "Keys are rotated. The logs show the attackers tried your tenant but were too late.",
        },
      },
      {
        id: "suspend",
        label: "Suspend the CRM integration for a day",
        hoursCost: 4,
        profitCost: 40,
        outcome: {
          narrative:
            "Sales grind to a halt for a day, but your data stays out of reach.",
        },
      },
      {
        id: "wait",
        label: "Wait for the vendor's report",
        hoursCost: 0,
        profitCost: 0,
        outcome: {
          narrative:
            "The vendor's report arrives two days later: your tenant was among those accessed.",
          triggers: ["data-exfil"],
        },
      },
    ],
    onIgnore: {
      narrative:
        "Nothing was done about the CRM incident, and the attackers helped themselves to your tenant.",
      triggers: ["data-exfil"],
    },
  },
  {
    id: "payment-outage",
    title: "Ticket #170: Payment handler reports degraded service",
    kind: "ticket",
    tactic: "impact",
    description:
      "Your external payment processor reports intermittent failures. Card payments are timing out for a third of customers.",
    criteria: { minRound: 2 },
    choices: [
      {
        id: "failover",
        label: "Fail over to the backup processor",
        hoursCost: 12,
        profitCost: 25,
        outcome: {
          narrative:
            "The backup processor is pricier, but payments keep flowing.",
        },
      },
      {
        id: "wait",
        label: "Wait for the provider to recover",
        hoursCost: 0,
        profitCost: 0,
        check: {
          against: { asset: "payment-handler" },
          success: {
            narrative: "Service is restored within the hour.",
          },
          failure: {
            narrative:
              "The outage lasts all day. Customers take their business elsewhere.",
            profit: -120,
            sharePrice: -12,
          },
        },
      },
    ],
    onIgnore: {
      narrative: "Payments kept failing while the ticket sat unanswered.",
      profit: -100,
      sharePrice: -10,
    },
  },
  {
    id: "payment-fraud",
    title: "Ticket #175: Spike in card-not-present fraud",
    kind: "ticket",
    tactic: "collection",
    description:
      "Fraud reports have tripled overnight, all online purchases using cards issued by you.",
    criteria: { minRound: 2 },
    resistedBy: "payment-handler",
    choices: [
      {
        id: "tighten",
        label: "Tighten fraud rules",
        hoursCost: 12,
        profitCost: 20,
        outcome: {
          narrative:
            "Fraud drops sharply. Some genuine purchases are declined too, costing interchange fees.",
        },
      },
      {
        id: "reimburse",
        label: "Reimburse customers and investigate",
        hoursCost: 16,
        profitCost: 40,
        outcome: {
          narrative:
            "Customers are refunded quickly and praise the bank's handling online.",
          sharePrice: 2,
        },
      },
    ],
    onIgnore: {
      narrative: "The fraud continued unchecked, and customers noticed.",
      profit: -120,
      sharePrice: -10,
    },
  },

  // --- Social engineering ------------------------------------------------
  {
    id: "hr-pretext",
    title: "Direct #222: 'New starter' asks HR for VPN access",
    kind: "direct",
    tactic: "initial-access",
    description:
      "HR forward an email from someone who says they start on Monday and need VPN access set up today 'to read the onboarding pack'.",
    choices: [
      {
        id: "verify",
        label: "Verify with the hiring manager first",
        hoursCost: 6,
        profitCost: 0,
        outcome: {
          narrative:
            "There is no such new starter. HR are warned about the pretext.",
        },
      },
      {
        id: "grant",
        label: "Grant temporary access",
        hoursCost: 1,
        profitCost: 0,
        outcome: {
          narrative:
            "The 'new starter' logs in that evening — and never turns up on Monday.",
          triggers: ["vpn-intrusion"],
        },
      },
    ],
    onIgnore: {
      narrative:
        "Without a reply from security, HR set up the access themselves.",
      triggers: ["vpn-intrusion"],
    },
  },
  {
    id: "ceo-fraud",
    title: "Direct #240: The CEO 'urgently' asks finance to wire £200k",
    kind: "direct",
    tactic: "initial-access",
    description:
      "A finance clerk forwards an email from the CEO's address asking for an urgent, confidential transfer to a new supplier. The CEO is on a flight.",
    resistedBy: "email",
    choices: [
      {
        id: "verify",
        label: "Tell finance to verify by phone",
        hoursCost: 4,
        profitCost: 0,
        outcome: {
          narrative:
            "The CEO's assistant confirms no such request was made. The transfer is stopped.",
        },
      },
      {
        id: "bulletin",
        label: "Stop it and brief all finance staff",
        hoursCost: 6,
        profitCost: 0,
        outcome: {
          narrative:
            "The transfer is stopped, and two similar requests are reported over the next hour.",
          sharePrice: 1,
        },
      },
    ],
    onIgnore: {
      narrative:
        "With no word from security, finance made the transfer. The money is gone.",
      profit: -200,
    },
  },
  {
    id: "vpn-bruteforce",
    title: "Ticket #188: Password spraying against the VPN",
    kind: "ticket",
    tactic: "credential-access",
    description:
      "Thousands of failed VPN logins overnight, a few attempts per account, across every staff username.",
    repeatable: true,
    resistedBy: "vpn",
    choices: [
      {
        id: "block",
        label: "Block the offending IPs",
        hoursCost: 4,
        profitCost: 0,
        check: {
          against: { asset: "vpn" },
          success: {
            narrative: "The attempts stop, and no account was compromised.",
          },
          failure: {
            narrative: "The attempts stop — after one of them succeeded.",
            triggers: ["vpn-intrusion"],
          },
        },
      },
      {
        id: "reset",
        label: "Force VPN password resets for everyone",
        hoursCost: 16,
        profitCost: 0,
        outcome: {
          narrative:
            "Every VPN password is reset. Remote staff grumble, but nobody gets in.",
          sharePrice: -2,
        },
      },
    ],
    onIgnore: {
      narrative: "The spraying continued until it found a weak password.",
      triggers: ["vpn-intrusion"],
    },
  },
  {
    id: "vpn-intrusion",
    title: "Ticket #190: Unknown device connected over the VPN",
    kind: "ticket",
    tactic: "initial-access",
    description:
      "A device nobody recognises held a VPN session open for six hours overnight, using a valid staff account.",
    triggerOnly: true,
    resistedBy: "vpn",
    choices: [
      {
        id: "full",
        label: "Kill the session, rotate credentials and hunt",
        hoursCost: 20,
        profitCost: 0,
        outcome: {
          narrative:
            "The intruder is evicted and their tooling found and removed.",
        },
      },
      {
        id: "kill",
        label: "Kill the session only",
        hoursCost: 4,
        profitCost: 0,
        check: {
          against: { asset: "soc" },
          success: {
            narrative:
              "Monitoring confirms the intruder never got further than the VPN.",
          },
          failure: {
            narrative:
              "The session is gone, but the intruder had already moved on to core banking.",
            triggers: ["lateral-core-banking"],
          },
        },
      },
    ],
    onIgnore: {
      narrative: "The intruder came back the next night and went deeper.",
      triggers: ["lateral-core-banking", "data-exfil"],
    },
  },

  // --- Digital banking ---------------------------------------------------
  {
    id: "ddos",
    title: "Ticket #201: DDoS against online banking",
    kind: "ticket",
    tactic: "impact",
    description:
      "The online banking site is crawling under a flood of traffic. Customers can't log in.",
    criteria: { minRound: 2 },
    repeatable: true,
    resistedBy: "firewall",
    choices: [
      {
        id: "scrubbing",
        label: "Engage a DDoS scrubbing service",
        hoursCost: 6,
        profitCost: 30,
        outcome: {
          narrative:
            "Traffic is rerouted through the scrubber. Service recovers.",
        },
      },
      {
        id: "rate-limit",
        label: "Rate-limit at the firewall",
        hoursCost: 10,
        profitCost: 0,
        check: {
          against: { asset: "firewall" },
          success: {
            narrative: "The rate limits hold and the site recovers.",
          },
          failure: {
            narrative:
              "The firewall buckles under the load. The site is down for the afternoon.",
            profit: -40,
            sharePrice: -12,
          },
        },
      },
    ],
    onIgnore: {
      narrative: "Online banking stayed down for a day.",
      profit: -60,
      sharePrice: -16,
    },
  },
  {
    id: "web-vuln",
    title: "Direct #205: Researcher reports a flaw in the banking app",
    kind: "direct",
    tactic: "initial-access",
    description:
      "A security researcher emails proof that the mobile app's API lets one customer view another's balance by changing an account number.",
    choices: [
      {
        id: "patch",
        label: "Patch it now and thank them publicly",
        hoursCost: 16,
        profitCost: 0,
        outcome: {
          narrative:
            "The fix ships the same day. The researcher's write-up praises your response.",
          sharePrice: 2,
        },
      },
      {
        id: "bounty",
        label: "Pay a bug bounty and patch next sprint",
        hoursCost: 4,
        profitCost: 10,
        check: {
          against: { asset: "digital-banking" },
          success: {
            narrative:
              "The web application firewall blocks exploitation until the fix ships.",
          },
          failure: {
            narrative: "Someone else found the flaw before the fix shipped.",
            triggers: ["account-takeover"],
          },
        },
      },
      {
        id: "legal",
        label: "Threaten legal action",
        hoursCost: 2,
        profitCost: 0,
        outcome: {
          narrative:
            "The researcher publishes the flaw in protest, unpatched. Others start exploiting it.",
          sharePrice: -16,
          triggers: ["account-takeover"],
        },
      },
    ],
    onIgnore: {
      narrative:
        "With no reply, the researcher published the flaw after their deadline.",
      triggers: ["account-takeover"],
    },
  },
  {
    id: "account-takeover",
    title: "Ticket #210: Customers report drained accounts",
    kind: "ticket",
    tactic: "impact",
    description:
      "A dozen customers have called to report transfers they didn't make, all from logins through the mobile app.",
    criteria: { minRound: 3 },
    resistedBy: "digital-banking",
    choices: [
      {
        id: "freeze",
        label: "Freeze the affected accounts and reimburse",
        hoursCost: 16,
        profitCost: 50,
        outcome: {
          narrative:
            "Accounts are secured and customers reimbursed within the day.",
          sharePrice: -6,
        },
      },
      {
        id: "quiet",
        label: "Reimburse quietly and hope it stops",
        hoursCost: 4,
        profitCost: 50,
        check: {
          against: { probability: 50 },
          success: {
            narrative: "The wave of fraud dies down on its own.",
          },
          failure: {
            narrative: "More customers are hit, and they take to social media.",
            sharePrice: -24,
          },
        },
      },
    ],
    onIgnore: {
      narrative:
        "Customer complaints piled up unanswered, and the regulator heard about them.",
      profit: -60,
      sharePrice: -24,
      triggers: ["regulator-inquiry"],
    },
  },

  // --- Perimeter / operations ---------------------------------------------
  {
    id: "firewall-zero-day",
    title: "News #260: Zero-day in your firewall vendor's appliance",
    kind: "news",
    tactic: "initial-access",
    description:
      "Your firewall vendor has disclosed an actively exploited vulnerability. A patch exists but needs a reboot during business hours.",
    criteria: { minRound: 2 },
    choices: [
      {
        id: "patch",
        label: "Emergency patch and reboot",
        hoursCost: 16,
        profitCost: 10,
        outcome: {
          narrative:
            "A short outage, but the firewall is patched — and you take the chance to clean up its rules.",
          grantUpgrades: ["firewall-rules"],
        },
      },
      {
        id: "mitigate",
        label: "Apply the vendor's interim mitigation",
        hoursCost: 4,
        profitCost: 0,
        check: {
          against: { asset: "firewall" },
          success: {
            narrative: "The mitigation holds until a planned patch window.",
          },
          failure: {
            narrative:
              "Attackers bypass the mitigation and gain a foothold behind the firewall.",
            triggers: ["vpn-intrusion"],
          },
        },
      },
    ],
    onIgnore: {
      narrative: "The unpatched firewall was exploited overnight.",
      triggers: ["vpn-intrusion"],
    },
  },
  {
    id: "sanctions-backlog",
    title: "Ticket #250: Sanctions screening backlog",
    kind: "ticket",
    tactic: "operations",
    description:
      "A list update failed to load and 600 international payments are queued for manual screening.",
    criteria: { minRound: 2 },
    resistedBy: "sanctions",
    choices: [
      {
        id: "manual",
        label: "Clear the backlog by hand",
        hoursCost: 20,
        profitCost: 0,
        outcome: {
          narrative: "Every payment is screened. Nothing is flagged.",
        },
      },
      {
        id: "prioritise",
        label: "Screen high-value payments only",
        hoursCost: 6,
        profitCost: 0,
        check: {
          against: { asset: "sanctions" },
          success: {
            narrative: "The shortcut works: nothing of concern slips through.",
          },
          failure: {
            narrative:
              "A payment to a sanctioned entity is released. The regulator is informed.",
            profit: -80,
            triggers: ["regulator-inquiry"],
          },
        },
      },
    ],
    onIgnore: {
      narrative:
        "Queued payments were released unscreened, including one to a sanctioned entity.",
      triggers: ["regulator-inquiry"],
    },
  },
  {
    id: "siem-noise",
    title: "Ticket #270: The SIEM is drowning in false positives",
    kind: "ticket",
    tactic: "operations",
    description:
      "Analysts are closing 400 alerts a day, almost all false positives. Real alerts are getting lost in the noise.",
    criteria: { excludesUpgrades: ["soc-threat-intel"] },
    choices: [
      {
        id: "tune",
        label: "Tune the detection rules",
        hoursCost: 16,
        profitCost: 0,
        outcome: {
          narrative: "Alert volume drops by 80%, and analysts can focus again.",
        },
      },
      {
        id: "mute",
        label: "Mute the noisiest rules",
        hoursCost: 2,
        profitCost: 0,
        check: {
          against: { asset: "soc" },
          success: {
            narrative: "The muted rules really were just noise.",
          },
          failure: {
            narrative:
              "One of the muted rules was the only one watching VPN logins.",
            triggers: ["vpn-intrusion"],
          },
        },
      },
    ],
  },

  // --- On-draw events ----------------------------------------------------
  {
    id: "staff-sick",
    title: "Direct #300: A CSIRT analyst is off sick",
    kind: "direct",
    tactic: "operations",
    description: "One of the team has called in sick today.",
    repeatable: true,
    onDraw: {
      narrative: "An analyst is off sick: the team has 8 fewer hours today.",
      hours: -8,
    },
    choices: [],
  },
  {
    id: "board-briefing",
    title: "Direct #305: The board demands a security briefing",
    kind: "direct",
    tactic: "operations",
    description:
      "After a week of headlines about bank hacks, the board wants a briefing from the CISO's team today.",
    criteria: { minRound: 2 },
    onDraw: {
      narrative:
        "Preparing and giving the board briefing takes 12 hours, but it reassures investors.",
      hours: -12,
      sharePrice: 2,
    },
    choices: [],
  },
  {
    id: "contractor",
    title: "Direct #310: A temporary contractor joins the team",
    kind: "direct",
    tactic: "operations",
    description: "An incident response contractor is available for the day.",
    onDraw: {
      narrative: "The contractor adds 8 hours to the team's day.",
      hours: 8,
    },
    choices: [],
  },
  {
    id: "vendor-patch",
    title: "Ticket #315: VPN vendor auto-pushes a patch overnight",
    kind: "ticket",
    tactic: "operations",
    description:
      "The VPN vendor's managed update service installed the latest security patch overnight.",
    criteria: { excludesUpgrades: ["vpn-patch"] },
    onDraw: {
      narrative: "The VPN appliance was patched for you overnight.",
      grantUpgrades: ["vpn-patch"],
    },
    choices: [],
  },
  {
    id: "analyst-praise",
    title: "News #320: Analysts praise your digital banking app",
    kind: "news",
    tactic: "operations",
    description:
      "A sector report ranks your mobile app the most trusted in the market.",
    criteria: { minRound: 2, excludesEvents: ["account-takeover"] },
    onDraw: {
      narrative: "Positive coverage nudges the share price up.",
      sharePrice: 5,
    },
    choices: [],
  },
  {
    id: "sector-scare",
    title: "News #325: Sector-wide cyber scare hits bank stocks",
    kind: "news",
    tactic: "operations",
    description:
      "A breach at a rival bank has investors selling across the sector.",
    criteria: { minRound: 3 },
    onDraw: {
      narrative: "Your share price falls with the rest of the sector.",
      sharePrice: -5,
    },
    choices: [],
  },
];
