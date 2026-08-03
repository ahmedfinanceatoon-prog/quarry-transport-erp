import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LayoutDashboard, Truck, Users, Factory, Layers, FileBarChart,
  Plus, Pencil, Trash2, X, Search, Download, TrendingUp, TrendingDown,
  Package, Wallet, ChevronDown, AlertCircle, Loader2
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";
import { isConfigured, fetchTable, upsertRow, deleteRow } from "./lib/supabase.js";

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */
const COLORS = {
  bg: "#EDEEEA",
  card: "#FFFFFF",
  ink: "#242722",
  inkSoft: "#63665F",
  border: "#DBDCD5",
  amber: "#C1791F",
  amberDark: "#9C5F16",
  slate: "#3A5266",
  slateDark: "#28394A",
  good: "#4C7A4F",
  bad: "#B2453B",
  cream: "#F6F5F1",
};
const ITEM_COLORS = ["#C1791F", "#3A5266", "#7A8B57", "#9C5F16", "#8A6BA8"];

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&family=Tajawal:wght@400;500;700&display=swap');
`;

const uid = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  // fallback: يولّد UUID v4 صالح للمتصفحات القديمة جدًا (بدون دعم crypto.randomUUID)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtNum = (n) => {
  const v = Number(n) || 0;
  return v.toLocaleString("ar-EG", { maximumFractionDigits: 2 });
};
const fmtMoney = (n) => fmtNum(n) + " ر.س";

const EMPTY_MASTERS = { trucks: [], clients: [], suppliers: [], items: [] };

/* ------------------------------------------------------------------ */
/* Generic UI atoms                                                    */
/* ------------------------------------------------------------------ */
function Card({ children, className = "", style = {} }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, ...style }}
    >
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", type = "button", small = false, disabled = false }) {
  const base = {
    primary: { background: COLORS.amber, color: "#fff", border: "none" },
    secondary: { background: "transparent", color: COLORS.slateDark, border: `1px solid ${COLORS.border}` },
    danger: { background: "transparent", color: COLORS.bad, border: `1px solid ${COLORS.bad}55` },
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-xl font-bold transition-opacity hover:opacity-85 disabled:opacity-40"
      style={{ ...base, padding: small ? "6px 12px" : "9px 16px", fontSize: small ? 13 : 14 }}
    >
      {children}
    </button>
  );
}

function Field({ label, children, required }) {
  return (
    <label className="flex flex-col gap-1 text-sm" style={{ color: COLORS.inkSoft }}>
      <span className="font-bold" style={{ color: COLORS.ink }}>
        {label} {required && <span style={{ color: COLORS.bad }}>*</span>}
      </span>
      {children}
    </label>
  );
}

const inputStyle = {
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 14,
  background: "#fff",
  color: COLORS.ink,
  outline: "none",
  fontFamily: "'Tajawal', sans-serif",
};

function Input(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}
function Select({ children, ...props }) {
  return (
    <select {...props} style={{ ...inputStyle, ...(props.style || {}) }}>
      {children}
    </select>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "#00000055" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl w-full overflow-hidden flex flex-col"
        style={{ background: "#fff", maxWidth: wide ? 720 : 460, maxHeight: "88vh" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${COLORS.border}` }}
        >
          <h3 className="font-extrabold text-lg" style={{ color: COLORS.ink, fontFamily: "'Almarai', sans-serif" }}>
            {title}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-60">
            <X size={20} color={COLORS.inkSoft} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-full p-4" style={{ background: COLORS.cream }}>
        <Icon size={28} color={COLORS.inkSoft} />
      </div>
      <p style={{ color: COLORS.inkSoft }} className="text-sm">{text}</p>
      {action}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tint }) {
  return (
    <Card className="p-4 flex flex-col gap-2 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold" style={{ color: COLORS.inkSoft }}>{label}</span>
        <div className="rounded-lg p-1.5" style={{ background: tint + "22" }}>
          <Icon size={16} color={tint} />
        </div>
      </div>
      <span
        className="font-extrabold"
        style={{ fontFamily: "'Almarai', sans-serif", fontSize: 26, color: COLORS.ink }}
      >
        {value}
      </span>
      {sub && <span className="text-xs" style={{ color: COLORS.inkSoft }}>{sub}</span>}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar navigation                                                  */
/* ------------------------------------------------------------------ */
const NAV = [
  { key: "dashboard", label: "لوحة المتابعة", icon: LayoutDashboard },
  { key: "trips", label: "الرحلات", icon: Truck },
  { key: "fleet", label: "الأسطول", icon: Package },
  { key: "clients", label: "العملاء", icon: Users },
  { key: "suppliers", label: "الموردين", icon: Factory },
  { key: "items", label: "أصناف البحص", icon: Layers },
  { key: "reports", label: "التقارير", icon: FileBarChart },
];

function Sidebar({ active, setActive, onRefresh, refreshing }) {
  return (
    <div
      className="h-full flex flex-col shrink-0"
      style={{ width: 216, background: COLORS.slateDark, borderLeft: `1px solid ${COLORS.border}` }}
    >
      <div className="px-5 py-6 flex items-center gap-2.5">
        <div className="rounded-xl p-2" style={{ background: COLORS.amber }}>
          <Truck size={20} color="#fff" />
        </div>
        <div>
          <div className="font-extrabold text-white text-[15px] leading-tight" style={{ fontFamily: "'Almarai', sans-serif" }}>
            نقليات البحص
          </div>
          <div className="text-[11px]" style={{ color: "#ffffff88" }}>نظام إدارة الحركة</div>
        </div>
      </div>
      <nav className="flex-1 px-3 flex flex-col gap-1">
        {NAV.map((n) => {
          const isActive = active === n.key;
          return (
            <button
              key={n.key}
              onClick={() => setActive(n.key)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors text-right"
              style={{
                background: isActive ? COLORS.amber : "transparent",
                color: isActive ? "#fff" : "#ffffffb0",
              }}
            >
              <n.icon size={17} />
              {n.label}
            </button>
          );
        })}
      </nav>
      <button
        onClick={onRefresh}
        className="mx-3 mb-4 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold"
        style={{ background: "#ffffff14", color: "#ffffffcf" }}
      >
        {refreshing ? <Loader2 size={15} className="animate-spin" /> : <span style={{ fontSize: 14 }}>↻</span>}
        تحديث البيانات
      </button>
      <div className="px-5 pb-4 text-[11px]" style={{ color: "#ffffff66" }}>
        البيانات مشتركة ومتزامنة تلقائيًا
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trip form (add / edit)                                              */
/* ------------------------------------------------------------------ */
function TripForm({ initial, masters, onSave, onClose }) {
  const [f, setF] = useState(
    initial || {
      id: uid(),
      date: todayISO(),
      supplier: masters.suppliers[0]?.name || "",
      truck: "",
      driver: "",
      ticketNo: "",
      netWeight: "",
      price: "",
      receiptDate: todayISO(),
      receiptNo: "",
      customerReceiptNo: "",
      item: masters.items[0]?.name || "",
      client: masters.clients[0]?.name || "",
      deliveredQty: "",
      tripOrder: 1,
      tripValue: 0,
      unit: "طن",
      overtimeHours: 0,
      overtimeRate: 0,
      salePrice: "",
    }
  );

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const onTruckChange = (num) => {
    const truck = masters.trucks.find((t) => t.number === num);
    set("truck", num);
    set("driver", truck?.driver || "");
  };

  const valueExVat = (Number(f.netWeight) || 0) * (Number(f.price) || 0);
  const valueIncVat = valueExVat * 1.15;
  const diffQty = (Number(f.deliveredQty) || 0) - (Number(f.netWeight) || 0);
  const overtimeAmount = (Number(f.overtimeHours) || 0) * (Number(f.overtimeRate) || 0);
  const saleValueExVat = (Number(f.deliveredQty) || 0) * (Number(f.salePrice) || 0);
  const saleValueIncVat = saleValueExVat * 1.15;
  const profit = saleValueIncVat - valueIncVat;

  const NUMERIC_FIELDS = ["netWeight", "price", "deliveredQty", "tripOrder", "tripValue", "overtimeHours", "overtimeRate", "salePrice"];
  const DATE_FIELDS = ["receiptDate"];

  const submit = () => {
    if (!f.date || !f.truck) return;
    const clean = { ...f };
    NUMERIC_FIELDS.forEach((k) => { clean[k] = Number(clean[k]) || 0; });
    DATE_FIELDS.forEach((k) => { clean[k] = clean[k] || null; });
    onSave({ ...clean, valueExVat, valueIncVat, diffQty, overtimeAmount, saleValueExVat, saleValueIncVat });
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="التاريخ" required>
          <Input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="اسم الكسارة / المورد">
          <Select value={f.supplier} onChange={(e) => set("supplier", e.target.value)}>
            <option value="">اختر</option>
            {masters.suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </Select>
        </Field>

        <Field label="رقم السيارة" required>
          <Select value={f.truck} onChange={(e) => onTruckChange(e.target.value)}>
            <option value="">اختر</option>
            {masters.trucks.map((t) => <option key={t.id} value={t.number}>{t.number}</option>)}
          </Select>
        </Field>
        <Field label="اسم السائق (تلقائي)">
          <Input value={f.driver} onChange={(e) => set("driver", e.target.value)} style={{ background: COLORS.cream }} />
        </Field>

        <Field label="سند ميزان الكسارة">
          <Input value={f.ticketNo} onChange={(e) => set("ticketNo", e.target.value)} />
        </Field>
        <Field label="صافي ميزان الكسارة (طن)">
          <Input type="number" value={f.netWeight} onChange={(e) => set("netWeight", e.target.value)} />
        </Field>

        <Field label="سعر الشراء (من المورد)">
          <Input type="number" value={f.price} onChange={(e) => set("price", e.target.value)} />
        </Field>
        <Field label="القيمة شاملة الضريبة (تلقائي)">
          <Input value={fmtMoney(valueIncVat)} disabled style={{ background: COLORS.cream, color: COLORS.inkSoft }} />
        </Field>

        <Field label="سعر البيع للعميل (الوحدة)">
          <Input type="number" value={f.salePrice} onChange={(e) => set("salePrice", e.target.value)} />
        </Field>
        <Field label="قيمة البيع شاملة الضريبة (تلقائي)">
          <Input value={fmtMoney(saleValueIncVat)} disabled style={{ background: COLORS.cream, color: COLORS.inkSoft }} />
        </Field>

        <Field label="تاريخ الاستلام">
          <Input type="date" value={f.receiptDate} onChange={(e) => set("receiptDate", e.target.value)} />
        </Field>
        <Field label="رقم سند الاستلام">
          <Input value={f.receiptNo} onChange={(e) => set("receiptNo", e.target.value)} />
        </Field>

        <Field label="الصنف">
          <Select value={f.item} onChange={(e) => set("item", e.target.value)}>
            <option value="">اختر</option>
            {masters.items.map((i) => <option key={i.id} value={i.name}>{i.name}</option>)}
          </Select>
        </Field>
        <Field label="اسم العميل">
          <Select value={f.client} onChange={(e) => set("client", e.target.value)}>
            <option value="">اختر</option>
            {masters.clients.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </Select>
        </Field>

        <Field label="صافي الكمية المسلمة للعميل (طن)">
          <Input type="number" value={f.deliveredQty} onChange={(e) => set("deliveredQty", e.target.value)} />
        </Field>
        <Field label="فرق الكمية (تلقائي)">
          <Input value={fmtNum(diffQty)} disabled style={{ background: COLORS.cream, color: COLORS.inkSoft }} />
        </Field>

        <Field label="قيمة الرد">
          <Input type="number" value={f.tripValue} onChange={(e) => set("tripValue", e.target.value)} />
        </Field>
        <Field label="الوحدة">
          <Select value={f.unit} onChange={(e) => set("unit", e.target.value)}>
            <option value="طن">طن</option>
            <option value="ريال">ريال</option>
          </Select>
        </Field>
        <Field label="هامش الربح (تلقائي)">
          <Input
            value={fmtMoney(profit)}
            disabled
            style={{ background: COLORS.cream, color: profit >= 0 ? COLORS.good : COLORS.bad, fontWeight: 700 }}
          />
        </Field>
      </div>

      <div className="mt-4 pt-4" style={{ borderTop: `1px dashed ${COLORS.border}` }}>
        <h4 className="font-bold mb-3 text-sm" style={{ color: COLORS.ink }}>إضافي السائق</h4>
        <div className="grid grid-cols-3 gap-3">
          <Field label="ساعات الإضافي">
            <Input type="number" value={f.overtimeHours} onChange={(e) => set("overtimeHours", e.target.value)} />
          </Field>
          <Field label="سعر ساعة الإضافي">
            <Input type="number" value={f.overtimeRate} onChange={(e) => set("overtimeRate", e.target.value)} />
          </Field>
          <Field label="قيمة الإضافي (تلقائي)">
            <Input value={fmtMoney(overtimeAmount)} disabled style={{ background: COLORS.cream, color: COLORS.inkSoft }} />
          </Field>
        </div>
      </div>

      <div className="flex justify-start gap-2 mt-5">
        <Btn onClick={submit}>حفظ الرحلة</Btn>
        <Btn variant="secondary" onClick={onClose}>إلغاء</Btn>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Simple master-data form (trucks / clients / suppliers / items)      */
/* ------------------------------------------------------------------ */
function MasterForm({ fields, initial, onSave, onClose }) {
  const [f, setF] = useState(initial || fields.reduce((acc, fl) => ({ ...acc, [fl.key]: fl.default ?? "" }), { id: uid() }));
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  return (
    <>
      <div className="flex flex-col gap-3">
        {fields.map((fl) => (
          <Field key={fl.key} label={fl.label} required={fl.required}>
            {fl.type === "select" ? (
              <Select value={f[fl.key]} onChange={(e) => set(fl.key, e.target.value)}>
                {fl.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            ) : (
              <Input
                type={fl.type || "text"}
                value={f[fl.key]}
                onChange={(e) => set(fl.key, e.target.value)}
              />
            )}
          </Field>
        ))}
      </div>
      <div className="flex justify-start gap-2 mt-5">
        <Btn onClick={() => onSave(f)}>حفظ</Btn>
        <Btn variant="secondary" onClick={onClose}>إلغاء</Btn>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Generic table with add/edit/delete                                  */
/* ------------------------------------------------------------------ */
function DataTable({ columns, rows, onEdit, onDelete, emptyIcon, emptyText }) {
  if (!rows.length) return <EmptyState icon={emptyIcon} text={emptyText} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
            {columns.map((c) => (
              <th key={c.key} className="text-right py-2.5 px-3 font-bold whitespace-nowrap" style={{ color: COLORS.inkSoft, fontSize: 12.5 }}>
                {c.label}
              </th>
            ))}
            <th className="w-20"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} style={{ borderBottom: `1px solid ${COLORS.border}` }} className="hover:bg-black/[0.02]">
              {columns.map((c) => (
                <td key={c.key} className="py-2.5 px-3 whitespace-nowrap" style={{ color: COLORS.ink }}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
              <td className="py-2.5 px-3">
                <div className="flex gap-1 justify-end">
                  <button onClick={() => onEdit(row)} className="p-1.5 rounded-lg hover:opacity-60">
                    <Pencil size={15} color={COLORS.slate} />
                  </button>
                  <button onClick={() => onDelete(row.id)} className="p-1.5 rounded-lg hover:opacity-60">
                    <Trash2 size={15} color={COLORS.bad} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionHeader({ title, sub, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="font-extrabold text-xl" style={{ color: COLORS.ink, fontFamily: "'Almarai', sans-serif" }}>{title}</h2>
        {sub && <p className="text-sm mt-0.5" style={{ color: COLORS.inkSoft }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Setup screen (shown until .env has Supabase credentials)            */
/* ------------------------------------------------------------------ */
function SetupScreen() {
  return (
    <div dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif", background: COLORS.bg, minHeight: "100vh" }} className="w-full flex items-center justify-center p-6">
      <style>{FONT_IMPORT}</style>
      <Card className="p-8 max-w-lg text-center flex flex-col items-center gap-3">
        <div className="rounded-full p-4" style={{ background: COLORS.cream }}>
          <AlertCircle size={28} color={COLORS.amber} />
        </div>
        <h1 className="font-extrabold text-xl" style={{ fontFamily: "'Almarai', sans-serif", color: COLORS.ink }}>
          إعداد قاعدة البيانات غير مكتمل
        </h1>
        <p className="text-sm" style={{ color: COLORS.inkSoft }}>
          أضف رابط ومفتاح Supabase في ملف <code dir="ltr">.env</code> بجذر المشروع، ثم أعد تشغيل/بناء الموقع:
        </p>
        <pre
          dir="ltr"
          className="text-xs text-right rounded-xl p-3 w-full overflow-x-auto"
          style={{ background: COLORS.slateDark, color: "#fff" }}
        >
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxx`}
        </pre>
        <p className="text-xs" style={{ color: COLORS.inkSoft }}>
          راجع ملف README.md لخطوات إنشاء المشروع على Supabase وتشغيل ملف supabase/schema.sql
        </p>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main App                                                            */
/* ------------------------------------------------------------------ */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("dashboard");
  const [masters, setMasters] = useState(EMPTY_MASTERS);
  const [trips, setTrips] = useState([]);
  const [modal, setModal] = useState(null); // { type, initial }
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    const [trucks, clients, suppliers, items, tripsData] = await Promise.all([
      fetchTable("trucks", "created_at", true),
      fetchTable("clients", "created_at", true),
      fetchTable("suppliers", "created_at", true),
      fetchTable("items", "created_at", true),
      fetchTable("trips", "date", false),
    ]);
    setMasters({ trucks, clients, suppliers, items });
    setTrips(tripsData);
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      await fetchAll();
      setLoading(false);
    })();
    const id = setInterval(fetchAll, 20000); // مزامنة كل 20 ثانية بين الأجهزة
    return () => clearInterval(id);
  }, [fetchAll]);

  const manualRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  /* ---- trips CRUD ---- */
  const saveTrip = async (trip) => {
    const saved = await upsertRow("trips", trip);
    setTrips((prev) => {
      const exists = prev.some((t) => t.id === saved.id);
      return exists ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev];
    });
    setModal(null);
  };
  const deleteTrip = async (id) => {
    await deleteRow("trips", id);
    setTrips((prev) => prev.filter((t) => t.id !== id));
  };

  /* ---- master CRUD helper ---- */
  const saveMaster = (key) => async (item) => {
    const saved = await upsertRow(key, item);
    setMasters((prev) => {
      const list = prev[key];
      const exists = list.some((x) => x.id === saved.id);
      const nextList = exists ? list.map((x) => (x.id === saved.id ? saved : x)) : [...list, saved];
      return { ...prev, [key]: nextList };
    });
    setModal(null);
  };
  const deleteMaster = (key) => async (id) => {
    await deleteRow(key, id);
    setMasters((prev) => ({ ...prev, [key]: prev[key].filter((x) => x.id !== id) }));
  };

  /* ---- derived stats ---- */
  const stats = useMemo(() => {
    const today = todayISO();
    const thisMonth = today.slice(0, 7);
    const tripsToday = trips.filter((t) => t.date === today).length;
    const tripsMonth = trips.filter((t) => (t.date || "").slice(0, 7) === thisMonth);
    const qtyMonth = tripsMonth.reduce((s, t) => s + (Number(t.deliveredQty) || 0), 0);
    const salesMonth = tripsMonth.reduce((s, t) => s + (Number(t.saleValueIncVat) || 0), 0);
    const purchasesMonth = tripsMonth.reduce((s, t) => s + (Number(t.valueIncVat) || 0), 0);
    const profitMonth = salesMonth - purchasesMonth;

    const byItem = {};
    trips.forEach((t) => {
      if (!t.item) return;
      byItem[t.item] = (byItem[t.item] || 0) + (Number(t.deliveredQty) || 0);
    });
    const itemData = Object.entries(byItem).map(([name, value]) => ({ name, value }));

    const last7 = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const iso = d.toISOString().slice(0, 10);
      const qty = trips.filter((t) => t.date === iso).reduce((s, t) => s + (Number(t.deliveredQty) || 0), 0);
      return { day: d.toLocaleDateString("ar-EG", { weekday: "short" }), qty };
    });

    return { tripsToday, qtyMonth, salesMonth, purchasesMonth, profitMonth, itemData, last7, tripsMonthCount: tripsMonth.length };
  }, [trips]);

  if (!isConfigured) {
    return <SetupScreen />;
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: COLORS.bg, minHeight: 500 }}>
        <Loader2 className="animate-spin" color={COLORS.amber} size={28} />
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif", background: COLORS.bg, height: "100vh" }} className="w-full flex">
      <style>{FONT_IMPORT}</style>
      <Sidebar active={active} setActive={setActive} onRefresh={manualRefresh} refreshing={refreshing} />

      <div className="flex-1 min-w-0 flex flex-col" style={{ height: "100vh" }}>
        <div className="flex-1 overflow-y-auto p-6">
          {active === "dashboard" && (
            <Dashboard stats={stats} trips={trips} setActive={setActive} setModal={setModal} />
          )}
          {active === "trips" && (
            <TripsPage
              trips={trips} masters={masters} setModal={setModal} deleteTrip={deleteTrip}
            />
          )}
          {active === "fleet" && (
            <MasterPage
              title="الأسطول" sub="إدارة السيارات والسائقين"
              icon={Package}
              emptyText="لا توجد سيارات بعد. أضف أول سيارة للأسطول."
              rows={masters.trucks}
              columns={[
                { key: "number", label: "رقم السيارة" },
                { key: "driver", label: "اسم السائق" },
                { key: "status", label: "الحالة", render: (r) => <StatusTag value={r.status} /> },
              ]}
              onAdd={() => setModal({ type: "truck" })}
              onEdit={(r) => setModal({ type: "truck", initial: r })}
              onDelete={deleteMaster("trucks")}
            />
          )}
          {active === "clients" && (
            <MasterPage
              title="العملاء" sub="إدارة بيانات العملاء وأرصدتهم"
              icon={Users}
              emptyText="لا يوجد عملاء بعد. أضف أول عميل."
              rows={masters.clients}
              columns={[
                { key: "name", label: "اسم العميل" },
                { key: "phone", label: "رقم الجوال" },
                { key: "openingBalance", label: "رصيد أول المدة", render: (r) => fmtMoney(r.openingBalance) },
                {
                  key: "total", label: "إجمالي الكمية المستلمة",
                  render: (r) => fmtNum(trips.filter((t) => t.client === r.name).reduce((s, t) => s + (Number(t.deliveredQty) || 0), 0)) + " طن",
                },
              ]}
              onAdd={() => setModal({ type: "client" })}
              onEdit={(r) => setModal({ type: "client", initial: r })}
              onDelete={deleteMaster("clients")}
            />
          )}
          {active === "suppliers" && (
            <MasterPage
              title="الموردين" sub="إدارة الكسارات والموردين"
              icon={Factory}
              emptyText="لا يوجد موردين بعد. أضف أول مورد."
              rows={masters.suppliers}
              columns={[
                { key: "name", label: "اسم الكسارة / المورد" },
                {
                  key: "total", label: "إجمالي التوريد",
                  render: (r) => fmtNum(trips.filter((t) => t.supplier === r.name).reduce((s, t) => s + (Number(t.netWeight) || 0), 0)) + " طن",
                },
              ]}
              onAdd={() => setModal({ type: "supplier" })}
              onEdit={(r) => setModal({ type: "supplier", initial: r })}
              onDelete={deleteMaster("suppliers")}
            />
          )}
          {active === "items" && (
            <MasterPage
              title="أصناف البحص" sub="إدارة مقاسات وأصناف المادة"
              icon={Layers}
              emptyText="لا توجد أصناف بعد."
              rows={masters.items}
              columns={[
                { key: "name", label: "الصنف" },
                { key: "unit", label: "الوحدة" },
                {
                  key: "total", label: "إجمالي الكمية المتداولة",
                  render: (r) => fmtNum(trips.filter((t) => t.item === r.name).reduce((s, t) => s + (Number(t.deliveredQty) || 0), 0)) + " طن",
                },
              ]}
              onAdd={() => setModal({ type: "item" })}
              onEdit={(r) => setModal({ type: "item", initial: r })}
              onDelete={deleteMaster("items")}
            />
          )}
          {active === "reports" && <Reports trips={trips} masters={masters} />}
        </div>
      </div>

      {/* ---- modals ---- */}
      {modal?.type === "trip" && (
        <Modal title={modal.initial ? "تعديل رحلة" : "رحلة جديدة"} onClose={() => setModal(null)} wide>
          <TripForm initial={modal.initial} masters={masters} onSave={saveTrip} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "truck" && (
        <Modal title={modal.initial ? "تعديل سيارة" : "سيارة جديدة"} onClose={() => setModal(null)}>
          <MasterForm
            fields={[
              { key: "number", label: "رقم السيارة", required: true },
              { key: "driver", label: "اسم السائق" },
              { key: "status", label: "الحالة", type: "select", options: ["نشط", "متوقف", "مؤجر"], default: "نشط" },
            ]}
            initial={modal.initial}
            onSave={saveMaster("trucks")}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.type === "client" && (
        <Modal title={modal.initial ? "تعديل عميل" : "عميل جديد"} onClose={() => setModal(null)}>
          <MasterForm
            fields={[
              { key: "name", label: "اسم العميل", required: true },
              { key: "phone", label: "رقم الجوال" },
              { key: "openingBalance", label: "رصيد أول المدة", type: "number", default: 0 },
            ]}
            initial={modal.initial}
            onSave={saveMaster("clients")}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.type === "supplier" && (
        <Modal title={modal.initial ? "تعديل مورد" : "مورد جديد"} onClose={() => setModal(null)}>
          <MasterForm
            fields={[{ key: "name", label: "اسم الكسارة / المورد", required: true }]}
            initial={modal.initial}
            onSave={saveMaster("suppliers")}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.type === "item" && (
        <Modal title={modal.initial ? "تعديل صنف" : "صنف جديد"} onClose={() => setModal(null)}>
          <MasterForm
            fields={[
              { key: "name", label: "الصنف", required: true },
              { key: "unit", label: "الوحدة", type: "select", options: ["طن", "م3"], default: "طن" },
            ]}
            initial={modal.initial}
            onSave={saveMaster("items")}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status tag                                                          */
/* ------------------------------------------------------------------ */
function StatusTag({ value }) {
  const map = {
    "نشط": { bg: "#4C7A4F22", fg: "#4C7A4F" },
    "متوقف": { bg: "#B2453B22", fg: "#B2453B" },
    "مؤجر": { bg: "#3A526622", fg: "#3A5266" },
  };
  const s = map[value] || map["نشط"];
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.fg }}>
      {value}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard page                                                      */
/* ------------------------------------------------------------------ */
function Dashboard({ stats, trips, setActive, setModal }) {
  return (
    <div className="flex flex-col gap-5">
      <div
        className="rounded-2xl p-6 relative overflow-hidden flex items-center justify-between"
        style={{ background: COLORS.slateDark }}
      >
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <defs>
            <pattern id="meshDash" width="14" height="14" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.4" fill="#ffffff" opacity="0.12" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#meshDash)" />
        </svg>
        <div className="relative z-10">
          <h1 className="text-white font-extrabold text-2xl" style={{ fontFamily: "'Almarai', sans-serif" }}>
            نظرة عامة على حركة النقليات
          </h1>
          <p className="text-sm mt-1" style={{ color: "#ffffffa0" }}>
            {new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="relative z-10">
          <Btn onClick={() => { setActive("trips"); setModal({ type: "trip" }); }}>
            <Plus size={16} /> رحلة جديدة
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <StatCard icon={Truck} label="رحلات اليوم" value={fmtNum(stats.tripsToday)} tint={COLORS.amber} />
        <StatCard icon={Package} label="كمية الشهر (طن)" value={fmtNum(stats.qtyMonth)} sub={`${fmtNum(stats.tripsMonthCount)} رحلة`} tint={COLORS.slate} />
        <StatCard icon={TrendingUp} label="مبيعات الشهر" value={fmtMoney(stats.salesMonth)} tint={COLORS.good} />
        <StatCard icon={TrendingDown} label="مشتريات الشهر" value={fmtMoney(stats.purchasesMonth)} tint={COLORS.bad} />
        <StatCard icon={Wallet} label="صافي ربح الشهر" value={fmtMoney(stats.profitMonth)} tint={stats.profitMonth >= 0 ? COLORS.good : COLORS.bad} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5 col-span-1">
          <h3 className="font-bold mb-3 text-sm" style={{ color: COLORS.ink }}>توزيع الكمية حسب الصنف</h3>
          {stats.itemData.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.itemData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {stats.itemData.map((_, i) => <Cell key={i} fill={ITEM_COLORS[i % ITEM_COLORS.length]} />)}
                </Pie>
                <RTooltip formatter={(v) => fmtNum(v) + " طن"} />
                <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Tajawal" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm py-10 text-center" style={{ color: COLORS.inkSoft }}>لا توجد بيانات بعد</p>
          )}
        </Card>

        <Card className="p-5 col-span-2">
          <h3 className="font-bold mb-3 text-sm" style={{ color: COLORS.ink }}>الكمية المسلمة - آخر 7 أيام (طن)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.last7}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fontFamily: "Tajawal" }} />
              <YAxis tick={{ fontSize: 12, fontFamily: "Tajawal" }} />
              <RTooltip formatter={(v) => fmtNum(v) + " طن"} />
              <Bar dataKey="qty" fill={COLORS.amber} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-bold mb-3 text-sm" style={{ color: COLORS.ink }}>أحدث الرحلات</h3>
        <DataTable
          columns={[
            { key: "date", label: "التاريخ" },
            { key: "truck", label: "السيارة" },
            { key: "client", label: "العميل" },
            { key: "item", label: "الصنف" },
            { key: "deliveredQty", label: "الكمية", render: (r) => fmtNum(r.deliveredQty) + " طن" },
          ]}
          rows={trips.slice(0, 5)}
          onEdit={() => setActive("trips")}
          onDelete={() => setActive("trips")}
          emptyIcon={Truck}
          emptyText="لا توجد رحلات مسجّلة بعد."
        />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trips page                                                          */
/* ------------------------------------------------------------------ */
function TripsPage({ trips, masters, setModal, deleteTrip }) {
  const [q, setQ] = useState("");
  const filtered = trips.filter((t) =>
    !q || [t.truck, t.client, t.supplier, t.item, t.ticketNo, t.receiptNo].some((v) => (v || "").toString().includes(q))
  );
  return (
    <div>
      <SectionHeader
        title="الرحلات"
        sub={`${fmtNum(trips.length)} رحلة مسجّلة`}
        action={<Btn onClick={() => setModal({ type: "trip" })}><Plus size={16} /> رحلة جديدة</Btn>}
      />
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4 rounded-xl px-3 py-2" style={{ background: COLORS.cream, border: `1px solid ${COLORS.border}`, maxWidth: 320 }}>
          <Search size={15} color={COLORS.inkSoft} />
          <input
            placeholder="بحث بالسيارة، العميل، الصنف..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="bg-transparent outline-none text-sm flex-1"
            style={{ fontFamily: "'Tajawal', sans-serif" }}
          />
        </div>
        <DataTable
          columns={[
            { key: "date", label: "التاريخ" },
            { key: "supplier", label: "المورد" },
            { key: "truck", label: "السيارة" },
            { key: "driver", label: "السائق" },
            { key: "ticketNo", label: "سند ميزان الكسارة" },
            { key: "receiptNo", label: "سند الاستلام" },
            { key: "item", label: "الصنف" },
            { key: "client", label: "العميل" },
            { key: "deliveredQty", label: "الكمية المسلمة", render: (r) => fmtNum(r.deliveredQty) + " " + (r.unit || "طن") },
            { key: "valueIncVat", label: "قيمة الشراء", render: (r) => fmtMoney(r.valueIncVat) },
            { key: "saleValueIncVat", label: "قيمة البيع", render: (r) => fmtMoney(r.saleValueIncVat) },
            { key: "overtimeAmount", label: "إضافي السائق", render: (r) => fmtMoney(r.overtimeAmount) },
          ]}
          rows={filtered}
          onEdit={(r) => setModal({ type: "trip", initial: r })}
          onDelete={deleteTrip}
          emptyIcon={Truck}
          emptyText="لا توجد رحلات بعد. أضف أول رحلة."
        />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Generic master page wrapper                                         */
/* ------------------------------------------------------------------ */
function MasterPage({ title, sub, icon, rows, columns, onAdd, onEdit, onDelete, emptyText }) {
  return (
    <div>
      <SectionHeader title={title} sub={sub} action={<Btn onClick={onAdd}><Plus size={16} /> إضافة</Btn>} />
      <Card className="p-5">
        <DataTable columns={columns} rows={rows} onEdit={onEdit} onDelete={onDelete} emptyIcon={icon} emptyText={emptyText} />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reports page                                                        */
/* ------------------------------------------------------------------ */
function Reports({ trips, masters }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [client, setClient] = useState("");
  const [supplier, setSupplier] = useState("");
  const [item, setItem] = useState("");
  const [driver, setDriver] = useState("");

  const driverOptions = useMemo(() => {
    const names = new Set();
    masters.trucks.forEach((t) => t.driver && names.add(t.driver));
    trips.forEach((t) => t.driver && names.add(t.driver));
    return Array.from(names).sort((a, b) => a.localeCompare(b, "ar"));
  }, [masters.trucks, trips]);

  const filtered = trips.filter((t) => {
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    if (client && t.client !== client) return false;
    if (supplier && t.supplier !== supplier) return false;
    if (item && t.item !== item) return false;
    if (driver && t.driver !== driver) return false;
    return true;
  });

  const totalQty = filtered.reduce((s, t) => s + (Number(t.deliveredQty) || 0), 0);
  const totalValue = filtered.reduce((s, t) => s + (Number(t.valueIncVat) || 0), 0);
  const totalSaleValue = filtered.reduce((s, t) => s + (Number(t.saleValueIncVat) || 0), 0);
  const totalProfit = totalSaleValue - totalValue;
  const totalOvertime = filtered.reduce((s, t) => s + (Number(t.overtimeAmount) || 0), 0);

  const driverOvertime = useMemo(() => {
    const byDriver = {};
    filtered.forEach((t) => {
      if (!t.driver) return;
      if (!byDriver[t.driver]) byDriver[t.driver] = { driver: t.driver, trips: 0, hours: 0, amount: 0 };
      byDriver[t.driver].trips += 1;
      byDriver[t.driver].hours += Number(t.overtimeHours) || 0;
      byDriver[t.driver].amount += Number(t.overtimeAmount) || 0;
    });
    return Object.values(byDriver)
      .filter((d) => d.hours > 0 || d.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  const exportCsv = () => {
    const headers = ["التاريخ", "المورد", "السيارة", "السائق", "سند ميزان الكسارة", "سند الاستلام", "الصنف", "العميل", "الكمية", "قيمة الشراء", "قيمة البيع", "الربح", "ساعات الإضافي", "قيمة الإضافي"];
    const rows = filtered.map((t) => [
      t.date, t.supplier, t.truck, t.driver, t.ticketNo, t.receiptNo, t.item, t.client, t.deliveredQty,
      t.valueIncVat, t.saleValueIncVat, (Number(t.saleValueIncVat) || 0) - (Number(t.valueIncVat) || 0),
      t.overtimeHours, t.overtimeAmount,
    ]);
    const csv = "\uFEFF" + [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "تقرير_الرحلات.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <SectionHeader title="التقارير" sub="فلترة الرحلات حسب التاريخ والعميل والمورد والصنف" />
      <Card className="p-5 mb-4">
        <div className="grid grid-cols-6 gap-3">
          <Field label="من تاريخ"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="إلى تاريخ"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label="العميل">
            <Select value={client} onChange={(e) => setClient(e.target.value)}>
              <option value="">الكل</option>
              {masters.clients.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="المورد">
            <Select value={supplier} onChange={(e) => setSupplier(e.target.value)}>
              <option value="">الكل</option>
              {masters.suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="الصنف">
            <Select value={item} onChange={(e) => setItem(e.target.value)}>
              <option value="">الكل</option>
              {masters.items.map((i) => <option key={i.id} value={i.name}>{i.name}</option>)}
            </Select>
          </Field>
          <Field label="السائق">
            <Select value={driver} onChange={(e) => setDriver(e.target.value)}>
              <option value="">الكل</option>
              {driverOptions.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard icon={Truck} label="عدد الرحلات" value={fmtNum(filtered.length)} tint={COLORS.slate} />
        <StatCard icon={Package} label="إجمالي الكمية" value={fmtNum(totalQty) + " طن"} tint={COLORS.amber} />
        <StatCard icon={Wallet} label="إجمالي قيمة الشراء" value={fmtMoney(totalValue)} tint={COLORS.bad} />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard icon={TrendingUp} label="إجمالي قيمة البيع" value={fmtMoney(totalSaleValue)} tint={COLORS.good} />
        <StatCard icon={Wallet} label="صافي الربح" value={fmtMoney(totalProfit)} tint={totalProfit >= 0 ? COLORS.good : COLORS.bad} />
        <StatCard icon={Wallet} label="إجمالي إضافي السائقين" value={fmtMoney(totalOvertime)} tint={COLORS.slate} />
      </div>

      {driverOvertime.length > 0 && (
        <Card className="p-5 mb-4">
          <h3 className="font-bold mb-3 text-sm" style={{ color: COLORS.ink }}>إضافي السائقين حسب السائق</h3>
          <DataTable
            columns={[
              { key: "driver", label: "السائق" },
              { key: "trips", label: "عدد الرحلات", render: (r) => fmtNum(r.trips) },
              { key: "hours", label: "إجمالي ساعات الإضافي", render: (r) => fmtNum(r.hours) + " ساعة" },
              { key: "amount", label: "إجمالي قيمة الإضافي", render: (r) => fmtMoney(r.amount) },
            ]}
            rows={driverOvertime.map((d, i) => ({ id: d.driver || i, ...d }))}
            onEdit={() => {}}
            onDelete={() => {}}
            emptyIcon={Wallet}
            emptyText="لا يوجد إضافي مسجّل ضمن الفلاتر الحالية."
          />
        </Card>
      )}

      <Card className="p-5">
        <div className="flex justify-end mb-3">
          <Btn variant="secondary" small onClick={exportCsv}><Download size={14} /> تصدير CSV</Btn>
        </div>
        <DataTable
          columns={[
            { key: "date", label: "التاريخ" },
            { key: "supplier", label: "المورد" },
            { key: "truck", label: "السيارة" },
            { key: "driver", label: "السائق" },
            { key: "ticketNo", label: "سند ميزان الكسارة" },
            { key: "receiptNo", label: "سند الاستلام" },
            { key: "item", label: "الصنف" },
            { key: "client", label: "العميل" },
            { key: "deliveredQty", label: "الكمية", render: (r) => fmtNum(r.deliveredQty) + " طن" },
            { key: "valueIncVat", label: "قيمة الشراء", render: (r) => fmtMoney(r.valueIncVat) },
            { key: "saleValueIncVat", label: "قيمة البيع", render: (r) => fmtMoney(r.saleValueIncVat) },
            { key: "profit", label: "الربح", render: (r) => fmtMoney((Number(r.saleValueIncVat) || 0) - (Number(r.valueIncVat) || 0)) },
            { key: "overtimeHours", label: "ساعات الإضافي", render: (r) => fmtNum(r.overtimeHours) },
            { key: "overtimeAmount", label: "قيمة الإضافي", render: (r) => fmtMoney(r.overtimeAmount) },
          ]}
          rows={filtered}
          onEdit={() => {}}
          onDelete={() => {}}
          emptyIcon={FileBarChart}
          emptyText="لا توجد نتائج مطابقة للفلاتر الحالية."
        />
      </Card>
    </div>
  );
}
