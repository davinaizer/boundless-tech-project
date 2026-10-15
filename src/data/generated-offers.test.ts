import { describe, expect, it } from "vitest";
import { Audience, Category, type Offer } from "@/domain/offer";
import { UK_REGIONS, UK_WIDE_REGION } from "@/domain/search-offers";
import { CATALOGUE_OFFERS, GENERATED_OFFERS, SAMPLE_OFFERS } from "./sample-catalogue";

// The spec is docs/research/generated-catalogue-spec.md (ADR-013). A fixed date,
// so the expiry mix does not depend on the wall clock.
const REFERENCE_DATE = "2026-10-15";

// Pounds per person; an assumption for plausible sample terms, not research.
const PRICE_BANDS: Record<Category, [number, number]> = {
  "days-out": [8, 35],
  dining: [4, 45],
  shopping: [10, 150],
  travel: [40, 250],
  motoring: [5, 80],
  events: [12, 90],
};

// Major UK brands per category, matched as whole words. Catches only these
// names: that no offer matches a smaller real business is not verified.
const BRAND_DENYLIST: Record<Category, string[]> = {
  "days-out": [
    "Merlin",
    "Alton Towers",
    "Legoland",
    "Thorpe Park",
    "Chessington",
    "Odeon",
    "Cineworld",
    "Vue",
    "Everyman",
    "Picturehouse",
    "Showcase",
    "National Trust",
    "English Heritage",
    "Madame Tussauds",
    "Sea Life",
    "Hollywood Bowl",
    "Center Parcs",
  ],
  dining: [
    "Nando's",
    "Wagamama",
    "Pizza Express",
    "PizzaExpress",
    "Pizza Hut",
    "Domino's",
    "Zizzi",
    "Prezzo",
    "Frankie & Benny's",
    "Harvester",
    "Toby Carvery",
    "Wetherspoon",
    "Greggs",
    "Costa",
    "Starbucks",
    "Pret",
    "Caffe Nero",
    "McDonald's",
    "KFC",
    "Burger King",
    "Five Guys",
    "Bella Italia",
    "Beefeater",
  ],
  shopping: [
    "Tesco",
    "Sainsbury's",
    "Sainsburys",
    "Asda",
    "Morrisons",
    "Aldi",
    "Lidl",
    "Waitrose",
    "Co-op",
    "Marks & Spencer",
    "M&S",
    "John Lewis",
    "Argos",
    "Currys",
    "Boots",
    "Superdrug",
    "Next",
    "Primark",
    "B&Q",
    "Wickes",
    "Homebase",
    "IKEA",
    "Dunelm",
    "JD Sports",
    "Sports Direct",
    "Specsavers",
    "Vision Express",
    "Waterstones",
    "WHSmith",
    "Pets at Home",
    "Hobbycraft",
    "TK Maxx",
  ],
  travel: [
    "Premier Inn",
    "Travelodge",
    "Holiday Inn",
    "Hilton",
    "Marriott",
    "Haven",
    "Butlin's",
    "Butlins",
    "Pontins",
    "Parkdean",
    "Hoseasons",
    "Airbnb",
    "Expedia",
    "Jet2",
    "easyJet",
    "Ryanair",
    "British Airways",
    "TUI",
    "National Express",
    "Megabus",
    "Trainline",
    "LNER",
    "CalMac",
    "Eurostar",
    "YHA",
  ],
  motoring: [
    "Shell",
    "BP",
    "Esso",
    "Texaco",
    "Halfords",
    "Kwik Fit",
    "National Tyres",
    "AA",
    "RAC",
    "Green Flag",
    "Admiral",
    "Direct Line",
    "Aviva",
    "Churchill",
    "NCP",
    "Enterprise",
    "Hertz",
    "Avis",
    "Europcar",
    "Zipcar",
    "Autoglass",
  ],
  events: [
    "Ticketmaster",
    "See Tickets",
    "Live Nation",
    "O2",
    "Ambassador Theatre Group",
    "Royal Albert Hall",
    "Barbican",
    "Southbank Centre",
    "Royal Opera House",
    "National Theatre",
    "Comedy Store",
    "Glastonbury",
    "Wembley",
  ],
};

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Whole words, case-insensitive, so "Haven" flags "Haven Parks" but not "Oakhaven".
const brandPattern = (brand: string) =>
  new RegExp(`(^|[^a-z0-9])${escape(brand.toLowerCase())}($|[^a-z0-9])`);
