import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMyOrders } from "@/app/actions";
import { User, Package, Calendar, Mail, Shield, ShoppingBag, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const orders = await getMyOrders();

  return (
    <div className="min-h-screen bg-background pt-24 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold tracking-tight text-white mb-4">My Dashboard</h1>
          <p className="text-muted-foreground text-lg">Manage your account and track your premium orders.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar / User Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass rounded-[2.5rem] p-8 border border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-white/10 transition-colors duration-500" />
              
              <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                <User className="w-10 h-10 text-white/50" />
              </div>
              
              <h2 className="text-2xl font-semibold text-white mb-1">{user.name}</h2>
              <p className="text-muted-foreground text-sm mb-6 flex items-center gap-2">
                <Mail className="w-3 h-3" /> {user.email}
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-white/40" />
                    <span className="text-sm text-white/70">Role</span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-white/50">{user.role}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-white/40" />
                    <span className="text-sm text-white/70">Joined</span>
                  </div>
                  <span className="text-xs text-white/50">{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="glass rounded-[2rem] p-6 border border-white/10">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/30 mb-4 px-2">Account Actions</h3>
              <div className="space-y-1">
                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group text-left">
                  <span className="text-sm text-white/70 group-hover:text-white transition-colors">Edit Profile</span>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group text-left">
                  <span className="text-sm text-white/70 group-hover:text-white transition-colors">Security Settings</span>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content / Orders */}
          <div className="lg:col-span-2 space-y-6" id="orders">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
                <Package className="w-6 h-6 text-white/50" /> Order History
              </h2>
              <span className="text-sm text-muted-foreground">{orders.length} Orders total</span>
            </div>

            {orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="glass rounded-[2rem] p-6 border border-white/10 hover:border-white/20 transition-all group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-white/50 group-hover:scale-110 transition-transform" />
                        </div>
                        <div>
                          <p className="text-white font-medium">Order #{order.id.slice(-8).toUpperCase()}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                              order.paymentStatus === "completed" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                            )}>
                              {order.paymentStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-8 border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Total</p>
                          <p className="text-xl font-bold text-white">₹{order.amount.toLocaleString()}</p>
                        </div>
                        <button className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Items Preview */}
                    <div className="mt-6 pt-6 border-t border-white/5 flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex-shrink-0 w-14 h-14 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center p-1 relative group/item">
                          <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover rounded-lg opacity-70 group-hover/item:opacity-100 transition-opacity" />
                          <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-black text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg border border-black">
                            {item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass rounded-[2rem] p-16 border border-white/10 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                  <ShoppingBag className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No orders yet</h3>
                <p className="text-muted-foreground mb-8 max-w-xs">Start your collection today and experience premium quality.</p>
                <Link href="/shop" className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-all">
                  Shop Products
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
