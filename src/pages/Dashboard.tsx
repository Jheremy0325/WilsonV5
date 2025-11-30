import React, { useEffect, useMemo } from "react";
import { useState } from "react";
import "@/styles/dashboard.css";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Box, Users, Tag, DollarSign, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  LabelList,
  Cell,
} from "recharts";
import { PieChart, Pie, Legend } from "recharts";

const COLORS = ["#60a5fa","#93c5fd","#a7f3d0","#fbcfe8","#fde68a","#c7b8ff"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const raw = payload[0].value ?? payload[0].payload?.value ?? payload[0].payload?.sales ?? payload[0].payload?.count;
    const value = typeof raw === 'number' ? raw : Number(raw) || raw;
    const formatted = typeof value === 'number'
      ? (value >= 1000 ? `$${value.toLocaleString()}` : `$${value}`)
      : value;
    return (
      <div className="dashboard-tooltip bg-black/85 text-white rounded-md px-3 py-2 shadow-2xl border border-white/10">
        <div className="text-xs text-gray-300">{label}</div>
        <div className="text-sm font-semibold">{formatted}</div>
      </div>
    );
  }
  return null;
};

// Small helpers for formatting axis/tooltips
const fmtCurrency = (v: number) => `$${Math.round(v).toLocaleString()}`;
const fmtCompact = (v: number) => (v >= 1000 ? `${Math.round(v).toLocaleString()}` : `${v}`);
const truncate = (s?: string, len = 28) => {
  if (!s) return '';
  return s.length > len ? `${s.slice(0, len - 1)}…` : s;
};

// active pie slice state for hover effect
const useActivePie = () => {
  const [active, setActive] = React.useState<number | null>(null);
  return { active, setActive };
};

interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  totalSuppliers: number;
  totalCategories: number;
  totalInventoryValue: number;
  averageStockLevel: number;
}

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
  min_stock: number;
  price: number;
  cost: number;
  category_id?: string | null;
}

