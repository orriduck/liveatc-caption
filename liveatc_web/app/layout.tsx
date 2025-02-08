import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "LiveATC Caption - Air Traffic Control with Captions",
  description: "Listen to live air traffic control communications with real-time captions. Search by airport code (ICAO/IATA) to find available feeds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground">
        {children}
        <Toaster 
          className="font-['Jura']"
          toastOptions={{
            style: {
              fontFamily: 'Jura, var(--font-geist-sans)',
            },
          }}
        />
      </body>
    </html>
  )
}
