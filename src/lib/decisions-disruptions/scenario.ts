/**
 * Player-facing scenario briefing, adapted from the D-D instruction booklet's
 * "Welcome address by the Board of Directors" and "Describing the game board"
 * sections (plus the site/communication FAQ answers), reworded where the
 * original pointed at physical Lego pieces. Safe for client import: it holds
 * nothing the players aren't told at the start of the game.
 */
export interface ScenarioSection {
  heading: string;
  paragraphs: readonly string[];
}

export const SCENARIO_TITLE = "Welcome from the Board of Directors";

export const SCENARIO: readonly ScenarioSection[] = [
  {
    heading: "Your mission",
    paragraphs: [
      "Congratulations! You have been appointed to be the team in charge of managing the security of this small utility company. Security is a very new concern for us and we don't understand much about it — but we follow the news, and we have seen a growing number of security incidents in utility companies like ours. You are our security experts, and we trust you to keep us safe and secure.",
      "Your task is to minimise the number of security incidents. Ours, as the Board, is to take care of the company's share price: we wouldn't want the press to learn that we have been hacked, would we? We will keep you updated on how our stock is doing.",
      "We work on a two-month financial cycle, and your budget for each cycle is 100k. We have already identified a number of potential investments in defences, but money is limited: prioritise the most important defences for this cycle and delay less urgent ones. Any unspent money carries over to the next cycle.",
    ],
  },
  {
    heading: "The plant",
    paragraphs: [
      "Our field site sits in a mountainous area of the country. A river drives two turbines that generate electricity, controlled by a SCADA controller maintained by an on-site technician. The plant's local network links the controller, a few PCs for engineers and technicians, and a historian database that stores the controller's monitoring values: water flow, power production, and so on.",
    ],
  },
  {
    heading: "The office",
    paragraphs: [
      "Our offices occupy one floor of a corporate building in a city centre, a few dozen miles away. The office network hosts PCs for managers, Human Resources, engineers and analysts, plus the company's own email and web server, connected to a database storing emails, HR records, and technical and financial data.",
    ],
  },
  {
    heading: "How they connect",
    paragraphs: [
      "Each site's network is connected to the Internet through its own router. Staff at both sites communicate constantly by email, and monitoring data is pulled every day from the plant's database to the office for strategic analysis. There is no direct control of the turbines from the office: only the plant's controller can stop the physical process in an emergency.",
    ],
  },
];
