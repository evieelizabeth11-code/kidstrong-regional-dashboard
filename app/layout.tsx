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
    title: "KidStrong | Regional Trial Performance",
    description,
    openGraph: {
      title: "Trial Performance Command Center",
      description,
      images: [{ url: `${origin}/og.png`, width: 1733, height: 907, alt: "Classview dashboard preview" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Trial Performance Command Center",
      description,
      images: [`${origin}/og.png`],
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
