import fs from "fs";
import path from "path";

export type LotOptions = {
  productNames: string[];
  categories: string[];
  storageTypes: string[];
  baggageTypes: string[];
};

const DATA_PATH = path.join(process.cwd(), "data", "lot-options.json");

const DEFAULTS: LotOptions = {
  productNames: [
    "Miniket Rice", "BRRI Dhan 28", "BRRI Dhan 29", "Najirshail Rice", "Chinigura Rice",
    "Tomato", "Potato", "Onion", "Garlic", "Ginger",
    "Brinjal / Eggplant", "Cauliflower", "Cabbage", "Bitter Gourd", "Bottle Gourd",
    "Mango", "Banana", "Papaya", "Jackfruit", "Pineapple", "Lychee", "Guava",
    "Hilsa Fish", "Rohu Fish", "Catla Fish", "Prawn / Shrimp",
    "Mustard Oil", "Soybean Oil", "Coconut",
    "Red Lentil (Masoor Dal)", "Chickpea (Chola)", "Black Gram (Mashkalai)",
    "Coriander / Dhania", "Turmeric", "Chili (Dry)", "Black Pepper", "Cumin",
    "Jute", "Cotton", "Wheat", "Maize / Corn",
    "Milk (Cow)", "Egg (Poultry)", "Honey", "Other",
  ],
  categories: [
    "Rice", "Vegetables", "Fruits", "Garments", "Electronics",
    "Dry goods", "Spices", "Oil", "Pulses", "Fish & Seafood",
    "Dairy & Eggs", "Grains & Cereals", "Other",
  ],
  storageTypes: [
    "Ambient / Room Temperature",
    "Cool & Dry Warehouse",
    "Cold Storage (0–4 °C)",
    "Frozen Storage (≤ −18 °C)",
    "Ventilated Shed",
    "Humidity-Controlled Room",
    "Silo / Bulk Grain Store",
  ],
  baggageTypes: [
    "Jute Bag (50 kg)",
    "Polypropylene (PP) Bag",
    "HDPE Woven Sack",
    "Cardboard Box",
    "Wooden Crate",
    "Plastic Crate",
    "Gunny Bag",
    "Vacuum Pack",
    "Net Bag",
    "Loose / Bulk (no packaging)",
  ],
};

export function readLotOptions(): LotOptions {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<LotOptions>;
    return {
      productNames: parsed.productNames ?? DEFAULTS.productNames,
      categories:   parsed.categories   ?? DEFAULTS.categories,
      storageTypes:  parsed.storageTypes  ?? DEFAULTS.storageTypes,
      baggageTypes:  parsed.baggageTypes  ?? DEFAULTS.baggageTypes,
    };
  } catch {
    return DEFAULTS;
  }
}

export function writeLotOptions(options: LotOptions): void {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(options, null, 2));
}
