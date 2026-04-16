import { Suspense } from "react";
import { searchParamsCache } from "~/lib/search-params";
import Sidebar from "~/app/_components/sidebar";
import CrimeMap from "~/app/_components/crime-map";
import { Card, CardContent, CardTitle, CardHeader } from "~/components/ui/card";
import TrendChart from "~/app/_components/trend-chart";

export default async function Home({ searchParams }: PageProps<"/">) {
  await searchParamsCache.parse(searchParams);

  return (
    <main className="grid h-dvh grid-rows-[minmax(0,3fr)_minmax(0,1fr)] gap-4 overflow-hidden p-4">
      <Card className="min-h-0 p-0">
        <CardContent className="grid h-full min-h-0 min-w-0 grid-cols-[minmax(0,3fr)_minmax(0,1fr)] p-0">
          <Suspense fallback={<div className="flex items-center justify-center">Loading...</div>}>
            <CrimeMap />
          </Suspense>
          <div className="min-h-0 overflow-auto">
            <Sidebar />
          </div>
        </CardContent>
      </Card>
      <Card className="min-h-0 p-0">
        <CardContent className="h-full min-h-0 min-w-0 p-0">
          <Suspense fallback={<div className="flex items-center justify-center">Loading...</div>}>
            <TrendChart />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
