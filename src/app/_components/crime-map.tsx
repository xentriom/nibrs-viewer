import type { FeatureCollection, GeoJsonObject, Geometry } from "geojson";
import { getOffenseCountByCounty } from "~/lib/offense-counts";
import { searchParamsCache } from "~/lib/search-params";
import MapWrapper, { type NibrsCountyProperties } from "./map-wrapper";

const GEOJSON_URL =
  "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json";

export default async function CrimeMap() {
  const filters = searchParamsCache.all();
  const counts = await getOffenseCountByCounty(filters);

  const res = await fetch(GEOJSON_URL);
  const data = (await res.json()) as GeoJsonObject;

  if (data.type !== "FeatureCollection" || !("features" in data)) {
    return null;
  }

  // only get features for New York state
  const fc = data as FeatureCollection<Geometry, { STATE: string; NAME: string; GEO_ID: string }>;
  const ny: FeatureCollection<Geometry, NibrsCountyProperties> = {
    type: "FeatureCollection",
    features: fc.features
      .filter((f) => f.properties.STATE === "36")
      .map((f) => {
        const key = f.properties.NAME.toUpperCase().replaceAll(".", "").replace(/\s+/g, " ").trim();
        const offenseCount = counts.get(key) ?? 0;
        return {
          ...f,
          properties: {
            ...f.properties,
            OFFENSE_COUNT: offenseCount,
          },
        };
      }),
  };

  let maxOffenseCount = 0;
  for (const f of ny.features) {
    const count = f.properties.OFFENSE_COUNT ?? 0;
    if (count > maxOffenseCount) maxOffenseCount = count;
  }

  return <MapWrapper geojson={ny} maxOffenseCount={maxOffenseCount} />;
}
