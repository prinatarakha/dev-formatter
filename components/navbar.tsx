"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Markdown Renderer" },
  { href: "/json", label: "JSON Pretty Print" },
  { href: "/escape", label: "Escape String" },
  { href: "/unescape", label: "Unescape String" },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="px-4">
        <div className="flex h-16 items-center space-x-8 justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">Formatter 🔥</h1>
          </div>
          <div className="flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-2 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "text-gray-900 border-b border-gray-900"
                    : "text-gray-600 hover:text-gray-900 hover:border-b border-gray-900 transition-colors duration-200",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
