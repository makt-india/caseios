export const dynamic = "force-dynamic";
import ClientHome from "./ClientHome";
import { getProducts } from "@/app/actions";

export default async function Home() {
  const products = await getProducts();
  return <ClientHome products={products} />;
}
