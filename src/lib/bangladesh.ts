export const BANGLADESH_DISTRICTS = [
  "Bagerhat",
  "Bandarban",
  "Barguna",
  "Barishal",
  "Bhola",
  "Bogura",
  "Brahmanbaria",
  "Chandpur",
  "Chapainawabganj",
  "Chattogram",
  "Chuadanga",
  "Cox's Bazar",
  "Cumilla",
  "Dhaka",
  "Dinajpur",
  "Faridpur",
  "Feni",
  "Gaibandha",
  "Gazipur",
  "Gopalganj",
  "Habiganj",
  "Jamalpur",
  "Jashore",
  "Jhalokathi",
  "Jhenaidah",
  "Joypurhat",
  "Khagrachhari",
  "Khulna",
  "Kishoreganj",
  "Kurigram",
  "Kushtia",
  "Lakshmipur",
  "Lalmonirhat",
  "Madaripur",
  "Magura",
  "Manikganj",
  "Meherpur",
  "Moulvibazar",
  "Munshiganj",
  "Mymensingh",
  "Naogaon",
  "Narail",
  "Narayanganj",
  "Narsingdi",
  "Natore",
  "Netrokona",
  "Nilphamari",
  "Noakhali",
  "Pabna",
  "Panchagarh",
  "Patuakhali",
  "Pirojpur",
  "Rajbari",
  "Rajshahi",
  "Rangamati",
  "Rangpur",
  "Satkhira",
  "Shariatpur",
  "Sherpur",
  "Sirajganj",
  "Sunamganj",
  "Sylhet",
  "Tangail",
  "Thakurgaon",
] as const;

export type BangladeshDistrict = (typeof BANGLADESH_DISTRICTS)[number];

const districtSet = new Set<string>(BANGLADESH_DISTRICTS);

export function isBangladeshDistrict(value: string | null | undefined): value is BangladeshDistrict {
  return typeof value === "string" && districtSet.has(value);
}

export function normalizeDistrictName(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function parseBulkDistrictNames(value: string | string[] | null | undefined): string[] {
  const raw = Array.isArray(value) ? value.join("\n") : value ?? "";
  const names: string[] = [];
  const seen = new Set<string>();

  for (const part of raw.split(/[\n,]+/)) {
    const normalized = normalizeDistrictName(part);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    names.push(normalized);
  }

  return names;
}
