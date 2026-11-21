import { useEffect, useState } from "react";
import { api, formatErr, API } from "@/lib/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, FilePdf, QrCode, Trash } from "@phosphor-icons/react";

const RECORD_TYPES = ["input", "fertilizer", "pesticide", "irrigation", "harvest"];
const CERTIFICATIONS = ["pending", "GAP", "Rainforest Alliance", "Organic", "Fair Trade", "GlobalGAP"];

export default function Traceability() {
  return (
    <Layout title="Traceability" subtitle="Farm-to-buyer chain">
      <Tabs defaultValue="farms">
        <TabsList className="bg-white border border-slate-200 rounded-sm">
          <TabsTrigger value="farms" data-testid="tab-farms">Farms / Suppliers</TabsTrigger>
          <TabsTrigger value="batches" data-testid="tab-batches">Batches & QR</TabsTrigger>
        </TabsList>
        <TabsContent value="farms"><Farms /></TabsContent>
        <TabsContent value="batches"><Batches /></TabsContent>
      </Tabs>
    </Layout>
  );
}

function Farms() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({ farmer_name: "", farm_name: "", crop: "", area_hectares: "", certification: "", lat: "", lng: "" });
  const load = () => api.get("/farms").then(r => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      const payload = {
        farmer_name: form.farmer_name, farm_name: form.farm_name, crop: form.crop,
        area_hectares: form.area_hectares ? Number(form.area_hectares) : null,
        certification: form.certification || null,
        location: form.lat && form.lng ? { lat: Number(form.lat), lng: Number(form.lng) } : null,
      };
      await api.post("/farms", payload);
      setOpen(false);
      setForm({ farmer_name: "", farm_name: "", crop: "", area_hectares: "", certification: "", lat: "", lng: "" });
      load(); toast.success("Farm created");
    } catch (e) { toast.error(formatErr(e.response?.data?.detail)); }
  };
  const remove = async (id) => { if (!confirm("Delete?")) return; await api.delete(`/farms/${id}`); load(); };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-farm-btn" className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm"><Plus size={16} className="mr-1" />Register Farm</Button>
          </DialogTrigger>
          <DialogContent className="rounded-sm max-w-lg">
            <DialogHeader><DialogTitle className="font-display">Register Farm / Supplier</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div><Label>Farmer name</Label><Input data-testid="farm-farmer" value={form.farmer_name} onChange={e => setForm({ ...form, farmer_name: e.target.value })} /></div>
              <div><Label>Farm name</Label><Input value={form.farm_name} onChange={e => setForm({ ...form, farm_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Crop</Label><Input value={form.crop} onChange={e => setForm({ ...form, crop: e.target.value })} /></div>
                <div><Label>Area (hectares)</Label><Input type="number" step="any" value={form.area_hectares} onChange={e => setForm({ ...form, area_hectares: e.target.value })} /></div>
              </div>
              <div>
                <Label>Certification</Label>
                <Select value={form.certification} onValueChange={(v) => setForm({ ...form, certification: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{CERTIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Latitude</Label><Input data-testid="farm-lat" type="number" step="any" value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} /></div>
                <div><Label>Longitude</Label><Input data-testid="farm-lng" type="number" step="any" value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button data-testid="farm-create-submit" onClick={create} className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm">Register</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-5 py-3 border-b border-slate-200">Farmer</th>
              <th className="text-left px-5 py-3 border-b border-slate-200">Crop</th>
              <th className="text-left px-5 py-3 border-b border-slate-200">Area</th>
              <th className="text-left px-5 py-3 border-b border-slate-200">Cert</th>
              <th className="text-left px-5 py-3 border-b border-slate-200">GPS</th>
              <th className="px-5 py-3 border-b border-slate-200"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-400">No farms yet</td></tr>}
            {items.map(f => (
              <tr key={f.id} className="border-b border-slate-200 hover:bg-[#F0F4F2]">
                <td className="px-5 py-3 font-medium">{f.farmer_name}<div className="text-xs text-slate-500">{f.farm_name}</div></td>
                <td className="px-5 py-3 text-slate-600">{f.crop || "—"}</td>
                <td className="px-5 py-3 text-slate-600">{f.area_hectares ? `${f.area_hectares} ha` : "—"}</td>
                <td className="px-5 py-3"><span className="text-xs bg-[#F0F4F2] text-[#0A3B2A] px-2 py-0.5 rounded-sm">{f.certification || "—"}</span></td>
                <td className="px-5 py-3 text-xs text-slate-500">{f.location?.lat ? `${f.location.lat.toFixed(3)}, ${f.location.lng.toFixed(3)}` : "—"}</td>
                <td className="px-5 py-3 text-right">
                  <Button variant="outline" size="sm" onClick={() => setActive(f)} className="mr-2 rounded-sm" data-testid={`records-${f.id}`}>Records</Button>
                  <button onClick={() => remove(f.id)} className="text-slate-400 hover:text-red-600"><Trash size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {active && <FarmRecords farm={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function FarmRecords({ farm, onClose }) {
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({ record_type: "input", date: "", description: "", quantity: "", unit: "" });
  const load = () => api.get(`/farms/${farm.id}/records`).then(r => setRecords(r.data)).catch(() => {});
  useEffect(() => { load(); }, [farm.id]);

  const add = async () => {
    try {
      await api.post(`/farms/${farm.id}/records`, {
        farm_id: farm.id,
        ...form, quantity: form.quantity ? Number(form.quantity) : null,
      });
      setForm({ record_type: "input", date: "", description: "", quantity: "", unit: "" });
      load(); toast.success("Record added");
    } catch (e) { toast.error(formatErr(e.response?.data?.detail)); }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="rounded-sm max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Field Records — {farm.farmer_name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="bg-[#F9FAFB] border border-slate-200 p-4 rounded-sm grid grid-cols-1 md:grid-cols-5 gap-2">
            <Select value={form.record_type} onValueChange={v => setForm({ ...form, record_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RECORD_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            <Input placeholder="Description" className="md:col-span-1" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2 md:col-span-1">
              <Input type="number" step="any" placeholder="Qty" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
              <Input placeholder="Unit" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
            </div>
            <Button onClick={add} className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm" data-testid="add-record-btn">Add</Button>
          </div>
          <div className="border border-slate-200 rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wider text-slate-500">
                <tr><th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Desc</th><th className="text-left px-3 py-2">Qty</th></tr>
              </thead>
              <tbody>
                {records.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-slate-400 text-xs">No records</td></tr>}
                {records.map(r => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-xs text-slate-500">{r.date || "—"}</td>
                    <td className="px-3 py-2"><span className="text-xs bg-[#F0F4F2] px-2 py-0.5 rounded-sm">{r.record_type}</span></td>
                    <td className="px-3 py-2 text-slate-700">{r.description || "—"}</td>
                    <td className="px-3 py-2 text-slate-700">{r.quantity ? `${r.quantity} ${r.unit || ""}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Batches() {
  const [items, setItems] = useState([]);
  const [farms, setFarms] = useState([]);
  const [open, setOpen] = useState(false);
  const [qrFor, setQrFor] = useState(null);
  const [form, setForm] = useState({
    product_name: "", farm_id: "", quantity: "", unit: "kg",
    harvest_date: "", processing_unit: "", storage_location: "", transport_info: "",
    buyer: "", certification_status: "pending", sustainability_score: "", carbon_footprint: ""
  });
  const load = () => api.get("/batches").then(r => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); api.get("/farms").then(r => setFarms(r.data)).catch(() => {}); }, []);

  const create = async () => {
    try {
      const payload = {
        ...form,
        quantity: form.quantity ? Number(form.quantity) : null,
        sustainability_score: form.sustainability_score ? Number(form.sustainability_score) : null,
        carbon_footprint: form.carbon_footprint ? Number(form.carbon_footprint) : null,
        farm_id: form.farm_id || null,
      };
      await api.post("/batches", payload);
      setOpen(false);
      load(); toast.success("Batch created");
    } catch (e) { toast.error(formatErr(e.response?.data?.detail)); }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-batch-btn" className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm"><Plus size={16} className="mr-1" />New Batch</Button>
          </DialogTrigger>
          <DialogContent className="rounded-sm max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Create Batch</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
              <div><Label>Product</Label><Input data-testid="batch-product" value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} /></div>
              <div>
                <Label>Source farm</Label>
                <Select value={form.farm_id} onValueChange={v => setForm({ ...form, farm_id: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{farms.map(f => <SelectItem key={f.id} value={f.id}>{f.farmer_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Quantity</Label><Input type="number" step="any" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
              <div><Label>Unit</Label><Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
              <div><Label>Harvest date</Label><Input type="date" value={form.harvest_date} onChange={e => setForm({ ...form, harvest_date: e.target.value })} /></div>
              <div><Label>Processing unit</Label><Input value={form.processing_unit} onChange={e => setForm({ ...form, processing_unit: e.target.value })} /></div>
              <div><Label>Storage</Label><Input value={form.storage_location} onChange={e => setForm({ ...form, storage_location: e.target.value })} /></div>
              <div><Label>Transport</Label><Input value={form.transport_info} onChange={e => setForm({ ...form, transport_info: e.target.value })} /></div>
              <div><Label>Buyer</Label><Input value={form.buyer} onChange={e => setForm({ ...form, buyer: e.target.value })} /></div>
              <div>
                <Label>Certification status</Label>
                <Select value={form.certification_status} onValueChange={v => setForm({ ...form, certification_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CERTIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Sustainability score (0-100)</Label><Input type="number" value={form.sustainability_score} onChange={e => setForm({ ...form, sustainability_score: e.target.value })} /></div>
              <div><Label>Carbon footprint (kg CO2e)</Label><Input type="number" step="any" value={form.carbon_footprint} onChange={e => setForm({ ...form, carbon_footprint: e.target.value })} /></div>
            </div>
            <DialogFooter><Button data-testid="batch-create-submit" onClick={create} className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm">Create Batch</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-5 py-3 border-b border-slate-200">Batch</th>
              <th className="text-left px-5 py-3 border-b border-slate-200">Product</th>
              <th className="text-left px-5 py-3 border-b border-slate-200">Quantity</th>
              <th className="text-left px-5 py-3 border-b border-slate-200">Cert</th>
              <th className="text-left px-5 py-3 border-b border-slate-200">Score</th>
              <th className="px-5 py-3 border-b border-slate-200"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-400">No batches yet</td></tr>}
            {items.map(b => (
              <tr key={b.id} className="border-b border-slate-200 hover:bg-[#F0F4F2]">
                <td className="px-5 py-3 font-mono text-xs">{b.id.slice(0, 8)}</td>
                <td className="px-5 py-3 font-medium">{b.product_name}</td>
                <td className="px-5 py-3 text-slate-600">{b.quantity ? `${b.quantity} ${b.unit}` : "—"}</td>
                <td className="px-5 py-3"><span className="text-xs bg-[#F0F4F2] text-[#0A3B2A] px-2 py-0.5 rounded-sm">{b.certification_status}</span></td>
                <td className="px-5 py-3 text-slate-600">{b.sustainability_score ?? "—"}</td>
                <td className="px-5 py-3 text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setQrFor(b)} className="rounded-sm" data-testid={`qr-${b.id}`}><QrCode size={14} className="mr-1" />QR</Button>
                  <a href={`${API}/batches/${b.id}/audit.pdf`} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="rounded-sm" data-testid={`audit-${b.id}`}><FilePdf size={14} className="mr-1" />Audit PDF</Button>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {qrFor && (
        <Dialog open={true} onOpenChange={() => setQrFor(null)}>
          <DialogContent className="rounded-sm max-w-md text-center">
            <DialogHeader><DialogTitle className="font-display">Batch QR — {qrFor.product_name}</DialogTitle></DialogHeader>
            <div className="flex flex-col items-center gap-3 py-4">
              <img alt="QR" data-testid="batch-qr-image" src={`${API}/batches/${qrFor.id}/qr.png`} className="w-64 h-64 border border-slate-200 rounded-sm" />
              <div className="text-xs font-mono text-slate-500">{qrFor.id}</div>
              <a href={`${window.location.origin}/trace/${qrFor.id}`} target="_blank" rel="noreferrer" className="text-sm text-[#0A3B2A] font-medium hover:underline">
                Open public page →
              </a>
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/trace/${qrFor.id}`); toast.success("Link copied"); }}
                className="text-xs text-slate-500 hover:text-slate-700">Copy public link</button>
              <div className="text-sm text-slate-600">Scan to view product origin & sustainability story.</div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
