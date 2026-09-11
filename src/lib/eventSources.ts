/**
 * eventSources.ts — the ONE source registry.
 *
 * Every place the app talks about "where events could come from" reads from
 * this file: the fetchers in the serverless pipeline, the directory column in
 * the Events UI, the source-health panel, and the .ics export. Adding a source
 * is exactly one entry — set `fetch` to turn on deterministic pulling, omit it
 * to leave the source as a hand-browse link.
 *
 * Kept dependency-free on purpose: it is imported by both the browser bundle
 * and the Vercel functions, so it must never touch DOM, React, or Node APIs.
 */

export type Region = "Kenya" | "Africa" | "Global";

export type Category =
  | "Community"
  | "Aggregator"
  | "Hackathon"
  | "Conference"
  | "Campus"
  | "Government"
  | "Ticketing"
  | "Media";

export type Cadence = "Weekly" | "Monthly" | "Seasonal" | "Annual" | "Rolling";

/**
 * Fetch adapters the pipeline knows how to run.
 * - vabu-listing / vabu-org : the server-rendered vabu.app markup
 * - luma                    : lu.ma public discovery API (JSON)
 * - devpost                 : devpost.com hackathon API (JSON)
 * - jsonld                  : schema.org Event blocks embedded in any page
 * - ics                     : an iCalendar feed (.ics)
 */
export type FetchKind = "vabu-listing" | "vabu-org" | "luma" | "devpost" | "jsonld" | "ics";

export interface FetchConfig {
  kind: FetchKind;
  /** Exact URL the adapter requests. */
  url: string;
  /** Engineering-only orgs (IEEE, React Kenya, …) count as tech by definition. */
  engineering?: boolean;
}

export interface EventSource {
  id: string;
  name: string;
  region: Region;
  category: Category;
  cadence: Cadence;
  note: string;
  /** Org homepage / calendar root — what you open to look around. */
  homepage: string;
  /** Where to browse or search their events directly. */
  searchUrl: string;
  /** Present only for sources the pipeline can pull deterministically. */
  fetch?: FetchConfig;
}

/** Luma discovery is scoped to a place; keep the id in one spot. */
export const LUMA_NAIROBI_PLACE_ID = "discplace-YSx1DPerjjIyq7M";
export const LUMA_NEXT_WEEK_QUERY =
  `https://api.lu.ma/discover/get-paginated-events?pagination_limit=40&discover_place_api_id=${LUMA_NAIROBI_PLACE_ID}`;

