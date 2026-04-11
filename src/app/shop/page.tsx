// Products are served from cache (via use cache in getProducts)
// and revalidated via cacheTag when admin mutates the product list.

import ClientHome from "@/app/ClientHome";
import { getProducts } from "@/app/actions";

export default async function ShopPage() {
  const products = await getProducts();
  
  return (
    <div className="pt-24 flex-1">
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">All Products</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Discover our entire lineup of premium technology.
        </p>
      </div>
      <ClientHome products={products} />
    </div>
  );
}
