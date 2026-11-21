import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const BRAND = "#0A3B2A";
const TYPE_COLORS = {
  farm: "#166534", carbon: BRAND, project: "#1A365D",
  lca: "#5C8DB8", geo: "#B45309",
};

function makeIcon(color) {
  return L.divIcon({
    className: "custom-pin",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

const markerPopup = (m) =>
  `<div style="font-family:'IBM Plex Sans',sans-serif;min-width:160px"><div style="font-weight:600;color:${BRAND};text-transform:uppercase;font-size:10px;letter-spacing:0.1em;margin-bottom:4px">${esc(m.type)}</div><div style="font-weight:500;font-size:13px">${esc(m.name)}</div>${m.subtitle ? `<div style="font-size:11px;color:#64748b;margin-top:2px">${esc(m.subtitle)}</div>` : ""}</div>`;

const polygonPopup = (p) =>
  `<div style="font-family:'IBM Plex Sans',sans-serif"><div style="font-weight:500;font-size:13px">${esc(p.name || "Polygon")}</div></div>`;

function closedRing(layer) {
  const ring = layer.getLatLngs()[0].map(p => [p.lng, p.lat]);
  const [first, last] = [ring[0], ring.at(-1)];
  if (ring.length && (first[0] !== last[0] || first[1] !== last[1])) ring.push(first);
  return ring;
}

function shapeFromDrawEvent(e) {
  if (e.layerType === "polygon" || e.layerType === "rectangle") {
    return {
      type: "polygon",
      geojson: { type: "Polygon", coordinates: [closedRing(e.layer)] },
      center: e.layer.getBounds().getCenter(),
    };
  }
  if (e.layerType === "marker") {
    const ll = e.layer.getLatLng();
    return { type: "point", lat: ll.lat, lng: ll.lng };
  }
  return null;
}

function addMarkers(group, markers, bounds) {
  markers.forEach((m) => {
    if (m.lat == null || m.lng == null) return;
    L.marker([m.lat, m.lng], { icon: makeIcon(TYPE_COLORS[m.type] || BRAND) })
      .bindPopup(markerPopup(m)).addTo(group);
    bounds.push([m.lat, m.lng]);
  });
}

function addPolygons(group, polygons, bounds) {
  polygons.forEach((p) => {
    if (!p.geojson) return;
    try {
      const layer = L.geoJSON(p.geojson, { style: { color: TYPE_COLORS[p.type] || BRAND, weight: 2, fillOpacity: 0.15 } });
      layer.bindPopup(polygonPopup(p)).addTo(group);
      layer.eachLayer(l => bounds.push(...l.getLatLngs()[0].map(c => [c.lat, c.lng])));
    } catch (err) {
      console.warn("Skipping invalid polygon geometry:", p?.name, err?.message || err);
    }
  });
}

function buildDrawControl(featureGroup) {
  const shape = { color: BRAND, weight: 2 };
  return new L.Control.Draw({
    position: "topright",
    edit: { featureGroup, remove: true },
    draw: {
      polyline: false, circle: false, circlemarker: false,
      polygon: { allowIntersection: false, showArea: true, shapeOptions: shape },
      rectangle: { shapeOptions: shape },
      marker: { icon: makeIcon(BRAND) },
    },
  });
}

function useLeafletMap(containerRef, center, zoom, onMapClick, onShapeCreated) {
  const map = useRef(null);
  const layers = useRef(null);
  const drawn = useRef(null);
  const callbacks = useRef({});
  callbacks.current = { onMapClick, onShapeCreated };

  useEffect(() => {
    if (!containerRef.current || map.current) return;
    const m = L.map(containerRef.current).setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors", maxZoom: 19,
    }).addTo(m);
    layers.current = L.layerGroup().addTo(m);
    drawn.current = new L.FeatureGroup().addTo(m);
    m.on("click", (e) => callbacks.current.onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
    m.on(L.Draw.Event.CREATED, (e) => {
      drawn.current.addLayer(e.layer);
      const shape = shapeFromDrawEvent(e);
      if (shape) callbacks.current.onShapeCreated?.(shape);
    });
    map.current = m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { map, layers, drawn };
}

function useDrawControl(map, drawn, drawMode) {
  const ctrl = useRef(null);
  useEffect(() => {
    if (!map.current) return;
    if (drawMode && !ctrl.current) {
      ctrl.current = buildDrawControl(drawn.current);
      map.current.addControl(ctrl.current);
    } else if (!drawMode && ctrl.current) {
      map.current.removeControl(ctrl.current);
      ctrl.current = null;
    }
  }, [map, drawn, drawMode]);
}

function useMapLayers(map, layers, drawn, markers, polygons, drawMode) {
  useEffect(() => {
    if (!map.current || !layers.current) return;
    layers.current.clearLayers();
    drawn.current?.clearLayers();
    const bounds = [];
    addMarkers(layers.current, markers, bounds);
    addPolygons(layers.current, polygons, bounds);
    if (!bounds.length || drawMode) return;
    try { map.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 }); } catch (err) {
      console.debug("fitBounds skipped:", err?.message || err);
    }
  }, [map, layers, drawn, markers, polygons, drawMode]);
}

export default function MapView({
  markers = [], polygons = [], height = "500px", center = [20, 0], zoom = 2,
  onMapClick, drawMode = false, onShapeCreated,
}) {
  const ref = useRef(null);
  const { map, layers, drawn } = useLeafletMap(ref, center, zoom, onMapClick, onShapeCreated);
  useDrawControl(map, drawn, drawMode);
  useMapLayers(map, layers, drawn, markers, polygons, drawMode);
  return <div ref={ref} style={{ height, width: "100%", borderRadius: "2px", overflow: "hidden" }} data-testid="map-container" />;
}
