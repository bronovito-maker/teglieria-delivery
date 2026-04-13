"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_STATUS_TRANSITIONS } from "@/lib/constants";
import { formatCurrency, formatTime } from "@/lib/utils";
import type { OrderWithItems } from "@/types";

const KANBAN_COLUMNS = ["RECEIVED", "CONFIRMED", "PREPARING", "READY", "OUT", "DELIVERED"];

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const prevCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchOrders = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(`/api/ordini?date=${today}`);
    const data = await res.json();
    setOrders(data);

    // Play sound on new order
    if (prevCountRef.current > 0 && data.length > prevCountRef.current) {
      audioRef.current?.play().catch(() => {});
    }
    prevCountRef.current = data.length;
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  async function updateStatus(orderId: string, status: string) {
    await fetch(`/api/ordini/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchOrders();
  }

  return (
    <div>
      {/* Hidden audio for notification */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH+Jj4+Lh4J/fH5+goaIiYiGgoB9fH1/goaIioqIhoJ/fHx+gYWIioqIhoJ+fHx+gYWIioqIhoN+fHt9gIWIiomHhIF+fHx+gYWHiYiHhYJ/fXx9f4KFh4iHhYOAfnx8foCDhoiHhoSBf319foGEhoeGhYOBf359f4GEhoaGhIKAf359foCDhYaFhIOBf35+foCChYWFhIOBf359foGDhIWEg4KAf35+foCChIWEg4KAf35+fn+ChISEg4F/fn5+f4GDhISDgoB/fn1+f4GDg4ODgYB/fn5+f4GCg4OCgYB/fn5+f4GCg4OCgYB/fn5+foGCgoKBgH9/fn5+f4GCgoKBgH9+fn5+f4GBgoGAgH9+fn5+f4GBgYGAgH9+fn5/f4CBAAAAAIAAAACAf4B/gH+Af4B/gICAgICAgICAgICAgA==" type="audio/wav" />
      </audio>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {orders.length} ordini oggi
          </span>
          <span className="text-sm text-gray-500">
            Totale: {formatCurrency(orders.filter(o => o.status !== "CANCELLED").reduce((s, o) => s + Number(o.total), 0))}
          </span>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((status) => {
          const columnOrders = orders.filter((o) => o.status === status);
          return (
            <div key={status} className="min-w-[250px] flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${ORDER_STATUS_COLORS[status]}`}>
                  {ORDER_STATUS_LABELS[status]}
                </span>
                <span className="text-xs text-gray-400">({columnOrders.length})</span>
              </div>
              <div className="space-y-2">
                {columnOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-lg shadow-sm p-3 border-l-4"
                    style={{ borderLeftColor: status === "RECEIVED" ? "#f59e0b" : status === "CANCELLED" ? "#ef4444" : "#f97316" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">#{order.orderNumber}</span>
                      <span className="text-[10px] text-gray-400">{formatTime(order.createdAt)}</span>
                    </div>
                    <p className="text-sm font-medium">{order.customerName}</p>
                    <p className="text-xs text-gray-500">
                      {order.type === "ASPORTO" ? "Asporto" : "Delivery"}
                      {order.type === "DELIVERY" && order.address && ` - ${order.address}`}
                    </p>
                    <div className="mt-1.5 text-xs text-gray-600">
                      {order.items.slice(0, 3).map((item) => (
                        <p key={item.id}>{item.quantity}x {item.productName}</p>
                      ))}
                      {order.items.length > 3 && <p className="text-gray-400">+{order.items.length - 3} altri</p>}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <span className="font-semibold text-sm">{formatCurrency(Number(order.total))}</span>
                      <div className="flex gap-1">
                        {ORDER_STATUS_TRANSITIONS[status]?.map((nextStatus) => (
                          <button
                            key={nextStatus}
                            onClick={() => updateStatus(order.id, nextStatus)}
                            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                              nextStatus === "CANCELLED"
                                ? "bg-red-100 text-red-700 hover:bg-red-200"
                                : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                            }`}
                          >
                            {ORDER_STATUS_LABELS[nextStatus]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {columnOrders.length === 0 && (
                  <p className="text-xs text-gray-300 text-center py-4">Nessun ordine</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
