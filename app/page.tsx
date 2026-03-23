import { loadSearchParams } from "~/lib/search-params";

export default async function Home({ searchParams }: PageProps<"/">) {
  const parsedSearchParams = loadSearchParams(searchParams);

  return (
    <main className="grid min-h-dvh grid-rows-[3fr_1fr] gap-4 bg-background p-4 text-foreground">
      <div className="grid grid-cols-[3fr_1fr] gap-4 rounded-md">
        <div>map section</div>
        <div className="rounded-md">table section</div>
      </div>
      <div className="rounded-md">graph section</div>
    </main>
  );
}
