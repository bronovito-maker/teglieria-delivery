"use client";

import ProductForm from "@/components/admin/ProductForm";
import { useParams } from "next/navigation";

export default function EditProdottoPage() {
  const params = useParams();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Modifica prodotto</h1>
      <ProductForm productId={params.id as string} />
    </div>
  );
}
