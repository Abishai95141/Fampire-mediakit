import { redirect } from "next/navigation";

/** The Media Center is the product; "/" only exists so the bare domain lands
 *  somewhere real instead of 404ing. */
export default function RootPage() {
  redirect("/fampire");
}
