export default function Home() {
  return (
    <main className="grid h-dvh grid-rows-[3fr_1fr] gap-4 p-4">
      <div className="grid grid-cols-[3fr_1fr] rounded-md">
        <div className="rounded-md">map</div>
        <div className="rounded-md bg-sidebar">controls</div>
      </div>
      <div className="rounded-md bg-sidebar">graph</div>
    </main>
  );
}
