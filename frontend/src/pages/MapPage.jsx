import { useEffect, useState } from "react";
import { api, formatErr } from "@/lib/api";
import Layout from "@/components/Layout";
import MapView from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MapPin, Polygon, MapTrifold } from "@phosphor-icons/react";

export default function MapPage() {
  const [markers, setMarkers] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const [drawMode, setDrawMode] = useState(false);
  const [pendingShape, setPendingShape] = useState(null);
  const [name, setName] = useState("");

  const load = async () => {
    const m = await api.get("/map/markers").then(r => r.data).catch(() => []);
    const g = await api.get("/geo").then(r => r.data).catch(() => []);
    setMarkers(m);
    setPolygons(
      (g || [])
        .filter(x => x.type === "polygon" && x.coordinates?.type === "Polygon")
        .map(x => ({ id: x.id, name: x.name, type: "geo", geojson: x.coordinates }))
    );
  };
  useEffect(() => { load(); }, []);

  const onShape = (shape) => { setPendingShape(shape); setName(""); };

  const save = async () => {
    if (!pendingShape) return;
    try {
      const payload = pendingShape.type === "polygon"
        ? { name: name || "Polygon", type: "polygon", coordinates: pendingShape.geojson }
        : { name: name || "Point", type: "point", coordinates: { lat: pendingShape.lat, lng: pendingShape.lng } };
      await api.post("/geo", payload);
      setPendingShape(null); toast.success("Location saved"); load();
    } catch (e) { toast.error(formatErr(e.response?.data?.detail)); }
  };

  return (
    <Layout title="Geo & Map" subtitle="GIS / Project locations · Polygon-aware"
      actions={
        <Button data-testid="map-toggle-draw" onClick={() => setDrawMode(d => !d)}
          className={drawMode ? "bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm" : "bg-white text-[#0A3B2A] border border-[#0A3B2A]/20 hover:bg-[#F0F4F2] rounded-sm"}>
          <Polygon size={16} className="mr-1" />{drawMode ? "Exit draw mode" : "Draw shape"}
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-sm overflow-hidden">
          <div className="h-[640px]">
            <MapView markers={markers} polygons={polygons} height="640px" drawMode={drawMode} onShapeCreated={onShape} />
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#0A3B2A] font-bold mb-2">Inventory</div>
          <h3 className="font-display text-lg font-medium mb-4">{markers.length + polygons.length} pinned</h3>
          {drawMode && (
            <div className="bg-[#F0F4F2] border border-[#0A3B2A]/20 p-3 rounded-sm text-xs text-[#0A3B2A] mb-3">
              <strong>Draw mode:</strong> use the right-side toolbar to draw a polygon, rectangle, or pin marker.
            </div>
          )}
          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-2">
            {markers.length + polygons.length === 0 && <div className="text-sm text-slate-400">No locations yet. Toggle Draw and create one.</div>}
            {markers.map(m => (
              <div key={m.id + m.type} className="border-b border-slate-100 pb-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">{m.type}</div>
                <div className="text-sm font-medium flex items-center gap-1"><MapPin size={12} className="text-[#0A3B2A]" />{m.name}</div>
                <div className="text-xs text-slate-500">{m.lat?.toFixed?.(3)}, {m.lng?.toFixed?.(3)}</div>
              </div>
            ))}
            {polygons.map(p => (
              <div key={p.id} className="border-b border-slate-100 pb-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">polygon</div>
                <div className="text-sm font-medium flex items-center gap-1"><Polygon size={12} className="text-[#0A3B2A]" />{p.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!pendingShape} onOpenChange={(o) => !o && setPendingShape(null)}>
        <DialogContent className="rounded-sm max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Name this location</DialogTitle></DialogHeader>
          <div className="py-2">
            <Label>Name</Label>
            <Input data-testid="shape-name-input" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder={pendingShape?.type === "polygon" ? "Boundary name…" : "Point name…"} />
            <div className="text-xs text-slate-500 mt-2 capitalize">{pendingShape?.type}</div>
          </div>
          <DialogFooter><Button onClick={save} className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm" data-testid="save-shape-btn">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
