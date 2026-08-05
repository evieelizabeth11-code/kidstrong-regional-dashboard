import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the PDF engine and its optional native text-extraction support out
  // of the webpack bundle so Vercel can load the correct Linux package.
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/api/scorecard": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/.pnpm/pdfjs-dist@5.4.296/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
  // vinext's worker bundle does not receive Vercel's runtime process.env.
  // Inline these server-only values at build time; they are referenced only
  // by the private scorecard API route and never by a client component.
  env: {
    SCORECARD_UPLOAD_PASSWORD: process.env.SCORECARD_UPLOAD_PASSWORD ?? "",
    SCORECARD_WEBHOOK_SECRET: process.env.SCORECARD_WEBHOOK_SECRET ?? "",
    SCORECARD_WEBHOOK_URL: process.env.SCORECARD_WEBHOOK_URL ?? "",
  },
};

export default nextConfig;
