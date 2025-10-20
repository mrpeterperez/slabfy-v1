// 🤖 INTERNAL NOTE:
// Purpose: Route-level Portfolio page now delegates entirely to the v0 my-portfolio feature.
// Exports: default PortfolioPage
// Feature: my-portfolio-v0
// Dependencies: auth-provider (user id), my-portfolio-v0 PortfolioPageV0

import { PortfolioPageV0 } from "@/features/my-portfolio-v0";

export default function PortfolioPage() {
  return <PortfolioPageV0 />;
}