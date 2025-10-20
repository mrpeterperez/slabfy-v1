import { usePageTitle } from "@/hooks/use-page-title";

export default function AIAgentPage() {
  usePageTitle('AI Agent');

  return (
    <div className="min-h-[calc(100dvh-4rem)] pb-20 px-4 sm:px-6 md:px-8">
      <div className="max-w-screen-md mx-auto pt-6">
        <h1 className="text-2xl font-semibold tracking-tight">AI Agent</h1>
        <p className="text-muted-foreground mt-1">
          Coming soon. Your on-the-floor assistant for comps, counteroffers, and inventory intel.
        </p>

        <div className="mt-6 rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">
            Placeholder page. Wire your agent UI here.
          </div>
        </div>
      </div>
    </div>
  );
}
