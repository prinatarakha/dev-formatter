"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Save, Plus, Copy } from "lucide-react"

function prettyPrintString(inputString: string): string {
  // Show the actual string representation with escaped characters
  return JSON.stringify(inputString, null, 2)
    .slice(1, -1) // Remove the outer quotes
    .replace(/\\n/g, "\\n\n") // Show \n on new lines for readability
    .replace(/\\t/g, "\\t    ") // Show \t with visual spacing
    .replace(/\\r/g, "\\r") // Show \r
    .replace(/\\"/g, '\\"') // Show escaped quotes
    .replace(/\\\\/g, "\\\\") // Show escaped backslashes
}

interface StringVersion {
  id: number
  content: string
  timestamp: Date
}

export default function StringPrettyPrint() {
  const [versions, setVersions] = useState<StringVersion[]>([
    {
      id: 1,
      content: `Hello World!\nThis is a string with\ttabs and "quotes".\nIt also has\\backslashes and\r\ncarriage returns.`,
      timestamp: new Date(),
    },
  ])

  const [currentVersionIndex, setCurrentVersionIndex] = useState(0)
  const [currentContent, setCurrentContent] = useState(versions[0].content)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const currentVersion = versions[currentVersionIndex]

  useEffect(() => {
    setCurrentContent(currentVersion.content)
    setHasUnsavedChanges(false)
  }, [currentVersion])

  const handleContentChange = (content: string) => {
    setCurrentContent(content)
    setHasUnsavedChanges(content !== currentVersion.content)
  }

  const saveCurrentVersion = () => {
    const updatedVersions = [...versions]
    updatedVersions[currentVersionIndex] = {
      ...currentVersion,
      content: currentContent,
      timestamp: new Date(),
    }
    setVersions(updatedVersions)
    setHasUnsavedChanges(false)
  }

  const createNewVersion = () => {
    const newVersion: StringVersion = {
      id: Math.max(...versions.map((v) => v.id)) + 1,
      content: currentContent,
      timestamp: new Date(),
    }
    const newVersions = [...versions, newVersion]
    setVersions(newVersions)
    setCurrentVersionIndex(newVersions.length - 1)
    setHasUnsavedChanges(false)
  }

  const goToPreviousVersion = () => {
    if (currentVersionIndex > 0) {
      setCurrentVersionIndex(currentVersionIndex - 1)
    }
  }

  const goToNextVersion = () => {
    if (currentVersionIndex < versions.length - 1) {
      setCurrentVersionIndex(currentVersionIndex + 1)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(prettyString)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const prettyString = prettyPrintString(currentContent)

  return (
    <div className="h-screen flex flex-col bg-gray-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Escape String</h1>

          <div className="flex items-center gap-2">
            {/* Version Navigation */}
            <div className="flex items-center gap-1 mr-4">
              <Button variant="outline" size="sm" onClick={goToPreviousVersion} disabled={currentVersionIndex === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="text-sm text-gray-600 px-2">
                Version {currentVersionIndex + 1} of {versions.length}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={goToNextVersion}
                disabled={currentVersionIndex === versions.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Save and Create Buttons */}
            <Button variant="outline" size="sm" onClick={saveCurrentVersion} disabled={!hasUnsavedChanges}>
              <Save className="h-4 w-4 mr-2" />
              Save Version
            </Button>

            <Button size="sm" onClick={createNewVersion}>
              <Plus className="h-4 w-4 mr-2" />
              New Version
            </Button>
          </div>
        </div>

        {hasUnsavedChanges && <div className="mt-2 text-sm text-amber-600">You have unsaved changes</div>}
      </div>

      {/* Split Screen Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - String Input */}
        <div className="w-1/2 flex flex-col border-r border-gray-200">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">String Input</h2>
          </div>
          <div className="flex-1 p-4">
            <textarea
              value={currentContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full h-full resize-none border border-gray-300 rounded-lg p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your string here..."
            />
          </div>
        </div>

        {/* Right Side - Pretty Printed Output */}
        <div className="w-1/2 flex flex-col">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Escaped String</h2>
            <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-8 w-8 p-0">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto">
            <Card className="m-4 h-[calc(100%-2rem)]">
              <pre className="p-6 h-full overflow-auto text-sm font-mono whitespace-pre-wrap bg-gray-50">
                {prettyString}
              </pre>
            </Card>
          </div>
        </div>
      </div>
      {copySuccess && (
        <div className="absolute top-20 right-8 bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm z-10">
          Copied to clipboard!
        </div>
      )}
    </div>
  )
}
