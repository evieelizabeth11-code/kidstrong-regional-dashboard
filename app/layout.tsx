import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${protocol}://${host}` : "https://classview.openai.site";
  const description =
    "Compare trial volume, show rate, close rate, day-of-week performance, and class-time opportunities across Brick, Mount Laurel, and Voorhees.";

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
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
