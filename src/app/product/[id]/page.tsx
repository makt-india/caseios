// Product detail page is always dynamic — uses route params which are request-time.
import { getProductById } from "@/app/actions";
import ClientProduct from "./ClientProduct";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const product = await getProductById(resolvedParams.id);
  
  if (!product) {
    return <div>Product not found</div>;
  }
  
  return <ClientProduct product={product} />;
}
