import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export const REGION_PRESETS = {
  global: { label: "Global", currency: "USD", locale: "en-US", units: "metric", framework: "GRI" },
  us: { label: "United States", currency: "USD", locale: "en-US", units: "imperial", framework: "SASB" },
  uk: { label: "United Kingdom", currency: "GBP", locale: "en-GB", units: "metric", framework: "GRI" },
  eu: { label: "European Union", currency: "EUR", locale: "de-DE", units: "metric", framework: "CSRD" },
  in: { label: "India", currency: "INR", locale: "en-IN", units: "metric", framework: "BRSR" },
  br: { label: "Brazil", currency: "BRL", locale: "pt-BR", units: "metric", framework: "GRI" },
  au: { label: "Australia", currency: "AUD", locale: "en-AU", units: "metric", framework: "GRI" },
  jp: { label: "Japan", currency: "JPY", locale: "ja-JP", units: "metric", framework: "GRI" },
  za: { label: "South Africa", currency: "ZAR", locale: "en-ZA", units: "metric", framework: "GRI" },
  sg: { label: "Singapore", currency: "SGD", locale: "en-SG", units: "metric", framework: "GRI" },
  ae: { label: "United Arab Emirates", currency: "AED", locale: "ar-AE", units: "metric", framework: "GRI" },
};

// Indicative display rates from USD; billing is always charged in USD
export const USD_RATES = { USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.5, BRL: 5.1, AUD: 1.52, JPY: 151, ZAR: 18.4, SGD: 1.35, AED: 3.67 };

const UNITS = {
  metric: { mass: ["kg", 1], water: ["m³", 1], energy: ["MJ", 1] },
  imperial: { mass: ["lb", 2.20462], water: ["gal", 264.172], energy: ["kBtu", 0.947817] },
};

const DEFAULT = { region: "global", ...REGION_PRESETS.global };
const RegionContext = createContext(null);

export function buildFormatters(s) {
  const loc = s.locale;
  const num = (v, digits = 2) => (v == null || v === "" || isNaN(Number(v)) ? "—" : Number(v).toLocaleString(loc, { maximumFractionDigits: digits }));
  return {
    num,
    date: (v) => (v ? new Date(v).toLocaleDateString(loc, { year: "numeric", month: "short", day: "numeric" }) : "—"),
    dateTime: (v) => (v ? new Date(v).toLocaleString(loc, { dateStyle: "medium", timeStyle: "short" }) : "—"),
    money: (usd) => {
      const val = Number(usd || 0) * (USD_RATES[s.currency] || 1);
      return val.toLocaleString(loc, { style: "currency", currency: s.currency, maximumFractionDigits: s.currency === "JPY" ? 0 : 2 });
    },
    unitLabel: (kind) => UNITS[s.units][kind][0],
    unit: (v, kind) => (v == null ? "—" : num(Number(v) * UNITS[s.units][kind][1])),
  };
}

export function RegionProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULT);

  const load = useCallback(() => {
    if (!user) { setSettings(DEFAULT); return; }
    api.get("/settings/region").then(r => setSettings(r.data)).catch((e) => console.warn("Region settings load failed", e));
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const save = async (next) => {
    const { data } = await api.put("/settings/region", next);
    setSettings(data);
    return data;
  };

  const value = useMemo(() => ({ settings, save, fmt: buildFormatters(settings) }), [settings]); // eslint-disable-line react-hooks/exhaustive-deps
  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export const useRegion = () => useContext(RegionContext);
