import { redirect } from "next/navigation";

export default async function LegacyChannelPage({ params }) {
  const { icao } = await params;
  redirect(`/${String(icao || "").toUpperCase()}`);
}
