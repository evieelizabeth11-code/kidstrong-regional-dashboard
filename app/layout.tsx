import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${protocol}://${host}` : "https://classview.openai.site";
  const description =
    "Compare trial performance and center call activity across Brick, Mount Laurel, Voorhees, and Turnersville.";

  return {
    title: "KidStrong Regional Dashboard",
    description,
    openGraph: {
      title: "KidStrong Regional Dashboard",
      description,
      images: [{ url: `${origin}/og-v2.png`, width: 1731, height: 909, alt: "KidStrong Regional Dashboard in navy and green" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "KidStrong Regional Dashboard",
      description,
      images: [`${origin}/og-v2.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
