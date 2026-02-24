export const metadata = {
  title: 'RAG2.0 AGI',
  description: 'Autonomous Intelligence System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
