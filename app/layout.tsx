import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
// import { Navbar } from "../components/navbar"
import Footer from "@/components/footer"
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Dev Formatter",
  description: "Markdown renderer, JSON pretty print, and escape/unescape string tools",
  generator: 'rakha.id',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Analytics />
        {/* <Navbar /> */}
        {children}
        <Footer />
      </body>
    </html>
  )
}
