// ─── Landing Page CMS Content Schema ──────────────────────────────────────────
// Edit via /admin/cms  →  saved to  data/cms-content.json

export type CMSContent = {
  hero: {
    heroBg: string;
    heroBgImage: string;
    badge: string;
    headline: string;
    headlineAccent: string;
    subheadline: string;
    ctaPrimary: string;
    ctaSecondary: string;
    pill1Title: string;
    pill1Desc: string;
    pill2Title: string;
    pill2Desc: string;
    pill3Title: string;
    pill3Desc: string;
    trackerLabel: string;
    trackerTitle: string;
  };
  liveAuctions: {
    badge: string;
    heading: string;
    subheading: string;
    ctaBid: string;
    ctaView: string;
  };
  categories: {
    heading: string;
    subheading: string;
    vegetableTitle: string;
    vegetableCopy: string;
    fruitTitle: string;
    fruitCopy: string;
    grainTitle: string;
    grainCopy: string;
    spiceTitle: string;
    spiceCopy: string;
  };
  whyPaikari: {
    heading: string;
    subheading: string;
    qcTitle: string;
    qcCopy: string;
    qcDetail: string;
    qcStat: string;
    qcStatLabel: string;
    pricingTitle: string;
    pricingCopy: string;
    pricingDetail: string;
    pricingStat: string;
    pricingStatLabel: string;
    logisticsTitle: string;
    logisticsCopy: string;
    logisticsDetail: string;
    logisticsStat: string;
    logisticsStatLabel: string;
    paymentTitle: string;
    paymentCopy: string;
    paymentDetail: string;
    paymentStat: string;
    paymentStatLabel: string;
  };
  newsletter: {
    heading: string;
    subheading: string;
    placeholder: string;
    buttonText: string;
  };
};

export const DEFAULT_CMS: CMSContent = {
  hero: {
    heroBg: "light-green",
    heroBgImage: "",
    badge: "Trusted by 1000+ traders",
    headline: "The future of",
    headlineAccent: "agricultural trading",
    subheadline:
      "Real-time bidding, transparent pricing, and verified quality — trade smarter with Bangladesh's enterprise marketplace.",
    ctaPrimary: "Start bidding",
    ctaSecondary: "Become seller",
    pill1Title: "QC Verified",
    pill1Desc: "Every lot inspected",
    pill2Title: "Live Pricing",
    pill2Desc: "Real-time bids",
    pill3Title: "Fast Delivery",
    pill3Desc: "Same-day available",
    trackerLabel: "Live price tracker",
    trackerTitle: "Today's market",
  },
  liveAuctions: {
    badge: "Live now",
    heading: "Live auctions now",
    subheading: "Bid in real time on fresh products from verified sellers.",
    ctaBid: "Bid now",
    ctaView: "View lot",
  },
  categories: {
    heading: "Browse categories",
    subheading: "Find products from all major trading categories.",
    vegetableTitle: "Vegetables",
    vegetableCopy: "Fresh & quality verified",
    fruitTitle: "Fruits",
    fruitCopy: "Seasonal & premium",
    grainTitle: "Grains",
    grainCopy: "Certified quality",
    spiceTitle: "Spices",
    spiceCopy: "Authentic & pure",
  },
  whyPaikari: {
    heading: "Why choose Paikari?",
    subheading: "We've built trust with transparent, secure trading.",
    qcTitle: "QC Verified",
    qcCopy: "Every product passes rigorous quality checks before auction.",
    qcDetail:
      "Our certified inspectors grade each lot for freshness, weight, and purity. Only verified produce reaches the bidding floor — protecting buyers from substandard goods.",
    qcStat: "99.2%",
    qcStatLabel: "verification pass rate",
    pricingTitle: "Live Pricing",
    pricingCopy: "Real-time market rates with fully transparent bidding.",
    pricingDetail:
      "Every bid is broadcast live to all participants. No hidden premiums, no post-auction price changes. You always know exactly what you're paying and why.",
    pricingStat: "< 200ms",
    pricingStatLabel: "average bid latency",
    logisticsTitle: "Managed Logistics",
    logisticsCopy: "End-to-end delivery with real-time tracking and insurance.",
    logisticsDetail:
      "From farm to warehouse, we coordinate pickups, cold-chain storage, and last-mile delivery across 18 hubs. Every shipment is insured and GPS-tracked.",
    logisticsStat: "18 hubs",
    logisticsStatLabel: "across Bangladesh",
    paymentTitle: "Secure Payment",
    paymentCopy: "Escrow-based wallet system — funds held until delivery confirmed.",
    paymentDetail:
      "Buyer funds are locked in escrow at bid time and released to the seller only after delivery confirmation. Both parties are protected at every step.",
    paymentStat: "৳0 fraud",
    paymentStatLabel: "reported in 2025",
  },
  newsletter: {
    heading: "Stay updated on market trends",
    subheading: "Get daily price alerts and exclusive auction invitations.",
    placeholder: "Enter your email address",
    buttonText: "Subscribe now",
  },
};
