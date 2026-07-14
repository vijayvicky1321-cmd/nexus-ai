import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PLANS = [
  { name: "Free", price: "$0", blurb: "Try AI Chat and PDF Chat." },
  { name: "Pro", price: "$20/mo", blurb: "Unlocks every module as it ships." },
  { name: "Team", price: "Contact us", blurb: "Team Workspaces, admin controls, SSO." },
];

export default function PricingPage() {
  return (
    <div className="flex flex-1 flex-col items-center gap-10 px-6 py-20">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold">Pricing</h1>
        <p className="text-muted-foreground">
          Billing is not live yet &mdash; this page is a placeholder for the Stripe integration.
        </p>
      </div>
      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <Card key={plan.name}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <span className="text-2xl font-semibold">{plan.price}</span>
              <p className="text-sm text-muted-foreground">{plan.blurb}</p>
              <Button variant="outline" render={<Link href="/sign-up">Get started</Link>} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
