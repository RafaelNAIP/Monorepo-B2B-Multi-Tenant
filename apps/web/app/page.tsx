import { redirect } from "next/navigation";

/**
 * Página raiz — redireciona para o tenant de demonstração.
 */
export default function RootPage() {
  redirect("/demo/auth");
}
