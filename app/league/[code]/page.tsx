import { redirect } from "next/navigation";

type Params = Promise<{ code: string }>;

export default async function LeaguePage({ params }: { params: Params }) {
  await params;
  redirect("/bracket");
}
