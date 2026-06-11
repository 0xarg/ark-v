import { redirect } from "next/navigation";

// Billing is now consolidated into the Subscription page.
export default function BillingPage() {
  redirect("/subscription");
}