declare global {
  interface Window { chatbase?: any; }
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockProducts: 0,
    totalSuppliers: 0,
    totalCategories: 0,
    totalInventoryValue: 0,
    averageStockLevel: 0,
  });
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [categoriesList, setCategoriesList] = useState<{ id: string; name: string }[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);

  const statCards = [
    { title: "Total Productos", value: `${stats.totalProducts ?? 0}`, icon: <Box className="text-slate-400" /> },
    { title: "Stock Bajo", value: `${stats.lowStockProducts ?? 0}`, icon: <AlertTriangle className="text-amber-400" /> },
    { title: "Proveedores", value: `${stats.totalSuppliers ?? 0}`, icon: <Users className="text-slate-400" /> },
    { title: "Categorías", value: `${stats.totalCategories ?? 0}`, icon: <Tag className="text-slate-400" /> },
    { title: "Valor Inventario", value: `$${(stats.totalInventoryValue ?? 0).toLocaleString()}`, icon: <DollarSign className="text-green-400" /> },
    { title: "Stock Promedio", value: `${Math.round(stats.averageStockLevel)}`, icon: <TrendingUp className="text-slate-400" /> },
  ];

  const fetchDashboardData = async () => {
    // Fetch products
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("status", "active");

    // Fetch suppliers
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("id")
      .eq("is_active", true);

    // Fetch categories (id + name)
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name");

    if (products) {
      const lowStock = products.filter(p => p.stock_quantity <= p.min_stock);
      const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0);
      const avgStock = products.length > 0
        ? products.reduce((sum, p) => sum + p.stock_quantity, 0) / products.length
        : 0;

      setStats({
        totalProducts: products.length,
        lowStockProducts: lowStock.length,
        totalSuppliers: suppliers?.length || 0,
        totalCategories: categories?.length || 0,
        totalInventoryValue: totalValue,
        averageStockLevel: avgStock,
      });

      setLowStockItems(lowStock.slice(0, 5));
      setProductsList(products);
      setCategoriesList(categories || []);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to real-time changes
    const channel = supabase
      .channel("dashboard-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          fetchDashboardData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "suppliers",
        },
        () => {
          fetchDashboardData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const id = "zv1kYupvRCB1hnrbSUtSw";
    if (!document.getElementById(id)) {
      const script = document.createElement("script");
      script.src = "https://www.chatbase.co/embed.min.js";
      script.id = id;
      script.async = true;
      document.body.appendChild(script);
      script.addEventListener("load", identifyUser);
    } else {
      identifyUser();
    }

    async function identifyUser() {
      try {
        const res = await fetch("/api/chatbase-token");
        if (!res.ok) return;
        const { token } = await res.json();
        if (!token) return;

        if (window.chatbase) {
          window.chatbase("identify", { token });
        } else {
          (window as any).chatbase = (window as any).chatbase || ((...args: any[]) => {
            (window as any).chatbase_q = (window as any).chatbase_q || [];
            (window as any).chatbase_q.push(args);
          });
          (window as any).chatbase("identify", { token });
        }
      } catch (err) {
        console.error("Chatbase identify failed", err);
      }
    }
  }, []);

  // statCards removed: dashboard now shows only charts

  const salesData = useMemo(() => {
    // create 7-day mock sales data based on total inventory value
    const days = 7;
    const base = stats.totalInventoryValue / (days || 1);
    const data = Array.from({ length: days }).map((_, i) => {
      const dayIndex = days - i;
      // add some deterministic variation
      const variation = Math.round(base * (0.2 * Math.sin(i) + 1));
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return { name: label, sales: Math.max(0, variation) };
    });
    return data;
  }, [stats.totalInventoryValue]);

  const topProducts = useMemo(() => {
    // top 5 products by inventory value (price * stock)
    return productsList
      .slice()
      .sort((a, b) => (b.price * b.stock_quantity) - (a.price * a.stock_quantity))
      .slice(0, 5)
      .map((p) => ({ name: p.name, displayName: truncate(p.name, 30), value: Math.round(p.price * p.stock_quantity) }));
  }, [productsList]);

  const categoryData = useMemo(() => {
    // Count products per category (or inventory value per category)
    const map = new Map<string, number>();
    const names = new Map<string, string>();
    categoriesList.forEach((c) => names.set(c.id, c.name));

    productsList.forEach((p) => {
      const key = p.category_id || "__uncategorized";
      const prev = map.get(key) || 0;
      map.set(key, prev + 1);
    });

    const result: { name: string; value: number }[] = [];
    map.forEach((value, key) => {
      const label = key === "__uncategorized" ? "Sin categoría" : (names.get(key) || key);
      result.push({ name: label, value });
    });
    // sort desc
    result.sort((a, b) => b.value - a.value);
    return result;
  }, [productsList, categoriesList]);

  const inventoryTimeline = useMemo(() => {
    // mock inventory value over last 7 days using totalInventoryValue
    const days = 7;
    const base = stats.totalInventoryValue;
    return Array.from({ length: days }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const fluct = Math.round(base * (0.9 + 0.05 * Math.sin(i)));
      return { name: label, value: Math.max(0, fluct) };
    });
  }, [stats.totalInventoryValue]);

  const stockBuckets = useMemo(() => {
    // low / normal / high by comparing to min_stock
    let low = 0, normal = 0, high = 0;
    productsList.forEach((p) => {
      if (p.stock_quantity <= p.min_stock) low++;
      else if (p.stock_quantity <= p.min_stock * 3) normal++;
      else high++;
    });
    return [
      { name: "Bajo", value: low },
      { name: "Normal", value: normal },
      { name: "Alto", value: high },
    ];
  }, [productsList]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight dashboard-font">Dashboard</h1>
        <p className="text-muted-foreground chart-subtitle">
          Vista general del sistema de inventario — gráficos interactivos y valores reales
        </p>
      </div>

      {/* Top metric cards (summary) */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map((s) => (
          <Card key={s.title} className="p-3 chart-card">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{s.title}</div>
                  <div className="text-2xl font-semibold mt-2 dashboard-font">{s.value}</div>
                </div>
                <div className="p-2 rounded-full bg-white/5">
                  {s.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Wide low-stock banner */}
      {lowStockItems.length > 0 && (
        <Card className="chart-card">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 text-lg font-semibold">
                  <AlertTriangle className="text-amber-500" /> Productos con Stock Bajo
                </div>
                <div className="text-sm text-muted-foreground mt-1">{lowStockItems[0]?.name}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                {`${lowStockItems[0]?.stock_quantity ?? 0} / ${lowStockItems[0]?.min_stock ?? 0} unidades`}
              </div>
            </div>
            <div className="mt-4">
              <Progress value={Math.min(100, Math.round(((lowStockItems[0]?.stock_quantity ?? 0) / Math.max(1, (lowStockItems[0]?.min_stock ?? 1))) * 100))} className="h-3" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full charts grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

     <Card className="chart-card">
  <CardHeader>
    <CardTitle className="dashboard-font text-2xl font-semibold text-black">
      Top Productos (Valor de Inventario)
    </CardTitle>
    <div className="chart-subtitle text-lg text-[#B0B0B0] mt-1">
      Productos con mayor valor en stock (precio × cantidad)
    </div>
  </CardHeader>
  <CardContent>
    <div className="bg-gradient-to-br from-[#1b2430] via-[#0e1a24] to-[#1e2a34] p-6 rounded-xl shadow-2xl border border-white/10">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={topProducts} layout="vertical" margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
          <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(v) => `$${fmtCompact(Number(v))}`} axisLine={false} />
          <YAxis type="category" dataKey="displayName" width={220} tick={{ fill: '#e5e7eb', fontSize: 13 }} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[8, 8, 8, 8]} barSize={18} background={{ fill: '#1e2a34' }}>
            {topProducts.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </CardContent>
</Card>
 

<Card className="chart-card">
  <CardHeader>
    <CardTitle className="dashboard-font text-2xl font-semibold text-black">
      Distribución por Categoría
    </CardTitle>
    <div className="chart-subtitle text-lg text-[#B0B0B0] mt-1">
      Porcentaje de productos por categoría
    </div>
  </CardHeader>
  <CardContent>
    <div className="bg-gradient-to-br from-[#1b2430] via-[#0e1a24] to-[#1e2a34] p-6 rounded-xl shadow-2xl border border-white/10">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={categoryData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={110}
            innerRadius={70}
            labelLine={false}
            label={({ percent }) => `${Math.round(percent * 100)}%`}
            isAnimationActive
            animationDuration={1000}
          >
            {categoryData.map((entry, index) => (
              <Cell key={`slice-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{ color: '#cbd5e1', fontSize: '14px', paddingTop: '15px', textAlign: 'center' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </CardContent>
</Card>



       <Card className="chart-card">
  <CardHeader>
    <CardTitle className="dashboard-font text-2xl font-semibold text-black">
      Valor Inventario (Últimos 7 días)
    </CardTitle>
    <div className="chart-subtitle text-lg text-[#B0B0B0] mt-1">
      Evolución del valor total del inventario
    </div>
  </CardHeader>
  <CardContent>
    {/* Ajustar el fondo y asegurar que ocupe el 100% del espacio disponible */}
    <div className="bg-gradient-to-br from-[#04121a] via-[#071220] to-[#041018] p-6 rounded-xl shadow-2xl border border-white/10" style={{ height: '400px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={inventoryTimeline} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorInv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} axisLine={false} />
          <YAxis tick={{ fill: '#9ca3af' }} tickFormatter={(v) => `$${v}`} axisLine={false} />
          <CartesianGrid strokeDasharray="3 3" stroke="#07121c" />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2.5} dot={false} fill="url(#colorInv)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </CardContent>
</Card>


        <Card className="chart-card">
          <CardHeader>
            <CardTitle className="dashboard-font">Distribución de Stock</CardTitle>
            <div className="chart-subtitle">Proporción de productos en niveles Bajo / Normal / Alto</div>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-br from-[#021017] via-[#04121a] to-[#021015] p-3 rounded-xl shadow-2xl border border-white/5" style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={stockBuckets} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fill: '#cbd5e1' }} axisLine={false} />
                  <YAxis tick={{ fill: '#cbd5e1' }} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" barSize={28} radius={[8, 8, 8, 8]}>
                    {stockBuckets.map((entry, index) => (
                      <Cell key={`cell-b-${index}`} fill={index === 0 ? '#ef4444' : index === 1 ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="chart-card">
          <CardHeader>
            <CardTitle className="dashboard-font">Productos con Stock Bajo (Top 5)</CardTitle>
            <div className="chart-subtitle">Productos que requieren reposición urgente</div>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-br from-[#12090f] via-[#08101a] to-[#0b0f12] p-3 rounded-xl shadow-2xl border border-white/5" style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={lowStockItems.map(p => ({ name: p.name, displayName: truncate(p.name, 30), value: p.stock_quantity }))} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <XAxis type="number" tick={{ fill: '#cbd5e1' }} axisLine={false} />
                  <YAxis type="category" dataKey="displayName" width={220} tick={{ fill: '#e5e7eb' }} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={14}>
                    {lowStockItems.map((_, index) => (
                      <Cell key={`low-${index}`} fill={index === 0 ? '#ef4444' : '#fb7185'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* (Removed stats cards — dashboard shows graphs only) */}


    </div>
  );
};

export default Dashboard;
