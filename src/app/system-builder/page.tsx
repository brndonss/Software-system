import { redirect } from "next/navigation";
import CommandCanvas from "@/app/components/CommandCanvas";
import { requireUser } from "@/lib/auth";

export default async function SystemBuilderPage() {
  const result = await requireUser();
  if (!result.user) redirect("/login?error=Sign%20in%20to%20continue");
  return <CommandCanvas />;
}
