"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Save, Plus, Copy } from "lucide-react"

function prettyPrintJSON(jsonString: string): string {
  try {
    const parsed = JSON.parse(jsonString)
    return JSON.stringify(parsed, null, 2)
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : "Invalid JSON"}`
  }
}

interface JSONVersion {
  id: number
  content: string
  timestamp: Date
}

export default function JSONPrettyPrint() {
  const [versions, setVersions] = useState<JSONVersion[]>([
    {
      id: 1,
      content: `{"name":"John Doe","age":30,"city":"New York","hobbies1":["readingreadingreadingreadingreadingreadingreadingreadingreadingreading","swimming","coding"],"hobbies2":["reading","swimming","coding"],"hobbies3":["reading","swimming","coding"],"address":{"street":"123 Main St","zipCode":"10001","country":"USA"},"isActive":true,"balance":1250.75,"metadata":null}`,
      timestamp: new Date(),
    },
  ])

  const [currentVersionIndex, setCurrentVersionIndex] = useState(0)
  const [currentContent, setCurrentContent] = useState(versions[0].content)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const currentVersion = versions[currentVersionIndex]

  const [copySuccess, setCopySuccess] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(prettyJSON)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

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
    const newVersion: JSONVersion = {
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

  const prettyJSON = prettyPrintJSON(currentContent);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">JSON Pretty Print</h1>

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
        {/* Left Side - JSON Input */}
        <div className="w-1/2 flex flex-col border-r border-gray-200">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">JSON Input</h2>
          </div>
          <div className="flex-1 p-4">
            <textarea
              value={currentContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full h-full resize-none border border-gray-300 rounded-lg p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your JSON here..."
            />
          </div>
        </div>

        {/* Right Side - Pretty Printed Output */}
        <div className="w-1/2 flex flex-col">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Pretty Printed JSON</h2>
            <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-8 w-8 p-0">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 flex overflow-auto">
            <Card className="m-4 h-[calc(100%-2rem)] flex-1 flex">
              <div className="flex h-full overflow-auto w-full">
                {/* Line Numbers */}
                <div className="py-1 flex-shrink-0">
                  <pre className="text-sm font-mono text-gray-500 leading-6">
                    {prettyJSON.split("\n").map((_, index) => (
                      <div key={index} className="bg-gray-50 border-r border-gray-200 px-2 text-right">{index + 1}</div>
                    ))}
                  </pre>
                </div>
                {/* JSON Content */}
                <div className="flex-1">
                  <pre className="px-6 py-1 h-full text-sm font-mono leading-6">
                    {prettyJSON}
                  </pre>
                </div>
              </div>
            </Card>
          </div>
          {copySuccess && (
            <div className="absolute top-20 right-8 bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm">
              Copied to clipboard!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
