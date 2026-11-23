"use client";

import { GeoJSON, TileLayer, MapContainer as LeafletMapContainer } from "react-leaflet";
import { fillForCount } from "~/lib/choropleth-scale";
import type { CrimeMapLeafletProps } from "./map-wrapper";

export default function MapContainer({ geojson, maxOffenseCount }: CrimeMapLeafletProps) {
  return (
    <LeafletMapContainer center={[42.8, -75.5]} zoom={7} className="h-full w-full" zoomControl>
      <TileLayer
        attribution='Sources: Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, and the GIS user community'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
      />
      <GeoJSON
        key={`${geojson.features.length}-${maxOffenseCount}`}
        data={geojson}
        style={(feature) => {
          const count = feature?.properties.OFFENSE_COUNT ?? 0;
          return {
            color: "#686868",
            weight: 1,
            opacity: 1,
            fillColor: fillForCount(count, maxOffenseCount),
            fillOpacity: 0.85,
          };
        }}
        onEachFeature={(feature, layer) => {
          const name = feature.properties.NAME ?? "County";
          const count = feature.properties.OFFENSE_COUNT ?? 0;

          layer.bindTooltip(`${name}: ${count.toLocaleString()} offense${count === 1 ? "" : "s"}`, {
            sticky: true,
            direction: "top",
          });
        }}
      />
    </LeafletMapContainer>
  );
}
