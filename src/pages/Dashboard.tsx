import React, { useEffect } from "react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Building2, Tags, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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

    // Fetch categories
    const { data: categories } = await supabase
      .from("categories")
      .select("id");

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

  const statCards = [
    {
      title: "Total Productos",
      value: stats.totalProducts,
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Stock Bajo",
      value: stats.lowStockProducts,
      icon: AlertTriangle,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Proveedores",
      value: stats.totalSuppliers,
      icon: Building2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Categorías",
      value: stats.totalCategories,
      icon: Tags,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Valor Inventario",
      value: `$${stats.totalInventoryValue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Stock Promedio",
      value: Math.round(stats.averageStockLevel),
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Vista general del sistema de inventario
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-full p-2 ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Productos con Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockItems.map((product) => {
                const stockPercentage = (product.stock_quantity / product.min_stock) * 100;
                return (
                  <div key={product.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{product.name}</span>
                      <span className="text-muted-foreground">
                        {product.stock_quantity} / {product.min_stock} unidades
                      </span>
                    </div>
                    <Progress value={stockPercentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
