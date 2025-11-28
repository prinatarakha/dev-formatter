"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"

interface NavigationHeaderProps {
  currentTool: string
}

const tools = [
  { name: "Markdown Renderer", path: "/" },
  { name: "JSON Pretty Print", path: "/json" },
  { name: "Escape String", path: "/escape" },
  { name: "Unescape String", path: "/unescape" },
  { name: "Refine AI Prompt", path: "/refine-prompt" },
]

export default function NavigationHeader({ currentTool }: NavigationHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleToolSelect = (path: string) => {
    setIsOpen(false)
    router.push(path)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors"
      >
        <span className="text-3xl pr-2">👨‍💻</span>
        {currentTool}
        <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-2">
            {tools.map((tool) => (
              <button
                key={tool.path}
                onClick={() => handleToolSelect(tool.path)}
                className={`w-full px-4 py-2 text-left transition-colors ${
                  tool.name === currentTool ? "bg-gray-100 font-semibold text-gray-900" : "hover:bg-gray-100 text-gray-700" 
                }`}
              >
                {tool.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 