const ALL_BRANDS = Object.values(BRAND_DENYLIST).flat().map(brandPattern);

const share = (offers: readonly Offer[], keep: (o: Offer) => boolean) =>
  offers.filter(keep).length / offers.length;

describe("GENERATED_OFFERS", () => {
  it("has 25 offers per category", () => {
    for (const category of Category.options) {
      expect(
        GENERATED_OFFERS.filter((o) => o.category === category),
        category,
      ).toHaveLength(25);
    }
  });

  it("uses every UK region and UK-wide, and nothing else", () => {
    const vocabulary = [...UK_REGIONS, UK_WIDE_REGION];
    expect(new Set(GENERATED_OFFERS.map((o) => o.region))).toEqual(new Set(vocabulary));
  });

  it("covers every audience in every category", () => {
    for (const category of Category.options) {
      const inCategory = GENERATED_OFFERS.filter((o) => o.category === category);
      expect(new Set(inCategory.flatMap((o) => o.audience)), category).toEqual(
        new Set(Audience.options),
      );
    }
  });

  it("is about 30% Plus and about 10% expired", () => {
    const plus = share(GENERATED_OFFERS, (o) => o.tier === "plus");
    const expired = share(GENERATED_OFFERS, (o) => !!o.expiryDate && o.expiryDate < REFERENCE_DATE);
    const future = share(GENERATED_OFFERS, (o) => !!o.expiryDate && o.expiryDate >= REFERENCE_DATE);
    expect(plus).toBeGreaterThanOrEqual(0.25);
    expect(plus).toBeLessThanOrEqual(0.35);
    expect(expired).toBeGreaterThanOrEqual(0.08);
    expect(expired).toBeLessThanOrEqual(0.14);
    expect(future).toBeGreaterThan(0);
  });

  it("keeps prices in the category band and savings below the price", () => {
    for (const offer of GENERATED_OFFERS) {
      const [low, high] = PRICE_BANDS[offer.category];
      expect(offer.typicalPricePerPerson, offer.id).toBeGreaterThanOrEqual(low);
      expect(offer.typicalPricePerPerson, offer.id).toBeLessThanOrEqual(high);
      expect(offer.typicalSavingPerUse, offer.id).toBeLessThan(offer.typicalPricePerPerson);
      expect(offer.assumedUsesPerYear, offer.id).toBeGreaterThan(0);
    }
  });

  it("follows the hand-written offers with sequential ids", () => {
    expect(GENERATED_OFFERS.map((o) => o.id)).toEqual(
      GENERATED_OFFERS.map(
        (_, i) => `offer-${String(SAMPLE_OFFERS.length + 1 + i).padStart(3, "0")}`,
      ),
    );
  });
});

describe("CATALOGUE_OFFERS", () => {
  it("is the hand-written offers, unchanged, then the generated ones", () => {
    expect(CATALOGUE_OFFERS).toEqual([...SAMPLE_OFFERS, ...GENERATED_OFFERS]);
  });

  it("has unique ids and unique partner names", () => {
    expect(new Set(CATALOGUE_OFFERS.map((o) => o.id)).size).toBe(CATALOGUE_OFFERS.length);
    expect(new Set(CATALOGUE_OFFERS.map((o) => o.partner)).size).toBe(CATALOGUE_OFFERS.length);
  });

  it("uses only the region vocabulary", () => {
    const vocabulary = new Set<string>([...UK_REGIONS, UK_WIDE_REGION]);
    for (const offer of CATALOGUE_OFFERS) expect(vocabulary.has(offer.region), offer.id).toBe(true);
  });

  it("names no major UK brand in a partner or title", () => {
    for (const offer of CATALOGUE_OFFERS) {
      for (const text of [offer.partner, offer.title]) {
        const hit = ALL_BRANDS.find((pattern) => pattern.test(text.toLowerCase()));
        expect(hit, `${offer.id}: ${text}`).toBeUndefined();
      }
    }
  });

  it("flags a brand as a whole word only", () => {
    expect(brandPattern("Haven").test("haven parks")).toBe(true);
    expect(brandPattern("Haven").test("oakhaven furniture")).toBe(false);
    expect(brandPattern("M&S").test("food from m&s")).toBe(true);
  });
});
