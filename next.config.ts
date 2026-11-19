import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    qualities: [75, 90],
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  outputFileTracingIncludes: {
    "/api/chat": ["./docs/chatbot-faq.md", "./docs/TRIOVO_AI_KNOWLEDGE.md"],
  },
};

export default nextConfig;
