"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/constants";

export default function RiderDashboard() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/rider/login");
      } else {
        setUser(user);
        fetchRiderOrders(user.id);
      }
    }
    checkAuth();
  }, [router, supabase]);

  async function fetchRiderOrders(authUserId: string) {
    const res = await fetch(`/api/rider/ordini?authUserId=${authUserId}`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data);
    }
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/rider/login");
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Le mie Consegne</h1>
          <p className="text-sm text-slate-500">Benvenuto, Rider!</p>
        </div>
        <button onClick={handleLogout} className="text-sm font-bold text-red-500 bg-red-50 px-4 py-2 rounded-xl">
          Esci
        </button>
      </header>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-400 mb-4">Non hai ancora preso in carico nessun ordine.</p>
            <p className="text-sm text-slate-400">Usa il QR code sullo scontrino per assegnarti un ordine.</p>
          </div>
        ) : (
          orders.map((order) => (
            <div 
              key={order.id} 
              onClick={() => router.push(`/rider/ordine/${order.id}`)}
              className="bg-white rounded-2xl shadow-sm border p-4 flex justify-between items-center active:bg-slate-50 transition-colors cursor-pointer"
            >
              <div>
                <p className="font-bold text-lg">#{order.orderNumber}</p>
                <p className="text-sm text-slate-500">{order.customerName}</p>
                <p className="text-xs text-slate-400 font-mono mt-1">{order.address}</p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase ${ORDER_STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"}`}>
                  {ORDER_STATUS_LABELS[order.status] || order.status}
                </span>
                <p className="text-sm font-black text-slate-800 mt-2">
                  {order.estimatedTime ? new Date(order.estimatedTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "N/D"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 p-6 bg-orange-100 rounded-3xl text-orange-800">
        <h3 className="font-bold mb-1">Come funziona?</h3>
        <p className="text-sm opacity-90">
          Quando uno scontrino viene stampato, scansiona il QR code per assegnarti la consegna. 
          L&apos;ordine apparirà qui automaticamente.
        </p>
      </div>
    </div>
  );
}
