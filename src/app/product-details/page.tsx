import { redirect } from "next/navigation";

// /product-details → redirect to marketplace; individual lots use /product-details/[id]
export default function ProductDetailsIndexPage() {
  redirect("/marketplace");
}
