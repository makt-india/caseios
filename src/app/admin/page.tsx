export const dynamic = "force-dynamic";

import { 
  getProducts, addProduct, deleteProduct, adminLogout, getOrders, 
  getContactLeads, deleteOrder, getCompletedRevenue, updateOrderStatus,
  getAdminLogs, getAdminSessions
} from "@/app/actions";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import Image from "next/image";
import { 
  Plus, Trash, LogOut, Lock, LayoutDashboard, Users, Box, 
  CreditCard, Clock, MessageSquare, ShieldCheck, Search, Filter, Monitor
} from "lucide-react";
import Link from "next/link";
import { generateCSRFToken } from "@/lib/csrf";
import { Product, Order, ContactMessage } from "@/lib/types";
import { redirect } from "next/navigation";
import StatusSelect from "./StatusSelect";

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ view?: string; search?: string; status?: string }> }) {
  // Authentication Shield using Unified Auth mechanism
  try {
    await requireAdmin();
  } catch (error) {
    // If not admin, redirect to central login
    redirect("/login");
  }

  // Next.js 15 requires awaiting searchParams
  const params = await searchParams;
  const view = params?.view || "inventory";

  const searchFilter = params?.search || "";
  const statusFilter = params?.status as any;

  const [products, orders, feedback, completedRevenue, adminLogs, adminSessions, currentUser] = await Promise.all([
    getProducts(),
    getOrders({ search: searchFilter, status: statusFilter }),
    getContactLeads(),
    getCompletedRevenue(),
    view === "security" ? getAdminLogs() : Promise.resolve([]),
    view === "security" ? getAdminSessions() : Promise.resolve([]),
    getCurrentUser(),
  ]);

  return (
    <div className="min-h-screen pt-24 pb-32 px-6 w-full max-w-[1600px] mx-auto bg-background relative flex flex-col lg:flex-row gap-12">
      {/* Background Ambience */}
      <div className="absolute top-[10%] right-[10%] w-[600px] h-[300px] ambient-glow bg-blue-500/10 pointer-events-none" />
      
      {/* LEFT SIDEBAR PANEL */}
      <aside className="w-full lg:w-72 flex-shrink-0">
        <div className="sticky top-32 glass rounded-[2rem] p-6 border border-white/[0.05] shadow-2xl flex flex-col min-h-[600px]">
          <div className="mb-10 px-2">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center">
              <LayoutDashboard className="w-5 h-5 mr-3 text-white/50" />
              Command Center
            </h1>
            <p className="text-muted-foreground mt-2 text-xs">CASIOS Corporate Admin</p>
          </div>

          <nav className="flex-1 space-y-2">
            <Link href="/admin?view=inventory" className={`flex items-center px-4 py-3 rounded-xl transition-all ${view === "inventory" ? "bg-white/10 text-white font-medium" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}>
               <Box className="w-4 h-4 mr-3" />
               Inventory Mgmt
            </Link>
            <Link href="/admin?view=orders" className={`flex items-center px-4 py-3 rounded-xl transition-all ${view === "orders" ? "bg-white/10 text-white font-medium" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}>
               <Users className="w-4 h-4 mr-3" />
               Customer Orders
            </Link>
            <Link href="/admin?view=feedback" className={`flex items-center px-4 py-3 rounded-xl transition-all ${view === "feedback" ? "bg-white/10 text-white font-medium" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}>
               <MessageSquare className="w-4 h-4 mr-3" />
               Feedback & Leads
            </Link>
          </nav>

          <form action={adminLogout} className="mt-auto pt-6 border-t border-white/10">
            <Button variant="ghost" type="submit" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl px-4">
              <LogOut className="w-4 h-4 mr-3" />
              Terminate Session
            </Button>
          </form>
        </div>
      </aside>

      {/* RIGHT CONTENT AREA */}
      <main className="flex-1 relative z-10 w-full min-w-0 space-y-8">
        
        {/* METRICS DASHBOARD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass p-6 rounded-3xl border border-white/5 flex flex-col justify-center">
            <p className="text-muted-foreground text-sm font-medium mb-1 flex items-center"><Box className="w-4 h-4 mr-2" /> Active Products</p>
            <p className="text-3xl font-bold text-white">{products.length}</p>
          </div>
          <div className="glass p-6 rounded-3xl border border-white/5 flex flex-col justify-center">
            <p className="text-muted-foreground text-sm font-medium mb-1 flex items-center"><Users className="w-4 h-4 mr-2" /> Total Orders</p>
            <p className="text-3xl font-bold text-white">{orders.length}</p>
          </div>
          <div className="glass p-6 rounded-3xl border border-white/5 flex flex-col justify-center relative overflow-hidden">
             <div className="absolute top-1/2 right-[-10%] w-24 h-24 bg-emerald-500/20 rounded-full blur-[30px]" />
            <p className="text-emerald-400/80 text-sm font-medium mb-1 flex items-center"><CreditCard className="w-4 h-4 mr-2" /> Total Revenue</p>
            <p className="text-3xl font-bold text-emerald-400">
               ₹{completedRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* INVENTORY VIEW */}
        {view === "inventory" && (
           <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              {/* Product Injection */}
              <div className="xl:col-span-4 h-fit">
                <div className="glass rounded-[2rem] p-8 border border-white/[0.05] shadow-xl relative overflow-hidden">
                  <h2 className="text-xl font-medium tracking-tight mb-6 text-white relative z-10">Inject Product</h2>
                  <form action={addProduct} className="space-y-4 relative z-10">
                    <input type="text" name="name" placeholder="Nomenclature (Name)" required className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-white/30" />
                    <input type="text" name="category" placeholder="Classification (Category)" required className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-white/30" />
                    <input type="number" step="0.01" name="price" placeholder="Valuation (₹)" required className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-white/30" />
                    <input type="text" name="image" placeholder="Image URI" required className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-white/30" defaultValue="/images/hero.png" />
                    <textarea name="description" placeholder="Technical Specifications" required className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-white/30 min-h-[120px]" />
                    <Button type="submit" size="lg" className="w-full mt-2 rounded-xl bg-white text-black hover:bg-zinc-200">
                      <Plus className="w-5 h-5 mr-2" />
                      Initialize Listing
                    </Button>
                  </form>
                </div>
              </div>

              {/* Product Table */}
              <div className="xl:col-span-8">
                <div className="glass p-8 rounded-[2rem] border border-white/[0.05] shadow-xl min-h-[600px]">
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
                      <h2 className="text-xl font-medium text-white">Global Inventory</h2>
                      <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-semibold tracking-widest">{products.length} DEPLOYED</span>
                  </div>
                  
                  {products.length === 0 ? (
                    <div className="text-muted-foreground border border-dashed border-white/10 rounded-2xl p-16 text-center">
                      <p>Database is empty. Populating storefront pending.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {products.map((p: Product) => (
                        <div key={p.id} className="flex gap-4 items-center p-3 bg-zinc-950/50 border border-white/5 rounded-2xl hover:bg-white/[0.02]">
                          <div className="w-16 h-16 bg-white/5 rounded-xl aspect-square relative flex-shrink-0">
                            <Image src={p.image || "/images/hero.png"} alt={p.name} fill className="object-contain p-2" />
                          </div>
                          <div className="flex-1 w-full min-w-0">
                            <h3 className="font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">{p.name}</h3>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">{p.category}</p>
                          </div>
                          <p className="text-sm text-white/80 font-medium px-4">₹{p.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                          <form action={deleteProduct.bind(null, p.id)}>
                            <Button variant="ghost" type="submit" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl px-3 transition-colors">
                              <Trash className="w-4 h-4" />
                            </Button>
                          </form>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
           </div>
        )}

        {/* CUSTOMER ORDERS CRM VIEW */}
        {view === "orders" && (
           <div className="glass p-10 rounded-[2rem] border border-white/[0.05] shadow-xl min-h-[600px]">
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/10">
                  <div>
                    <h2 className="text-2xl font-medium text-white">Customer Orders & Ledger</h2>
                    <p className="text-muted-foreground text-sm mt-1">Real-time gateway transaction logs.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <form className="relative flex items-center">
                      <Search className="absolute left-3 w-4 h-4 text-white/30" />
                      <input 
                        type="text" 
                        name="search" 
                        placeholder="Search customer..." 
                        defaultValue={searchFilter}
                        className="bg-zinc-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-white/30 text-white w-48 md:w-64"
                      />
                      <input type="hidden" name="view" value="orders" />
                    </form>
                    <span className="bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest flex items-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                      LIVE
                    </span>
                  </div>
              </div>

              {orders.length === 0 ? (
                 <div className="text-muted-foreground border border-dashed border-white/10 rounded-2xl p-16 text-center">
                    No transactions recorded yet.
                 </div>
              ) : (
                 <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-muted-foreground text-xs uppercase tracking-widest border-b border-white/10">
                          <th className="font-medium pb-4 pl-4">Customer</th>
                          <th className="font-medium pb-4">Date & Time</th>
                          <th className="font-medium pb-4">Payment Node</th>
                          <th className="font-medium pb-4 text-right">Total</th>
                          <th className="font-medium pb-4 w-12 text-right pr-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {orders.map((order: Order) => (
                           <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                             <td className="py-4 pl-4 min-w-[200px]">
                               <p className="text-white font-medium text-sm">{order.customerName}</p>
                               <p className="text-muted-foreground text-xs mt-0.5">{order.customerEmail}</p>
                               {order.address && (
                                 <p className="text-muted-foreground/60 text-[10px] mt-1.5 pr-4 uppercase leading-snug tracking-wider truncate max-w-[200px]" title={order.address}>
                                   {order.address}
                                 </p>
                               )}
                             </td>
                             <td className="py-4">
                               <div className="flex items-center text-sm text-white/70">
                                 <Clock className="w-3 h-3 mr-2 opacity-50" />
                                 {new Date(order.createdAt).toLocaleDateString()}
                                 <span className="ml-2 text-muted-foreground text-xs">
                                   {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </span>
                               </div>
                             </td>
                             <td className="py-4">
                               <div className="flex items-center text-sm">
                                 <CreditCard className="w-3 h-3 mr-2 opacity-50 text-white text-muted-foreground" />
                                 <span className="bg-white/10 text-white/80 px-2.5 py-1 rounded-md text-xs font-medium">
                                   {order.paymentMethod}
                                 </span>
                               </div>
                             </td>
                             <td className="py-4 text-right">
                               <p className="text-white font-semibold text-sm">
                                 ₹{order.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                               </p>
                               <div className="flex justify-end items-center mt-1">
                                 <StatusSelect orderId={order.id} initialStatus={order.status} />
                               </div>
                             </td>
                             <td className="py-4 pr-4 text-right">
                               <form action={deleteOrder.bind(null, order.id)}>
                                 <Button variant="ghost" type="submit" className="text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-xl px-3 transition-colors opacity-0 group-hover:opacity-100">
                                   <Trash className="w-4 h-4" />
                                 </Button>
                               </form>
                             </td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              )}
           </div>
        )}

        {/* FEEDBACK & LEADS VIEW */}
        {view === "feedback" && (
           <div className="glass p-10 rounded-[2rem] border border-white/[0.05] shadow-xl min-h-[600px]">
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/10">
                  <div>
                    <h2 className="text-2xl font-medium text-white">Customer Feedback & Inquiries</h2>
                    <p className="text-muted-foreground text-sm mt-1">Direct communication channel logs.</p>
                  </div>
                  <span className="bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest">
                    {feedback.length} MESSAGES
                  </span>
              </div>

              {feedback.length === 0 ? (
                 <div className="text-muted-foreground border border-dashed border-white/10 rounded-2xl p-16 text-center">
                    No feedback received yet.
                 </div>
              ) : (
                 <div className="space-y-4">
                    {feedback.map((msg: ContactMessage) => (
                       <div key={msg.id} className="p-6 bg-zinc-950/50 border border-white/5 rounded-3xl hover:bg-white/[0.02] transition-colors relative group">
                          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-4">
                            <div>
                               <h3 className="font-medium text-white text-lg">{msg.firstName} {msg.lastName}</h3>
                               <p className="text-emerald-400 text-sm mt-0.5">{msg.email}</p>
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground bg-white/5 px-3 py-1.5 rounded-lg">
                               <Clock className="w-3 h-3 mr-2 opacity-50" />
                               {new Date(msg.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                             {msg.message}
                          </div>
                       </div>
                    ))}
                 </div>
              )}
           </div>
        )}

         {/* SECURITY & ACTIVITY VIEW */}
        {view === "security" && (
           <div className="space-y-8">
              {/* Current Session Metadata */}
              <div className="glass p-8 rounded-[2rem] border border-white/[0.05] shadow-xl">
                 <h2 className="text-xl font-medium text-white mb-6 flex items-center">
                   <Monitor className="w-5 h-5 mr-3 text-blue-400" />
                   Your Active Session
                 </h2>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                       <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Authenticated ID</p>
                       <p className="text-sm font-mono text-white/80 truncate">{currentUser?.email}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                       <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Last Request IP</p>
                       <p className="text-sm font-mono text-white/80">{adminSessions[0]?.ipAddress || "Verified"}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                       <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Role Authority</p>
                       <p className="text-sm font-semibold text-emerald-400 uppercase">{currentUser?.role}</p>
                    </div>
                 </div>
              </div>

              {/* Activity Logs */}
              <div className="glass p-10 rounded-[2rem] border border-white/[0.05] shadow-xl min-h-[500px]">
                 <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
                    <div>
                       <h2 className="text-2xl font-medium text-white">System Activity Logs</h2>
                       <p className="text-muted-foreground text-sm mt-1">Audit trail for administrative mutations.</p>
                    </div>
                 </div>
                 <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="text-muted-foreground text-[10px] uppercase tracking-widest border-b border-white/10">
                             <th className="font-medium pb-4 pl-4">Admin</th>
                             <th className="font-medium pb-4">Event</th>
                             <th className="font-medium pb-4">IP Address</th>
                             <th className="font-medium pb-4 text-right pr-4">Timestamp</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {adminLogs.map((log: any) => (
                             <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="py-4 pl-4">
                                   <p className="text-white text-xs font-medium">Admin-User</p>
                                   <p className="text-[10px] text-muted-foreground">{log.adminId}</p>
                                </td>
                                <td className="py-4">
                                   <span className="bg-white/10 text-white/70 px-2 py-0.5 rounded text-[10px] border border-white/5 uppercase">
                                      {log.action.replace('_', ' ')}
                                   </span>
                                </td>
                                <td className="py-4 font-mono text-[10px] text-muted-foreground">
                                   {log.ip}
                                </td>
                                <td className="py-4 text-right pr-4 text-[10px] text-muted-foreground">
                                   {new Date(log.createdAt).toLocaleString()}
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        )}


      </main>
    </div>
  );
}