export const EVENT_SOURCES: EventSource[] = [
  // ---------------------------------------------------------------- Kenya · fetched
  {
    id: "vabu",
    name: "Vabu (Kenya events)",
    region: "Kenya",
    category: "Aggregator",
    cadence: "Weekly",
    note: "Server-rendered listing of ticketed community events across Kenya.",
    homepage: "https://vabu.app/events",
    searchUrl: "https://vabu.app/events",
    fetch: { kind: "vabu-listing", url: "https://vabu.app/events" },
  },
  {
    id: "luma-nairobi",
    name: "Luma Nairobi",
    region: "Kenya",
    category: "Aggregator",
    cadence: "Weekly",
    note: "lu.ma discovery scoped to Nairobi — the densest source of tech meetups.",
    homepage: "https://lu.ma/nairobi",
    searchUrl: "https://lu.ma/nairobi",
    fetch: { kind: "luma", url: LUMA_NEXT_WEEK_QUERY },
  },
  // Engineering-org fanbases on vabu (all tech by definition).
  { id: "vabu-ieee-sight", name: "IEEE SIGHT", region: "Kenya", category: "Community", cadence: "Monthly", note: "Humanitarian-tech IEEE group.", homepage: "https://vabu.app/u/IEEE%20SIGHT", searchUrl: "https://vabu.app/u/IEEE%20SIGHT", fetch: { kind: "vabu-org", url: "https://vabu.app/u/IEEE%20SIGHT", engineering: true } },
  { id: "vabu-ieee-sight-ke", name: "IEEE SIGHT Kenya", region: "Kenya", category: "Community", cadence: "Monthly", note: "IEEE SIGHT Kenya chapter.", homepage: "https://vabu.app/u/ieee-sight-kenya", searchUrl: "https://vabu.app/u/ieee-sight-kenya", fetch: { kind: "vabu-org", url: "https://vabu.app/u/ieee-sight-kenya", engineering: true } },
  { id: "vabu-ieee-stem", name: "IEEE STEM Outreach", region: "Kenya", category: "Community", cadence: "Seasonal", note: "IEEE STEM outreach programmes.", homepage: "https://vabu.app/u/ieee-stem-outreach", searchUrl: "https://vabu.app/u/ieee-stem-outreach", fetch: { kind: "vabu-org", url: "https://vabu.app/u/ieee-stem-outreach", engineering: true } },
  { id: "vabu-ieee-grss", name: "IEEE GRSS Kenya", region: "Kenya", category: "Community", cadence: "Seasonal", note: "Geoscience & remote sensing society.", homepage: "https://vabu.app/u/ieee-grss-kenya", searchUrl: "https://vabu.app/u/ieee-grss-kenya", fetch: { kind: "vabu-org", url: "https://vabu.app/u/ieee-grss-kenya", engineering: true } },
  { id: "vabu-ieee-ignite", name: "IEEE Tech Ignite", region: "Kenya", category: "Community", cadence: "Annual", note: "IEEE summer school / bootcamp.", homepage: "https://vabu.app/u/ieee-tech-ignite-summer-school-2025", searchUrl: "https://vabu.app/u/ieee-tech-ignite-summer-school-2025", fetch: { kind: "vabu-org", url: "https://vabu.app/u/ieee-tech-ignite-summer-school-2025", engineering: true } },
  { id: "vabu-react-ke", name: "React Developers Kenya", region: "Kenya", category: "Community", cadence: "Monthly", note: "React/JS meetups.", homepage: "https://vabu.app/u/react-developers-kenya", searchUrl: "https://vabu.app/u/react-developers-kenya", fetch: { kind: "vabu-org", url: "https://vabu.app/u/react-developers-kenya", engineering: true } },
  { id: "vabu-angular-ke", name: "Angular Kenya", region: "Kenya", category: "Community", cadence: "Monthly", note: "Angular meetups.", homepage: "https://vabu.app/u/angular-kenya", searchUrl: "https://vabu.app/u/angular-kenya", fetch: { kind: "vabu-org", url: "https://vabu.app/u/angular-kenya", engineering: true } },
  { id: "vabu-nairobi-devops", name: "Nairobi DevOps", region: "Kenya", category: "Community", cadence: "Monthly", note: "DevOps/cloud community.", homepage: "https://vabu.app/u/nairobi-devops", searchUrl: "https://vabu.app/u/nairobi-devops", fetch: { kind: "vabu-org", url: "https://vabu.app/u/nairobi-devops", engineering: true } },
  { id: "vabu-nairobi-talks", name: "Nairobi Tech Talks", region: "Kenya", category: "Community", cadence: "Monthly", note: "General tech talks.", homepage: "https://vabu.app/u/nairobi-tech-talks", searchUrl: "https://vabu.app/u/nairobi-tech-talks", fetch: { kind: "vabu-org", url: "https://vabu.app/u/nairobi-tech-talks", engineering: true } },

  // ------------------------------------------------------------- Kenya · hand-browse
  { id: "gdg-nairobi", name: "GDG Nairobi", region: "Kenya", category: "Community", cadence: "Monthly", note: "Google Developer Group — meetups + I/O Extended.", homepage: "https://gdg.community.dev/gdg-nairobi/", searchUrl: "https://gdg.community.dev/gdg-nairobi/" },
  { id: "gdg-kisumu", name: "GDG Kisumu", region: "Kenya", category: "Community", cadence: "Monthly", note: "Google Developer Group, Kisumu.", homepage: "https://gdg.community.dev/gdg-kisumu/", searchUrl: "https://gdg.community.dev/gdg-kisumu/" },
  { id: "gdg-eldoret", name: "GDG Eldoret", region: "Kenya", category: "Community", cadence: "Seasonal", note: "Google Developer Group, Eldoret.", homepage: "https://gdg.community.dev/gdg-eldoret/", searchUrl: "https://gdg.community.dev/gdg-eldoret/" },
  { id: "ihub", name: "iHub Nairobi", region: "Kenya", category: "Community", cadence: "Monthly", note: "Kenya's original tech hub — events + community.", homepage: "https://ihub.co.ke/", searchUrl: "https://ihub.co.ke/" },
  { id: "moringa", name: "Moringa School", region: "Kenya", category: "Campus", cadence: "Seasonal", note: "Coding bootcamp — open days, workshops.", homepage: "https://moringaschool.com/events/", searchUrl: "https://moringaschool.com/events/" },
  { id: "startupgrind-nairobi", name: "Startup Grind Nairobi", region: "Kenya", category: "Community", cadence: "Monthly", note: "Founder talks and networking.", homepage: "https://www.startupgrind.com/nairobi/", searchUrl: "https://www.startupgrind.com/nairobi/" },
  { id: "kictanet", name: "KICTANet", region: "Kenya", category: "Community", cadence: "Monthly", note: "ICT policy and internet-governance fora.", homepage: "https://www.kictanet.or.ke/", searchUrl: "https://www.kictanet.or.ke/" },
  { id: "africastalking", name: "Africa's Talking", region: "Kenya", category: "Community", cadence: "Monthly", note: "API/developer meetups and hackathons.", homepage: "https://africastalking.com/", searchUrl: "https://africastalking.com/" },
  { id: "konza", name: "Konza Technopolis", region: "Kenya", category: "Government", cadence: "Seasonal", note: "Government tech-city programmes + summits.", homepage: "https://konza.go.ke/", searchUrl: "https://konza.go.ke/" },
  { id: "eventbrite-nairobi", name: "Eventbrite Nairobi tech", region: "Kenya", category: "Aggregator", cadence: "Rolling", note: "Ticketed + free tech gatherings in Nairobi.", homepage: "https://www.eventbrite.com/d/kenya--nairobi/tech-events/", searchUrl: "https://www.eventbrite.com/d/kenya--nairobi/tech-events/" },
  { id: "meetup-nairobi", name: "Meetup Nairobi tech", region: "Kenya", category: "Aggregator", cadence: "Rolling", note: "Meetup.com groups around Nairobi.", homepage: "https://www.meetup.com/find/?keywords=tech&location=ke--Nairobi", searchUrl: "https://www.meetup.com/find/?keywords=tech&location=ke--Nairobi" },
  { id: "allevents-nairobi", name: "AllEvents Nairobi", region: "Kenya", category: "Aggregator", cadence: "Rolling", note: "Broad local event aggregator.", homepage: "https://allevents.in/nairobi", searchUrl: "https://allevents.in/nairobi" },
  { id: "10times-nairobi", name: "10times Nairobi", region: "Kenya", category: "Aggregator", cadence: "Rolling", note: "Trade shows, conferences, expos.", homepage: "https://10times.com/nairobi", searchUrl: "https://10times.com/nairobi" },
  { id: "ticketsasa", name: "TicketSasa", region: "Kenya", category: "Ticketing", cadence: "Rolling", note: "Kenyan ticketing — conferences, concerts, expos.", homepage: "https://ticketsasa.com/", searchUrl: "https://ticketsasa.com/" },
  { id: "mookh", name: "Mookh", region: "Kenya", category: "Ticketing", cadence: "Rolling", note: "Kenyan ticketing platform.", homepage: "https://mookh.com/", searchUrl: "https://mookh.com/" },

  // -------------------------------------------------------------- Africa · hand-browse
  { id: "mest", name: "MEST Africa", region: "Africa", category: "Campus", cadence: "Seasonal", note: "Pan-African startup training + events.", homepage: "https://mestafrica.com/", searchUrl: "https://mestafrica.com/" },
  { id: "alx", name: "ALX Africa", region: "Africa", category: "Campus", cadence: "Seasonal", note: "Tech fellowships and info sessions.", homepage: "https://www.alxafrica.com/", searchUrl: "https://www.alxafrica.com/" },
  { id: "briter", name: "Briter Bridges", region: "Africa", category: "Media", cadence: "Rolling", note: "Africa tech research — reports, summits.", homepage: "https://briterbridges.com/", searchUrl: "https://briterbridges.com/" },
  { id: "techcabal", name: "TechCabal", region: "Africa", category: "Media", cadence: "Rolling", note: "TechCabal events (Moonshot, summit).", homepage: "https://techcabal.com/events/", searchUrl: "https://techcabal.com/events/" },
  { id: "shecodeafrica", name: "She Code Africa", region: "Africa", category: "Community", cadence: "Monthly", note: "Women in tech across Africa.", homepage: "https://shecodeafrica.org/", searchUrl: "https://shecodeafrica.org/" },
  { id: "osca", name: "Open Source Community Africa", region: "Africa", category: "Community", cadence: "Monthly", note: "Open-source community + festival.", homepage: "https://oscafrica.org/", searchUrl: "https://oscafrica.org/" },
  { id: "dsa", name: "Data Science Africa", region: "Africa", category: "Community", cadence: "Annual", note: "Data science school + conference.", homepage: "https://www.datascienceafrica.org/", searchUrl: "https://www.datascienceafrica.org/" },
  { id: "ats", name: "Africa Tech Summit", region: "Africa", category: "Conference", cadence: "Annual", note: "Investor + founder summit.", homepage: "https://africatechsummit.com/", searchUrl: "https://africatechsummit.com/" },
  { id: "atf", name: "Africa Tech Festival", region: "Africa", category: "Conference", cadence: "Annual", note: "AfricaCom / AfricaTech mega-event.", homepage: "https://www.africatechfestival.com/", searchUrl: "https://www.africatechfestival.com/" },
  { id: "africafintech", name: "Africa Fintech Summit", region: "Africa", category: "Conference", cadence: "Annual", note: "Fintech policy + investment forum.", homepage: "https://www.africafintechsummit.com/", searchUrl: "https://www.africafintechsummit.com/" },
  { id: "mwcafrica", name: "MWC Africa", region: "Africa", category: "Conference", cadence: "Annual", note: "GSMA mobile/telecom conference.", homepage: "https://www.mwcafrica.com/", searchUrl: "https://www.mwcafrica.com/" },

  // -------------------------------------------------------------- Global · hand-browse
  { id: "devpost", name: "Devpost", region: "Global", category: "Hackathon", cadence: "Rolling", note: "Online hackathons — many open to Kenya.", homepage: "https://devpost.com/hackathons", searchUrl: "https://devpost.com/hackathons", fetch: { kind: "devpost", url: "https://devpost.com/api/hackathons?status%5B%5D=open" } },
  { id: "devfolio", name: "Devfolio", region: "Global", category: "Hackathon", cadence: "Rolling", note: "Hackathon platform (largely remote-friendly).", homepage: "https://devfolio.co/hackathons", searchUrl: "https://devfolio.co/hackathons" },
  { id: "mlh", name: "Major League Hacking", region: "Global", category: "Hackathon", cadence: "Seasonal", note: "Student hackathon season calendar.", homepage: "https://mlh.io/events", searchUrl: "https://mlh.io/events" },
  { id: "confs-tech", name: "Confs.tech", region: "Global", category: "Conference", cadence: "Rolling", note: "Filterable developer-conference index.", homepage: "https://confs.tech/", searchUrl: "https://confs.tech/" },
  { id: "sessionize", name: "Sessionize", region: "Global", category: "Aggregator", cadence: "Rolling", note: "Call-for-papers listings — spot upcoming confs.", homepage: "https://sessionize.com/", searchUrl: "https://sessionize.com/" },
  { id: "hasgeek", name: "Hasgeek", region: "Global", category: "Aggregator", cadence: "Rolling", note: "Community tech conferences + workshops.", homepage: "https://hasgeek.com/", searchUrl: "https://hasgeek.com/" },
  { id: "women-techmakers", name: "Women Techmakers", region: "Global", category: "Community", cadence: "Seasonal", note: "Google's women-in-tech programme.", homepage: "https://www.womentechmakers.com/", searchUrl: "https://www.womentechmakers.com/" },
  { id: "gdg-global", name: "Google Developer Groups", region: "Global", category: "Community", cadence: "Rolling", note: "Find any city's GDG chapter.", homepage: "https://gdg.community.dev/", searchUrl: "https://gdg.community.dev/" },
  { id: "io-google", name: "Google I/O", region: "Global", category: "Conference", cadence: "Annual", note: "Google's annual developer conference.", homepage: "https://io.google/", searchUrl: "https://io.google/" },
];

/** Sources the pipeline can pull deterministically (have a `fetch` config). */
export function fetchSources(): EventSource[] {
  return EVENT_SOURCES.filter((s) => s.fetch);
}

/** Everything shown in the directory column, fetched or not. */
export function directorySources(): EventSource[] {
  return EVENT_SOURCES;
}

export function sourceById(id: string): EventSource | undefined {
  return EVENT_SOURCES.find((s) => s.id === id);
}
