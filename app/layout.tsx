import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Browser LLM Demo — juanchi.dev",
  description: "Un modelo de lenguaje corriendo 100% en el browser, sin servidor ni API. Demo de transformers.js + Next.js.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
