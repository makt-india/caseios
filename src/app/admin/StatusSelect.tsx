"use client";

import { useTransition } from "react";
import { updateOrderStatus } from "@/app/actions";

export default function StatusSelect({ orderId, initialStatus }: { orderId: string, initialStatus: string }) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as any;
    startTransition(async () => {
      await updateOrderStatus(orderId, newStatus);
    });
  };

  return (
    <select 
      name="status"
      defaultValue={initialStatus}
      onChange={handleStatusChange}
      disabled={isPending}
      className={`bg-transparent text-[10px] text-emerald-400 uppercase tracking-widest focus:outline-none cursor-pointer hover:bg-white/10 rounded px-1 transition-colors ${isPending ? 'opacity-50' : ''}`}
    >
      <option value="pending">pending</option>
      <option value="paid">paid</option>
      <option value="shipped">shipped</option>
      <option value="completed">completed</option>
    </select>
  );
}
