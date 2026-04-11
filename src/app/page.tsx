// No force-dynamic — page is now statically cached via `use cache` in getProducts()
// Product list revalidates when admin adds/deletes products via revalidateTag("products")
import ClientHome from "./ClientHome";
import { getProducts } from "@/app/actions";

export default async function Home() {
  const products = await getProducts();
  return <ClientHome products={products} />;
}
