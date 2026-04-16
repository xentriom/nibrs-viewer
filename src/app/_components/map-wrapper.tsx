"use client";

import dynamic from "next/dynamic";
import type { FeatureCollection, Geometry } from "geojson";

export type NibrsCountyProperties = {
  STATE: string;
  NAME: string;
  GEO_ID: string;
  OFFENSE_COUNT: number;
};

export type CrimeMapLeafletProps = {
  geojson: FeatureCollection<Geometry, NibrsCountyProperties>;
  maxOffenseCount: number;
};

const CrimeMapClient = dynamic(() => import("./map-container"), { ssr: false });

export default function MapWrapper({ geojson, maxOffenseCount }: CrimeMapLeafletProps) {
  return <CrimeMapClient geojson={geojson} maxOffenseCount={maxOffenseCount} />;
}
