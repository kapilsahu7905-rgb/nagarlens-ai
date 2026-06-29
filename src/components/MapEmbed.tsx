import type { IssueLocation, Language } from "../types";
import { useText } from "../i18n";

export function MapEmbed({ location, language }: { location: IssueLocation; language: Language }) {
  const t = useText(language);
  if (location.latitude == null || location.longitude == null) {
    return <div className="map-placeholder"><span>🗺️</span><p>{location.address || "Location not available"}</p></div>;
  }
  const delta = 0.007;
  const bbox = [location.longitude - delta, location.latitude - delta, location.longitude + delta, location.latitude + delta].join(",");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`;
  return (
    <div className="map-wrap">
      <iframe title={t.map} src={src} loading="lazy" referrerPolicy="no-referrer" />
      <a href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=17/${location.latitude}/${location.longitude}`} target="_blank" rel="noreferrer">Open in OpenStreetMap ↗</a>
    </div>
  );
}
