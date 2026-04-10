import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const DemandRadiusMap = ({ lat, lng, radiusKm, onLocationChange }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 10,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);

    const circle = L.circle([lat, lng], {
      radius: (radiusKm || 30) * 1000,
      color: '#f97316',
      fillColor: '#f97316',
      fillOpacity: 0.1,
      weight: 2,
      dashArray: '6, 6'
    }).addTo(map);

    map.fitBounds(circle.getBounds(), { padding: [20, 20] });

    const updatePosition = (latlng) => {
      marker.setLatLng(latlng);
      circle.setLatLng(latlng);
      onLocationChange(latlng.lat, latlng.lng);
    };

    marker.on('dragend', () => updatePosition(marker.getLatLng()));
    map.on('click', (e) => updatePosition(e.latlng));

    mapInstanceRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update circle radius when slider changes
  useEffect(() => {
    if (circleRef.current && radiusKm) {
      circleRef.current.setRadius(radiusKm * 1000);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.fitBounds(circleRef.current.getBounds(), { padding: [20, 20] });
      }
    }
  }, [radiusKm]);

  return (
    <div>
      <div ref={mapRef} style={{ height: '250px', width: '100%' }} data-testid="demand-radius-map" />
      <p className="text-xs text-gray-400 mt-1 px-1">
        Klikněte na mapu pro upřesnění místa. Oranžový kruh ukazuje okruh oslovených dodavatelů.
      </p>
    </div>
  );
};

export default DemandRadiusMap;
