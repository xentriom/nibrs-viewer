import { Suspense } from "react";
import { fillForPositiveFraction, ZERO_FILL } from "~/lib/choropleth-scale";
import Filters from "./filters";

export default function Sidebar() {
  const low = fillForPositiveFraction(0);
  const high = fillForPositiveFraction(1);

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">NY NIBRS Viewer</h1>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Scale</h2>
        <div
          className="h-2 w-full rounded-sm border border-border"
          style={{
            background: `linear-gradient(to right, ${low}, ${high})`,
          }}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Lower</span>
          <span>Higher</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className="inline-block size-3 shrink-0 rounded-sm border border-border"
            style={{ backgroundColor: ZERO_FILL }}
            aria-hidden
          />
          <span>No offenses in county</span>
        </div>
      </div>

      <Filters />

      <div className="mt-auto space-y-2">
        <h3 className="font-semibold">Disclaimer</h3>
        <p className="text-xs text-muted-foreground">
          All the data are from the{" "}
          <a
            href="https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/downloads"
            className="text-primary"
          >
            FBI Crime Data Explorer
          </a>
          . Data is provided from them and all errors should be reported to them.
        </p>
        <p className="text-xs text-muted-foreground">
          This is made for learning purposes and is not intended to be used for any other purpose.
        </p>
        <p className="text-xs text-muted-foreground">
          &copy; <Suspense fallback={<span>....</span>}>{new Date().getFullYear()}</Suspense> Jason
          Chen. All rights reserved.
        </p>
      </div>
    </div>
  );
}
