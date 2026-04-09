export const metadata = {
  title: "Snooker Club Scoreboard",
  description: "Live referee scoring for club tournaments",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#f1f5f9",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  )
}
