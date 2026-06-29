import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

interface LocationPinMapProps {
  latitude?: number;
  longitude?: number;
  onPick: (latitude: number, longitude: number) => void;
}

const DEFAULT_CENTER: [number, number] = [22.9734, 78.6569];

function MapClickHandler({
  onPick,
}: {
  onPick: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onPick(
        Number(event.latlng.lat.toFixed(6)),
        Number(event.latlng.lng.toFixed(6)),
      );
    },
  });

  return null;
}

function RecenterMap({
  latitude,
  longitude,
}: {
  latitude?: number;
  longitude?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (latitude != null && longitude != null) {
      map.setView([latitude, longitude], 16);
    }
  }, [latitude, longitude, map]);

  return null;
}

export function LocationPinMap({
  latitude,
  longitude,
  onPick,
}: LocationPinMapProps) {
  const hasSelectedLocation =
    latitude != null && longitude != null;

  const center: [number, number] = hasSelectedLocation
    ? [latitude, longitude]
    : DEFAULT_CENTER;

  return (
    <div className="pin-map-card">
      <div className="pin-map-header">
        <strong>Pin issue location</strong>
        <small>
          Click directly on the map where the civic issue is located.
        </small>
      </div>

      <MapContainer
        center={center}
        zoom={hasSelectedLocation ? 16 : 5}
        scrollWheelZoom
        className="pin-location-map"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onPick={onPick} />
        <RecenterMap latitude={latitude} longitude={longitude} />

        {hasSelectedLocation && (
          <CircleMarker
            center={[latitude, longitude]}
            radius={10}
            pathOptions={{
              color: "#047857",
              fillColor: "#10b981",
              fillOpacity: 0.9,
              weight: 3,
            }}
          />
        )}
      </MapContainer>

      {hasSelectedLocation ? (
        <p className="pin-map-status">
          ✓ Pinned location selected: {latitude}, {longitude}
        </p>
      ) : (
        <p className="pin-map-status">
          Click anywhere on the map to select the issue location.
        </p>
      )}
    </div>
  );
}