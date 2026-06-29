import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { CommunityIssue, Severity } from "../types";

interface CommunityMapProps {
  issues: CommunityIssue[];
  onOpen: (issue: CommunityIssue) => void;
}

function getSeverityColor(severity: Severity): string {
  switch (severity) {
    case "Critical":
      return "#991b1b";
    case "High":
      return "#ea580c";
    case "Medium":
      return "#ca8a04";
    case "Low":
      return "#15803d";
    default:
      return "#0f766e";
  }
}

export function CommunityMap({ issues, onOpen }: CommunityMapProps) {
  const mappedIssues = issues.filter(
    (issue) => issue.location.latitude != null && issue.location.longitude != null,
  );
  const defaultCenter: [number, number] = mappedIssues.length
    ? [mappedIssues[0].location.latitude!, mappedIssues[0].location.longitude!]
    : [26.8467, 80.9462];

  if (!mappedIssues.length) {
    return (
      <div className="community-map-empty">
        <span>🗺️</span>
        <div>
          <strong>No mapped reports yet</strong>
          <p>Reports using current location or photo GPS will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="community-map">
      <MapContainer center={defaultCenter} zoom={12} scrollWheelZoom={false} className="community-map-container">
        <TileLayer
          attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mappedIssues.map((issue) => (
          <CircleMarker
            key={issue.id}
            center={[issue.location.latitude!, issue.location.longitude!]}
            radius={issue.analysis.severity === "Critical" ? 13 : issue.analysis.severity === "High" ? 11 : 9}
            pathOptions={{
              color: getSeverityColor(issue.analysis.severity),
              fillColor: getSeverityColor(issue.analysis.severity),
              fillOpacity: 0.82,
              weight: 3,
            }}
          >
            <Popup>
              <div className="map-popup">
                <span className="map-popup-category">{issue.analysis.category}</span>
                <strong>{issue.analysis.title}</strong>
                <p>{issue.location.address}</p>
                <div className="map-popup-meta">
                  <span>{issue.analysis.severity}</span>
                  <span>{issue.status}</span>
                </div>
                <button type="button" onClick={() => onOpen(issue)}>Open report</button>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
