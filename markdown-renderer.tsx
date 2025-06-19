"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Save, Plus } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"

// Enhanced markdown parser with proper escaping and formatting
function parseMarkdown(markdown: string): string {
  let result = markdown

  // First, protect content inside code blocks (triple backticks)
  const codeBlocks: string[] = []
  result = result.replace(/```([\s\S]*?)```/g, (match, content) => {
    const index = codeBlocks.length
    codeBlocks.push(`<pre class='bg-gray-800 p-2 rounded-md'><code class='text-sm font-mono text-white'>${content.trim()}</code></pre>`)
    return `\n__CODE_BLOCK_${index}__\n`
  })

  // Then protect inline code spans
  const codeSpans: string[] = []
  result = result.replace(/`([^`]*)`/g, (match, content) => {
    const index = codeSpans.length
    codeSpans.push(`<code class='text-sm font-mono bg-gray-100 p-1 rounded-md'>${content}</code>`)
    return `__CODE_SPAN_${index}__`
  })

  // Horizontal rules (---)
  result = result.replace(/^---$/gm, "<hr class='my-4' />")

  // Bold and Italic (only if not protected by backticks)
  result = result.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
  result = result.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>"); // "[^*\n]+" means it only excludes * and newline, not the letter "n"

  // Headers
  result = result.replace(/^### (.*$)/gim, "<h3 class='text-lg font-semibold mt-1'>$1</h3>")
  result = result.replace(/^## (.*$)/gim, "<h2 class='text-xl font-semibold mt-2'>$1</h2>")
  result = result.replace(/^# (.*$)/gim, "<h1 class='text-2xl font-semibold'>$1</h1>")

  // Links
  result = result.replace(/\[([^\]]*)\]\(([^)]*)\)/g, "<a href='$2' target='_blank' rel='noopener noreferrer' class='text-blue-700 hover:text-blue-800 underline'>$1</a>")

  // Process lists line by line
  const lines = result.split("\n")
  const processedLines: string[] = []
  const listStack: Array<{ type: "ul" | "ol"; level: number; startNumber?: number }> = []
  let currentOlNumber = 1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip code block placeholders
    if (line.trim().startsWith("__CODE_BLOCK_")) {
      // Close any open lists before code block
      while (listStack.length > 0) {
        const list = listStack.pop()!
        processedLines.push(`</${list.type}>`)
      }
      processedLines.push(line)
      continue
    }

    // Count leading spaces for indentation (2 spaces = 1 level)
    const leadingSpaces = line.match(/^(\s*)/)?.[1] || ""
    const indentLevel = Math.floor(leadingSpaces.length / 2)
    const trimmedLine = line.trim()

    // Check for numbered list
    const numberedMatch = trimmedLine.match(/^\d+\.\s+(.*)$/)
    // Check for bullet list
    const bulletMatch = trimmedLine.match(/^[*-]\s+(.*)$/)

    if (numberedMatch || bulletMatch) {
      const content = numberedMatch ? numberedMatch[1] : bulletMatch![1]
      const currentListType: "ul" | "ol" = numberedMatch ? "ol" : "ul"

      // For numbered lists, track the actual number from markdown
      let actualNumber = 1
      if (numberedMatch) {
        const numberMatch = trimmedLine.match(/^(\d+)\./)
        if (numberMatch) {
          actualNumber = parseInt(numberMatch[1])
        }
      }

      // Close lists that are deeper than current level
      while (listStack.length > 0 && listStack[listStack.length - 1].level >= indentLevel) {
        const list = listStack.pop()!
        processedLines.push(`</${list.type}>`)
      }

      // Open new list if needed
      if (
        listStack.length === 0 ||
        listStack[listStack.length - 1].level < indentLevel ||
        listStack[listStack.length - 1].type !== currentListType
      ) {
        if (currentListType === "ol") {
          // For ordered lists, use the start attribute to continue numbering
          const startNumber = numberedMatch ? actualNumber : 1
          processedLines.push(`<${currentListType} start="${startNumber}">`)
          listStack.push({ type: currentListType, level: indentLevel, startNumber })
          currentOlNumber = startNumber + 1
        } else {
          processedLines.push(`<${currentListType}>`)
          listStack.push({ type: currentListType, level: indentLevel })
        }
      } else if (currentListType === "ol" && numberedMatch) {
        // Update the expected next number for continuous numbering
        currentOlNumber = actualNumber + 1
      }

      processedLines.push(`<li>${content}</li>`)
    } else {
      // Not a list item
      if (trimmedLine === "") {
        // Empty line - keep it but don't close lists yet
        processedLines.push("")
      } else {
        // Non-empty, non-list line - close all lists
        while (listStack.length > 0) {
          const list = listStack.pop()!
          processedLines.push(`</${list.type}>`)
        }
        processedLines.push(line)
      }
    }
  }

  // Close any remaining lists
  while (listStack.length > 0) {
    const list = listStack.pop()!
    processedLines.push(`</${list.type}>`)
  }

  result = processedLines.join("\n")

  // Convert double line breaks to paragraph breaks
  result = result.replace(/\n\s*\n/g, "</p>\n<p>")
  // result = result.replace(/(?:[ \t]*\n){3}/g, "</p>\n<p class='pt-8'>");

  // Convert single line breaks to <br> (except around block elements)
  result = result.replace(/\n(?!<\/?(h[1-6]|ul|ol|li|pre|hr|p))/g, "<br>")

  // Wrap content in paragraphs
  result = `<p>${result}</p>`

  // Clean up paragraph tags around block elements
  result = result.replace(/<p>(<h[1-6]>.*?<\/h[1-6]>)<\/p>/g, "$1")
  result = result.replace(/<p>(<[uo]l>[\s\S]*?<\/[uo]l>)<\/p>/g, "$1")
  result = result.replace(/<p>(<hr>)<\/p>/g, "$1")
  result = result.replace(/<p>(<pre><code>[\s\S]*?<\/code><\/pre>)<\/p>/g, "$1")

  // Clean up empty paragraphs
  result = result.replace(/<p><\/p>/g, "")
  result = result.replace(/<p>\s*<\/p>/g, "")
  result = result.replace(/<p>(<br>\s*)*<\/p>/g, "")

  // Restore code blocks first
  codeBlocks.forEach((block, index) => {
    result = result.replace(`__CODE_BLOCK_${index}__`, block)
  })

  // Then restore code spans
  codeSpans.forEach((span, index) => {
    result = result.replace(`__CODE_SPAN_${index}__`, span)
  })

  return result
}

interface MarkdownVersion {
  id: number
  content: string
  timestamp: Date
}

export default function MarkdownRenderer() {
  const [versions, setVersions] = useState<MarkdownVersion[]>([
    {
      id: 1,
      content: `# Welcome to Markdown Renderer

This is a **markdown renderer** with version control!

## Features

* Split-screen interface
* Real-time markdown rendering  
* Version management
* Navigation between versions

---

### Bullet Points (use \`*\` or \`-\`)
* Use **backticks** to show literal characters: \`*\`, \`**\`, \`#\`
* The \`*\` character won't make italic when wrapped in backticks
- Same with \`**\` for bold formatting
  * Indented sub-point (2 spaces)
  * Another sub-point
    - Another sub-sub-point

### Numbered Lists (for sequences)
1. **Links** work like [this](https://rakha.id)
2. **Inline code:** \`console.log("Hello")\`
3. **Horizontal line:** use \`---\`
  1. Indented sub-point (2 spaces)
  2. Another sub-step
    1. Another sub-sub-step

### Code Blocks
\`\`\`
function hello() {
  console.log("Hello, World!");
  return true;
}
\`\`\`
---

**Happy writing!**`,
      timestamp: new Date(),
    },
  ])

  const [currentVersionIndex, setCurrentVersionIndex] = useState(0)
  const [currentContent, setCurrentContent] = useState(versions[0].content)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

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
    const newVersion: MarkdownVersion = {
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

  const renderedMarkdown = parseMarkdown(currentContent)

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <NavigationHeader currentTool="Markdown Renderer" />

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
        {/* Left Side - Markdown Input */}
        <div className="w-1/2 flex flex-col border-r border-gray-200">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between h-10">
            <h2 className="text-sm font-semibold text-gray-700">Markdown Input</h2>
          </div>
          <div className="flex-1 p-4">
            <textarea
              value={currentContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full h-full resize-none border border-gray-300 rounded-lg p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your markdown here..."
            />
          </div>
        </div>

        {/* Right Side - Rendered Output */}
        <div className="w-1/2 flex flex-col">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between h-10">
            <h2 className="text-sm font-semibold text-gray-700">Rendered Output</h2>
          </div>
          <div className="flex-1 overflow-auto">
            <Card className="m-4 h-[calc(100%-2rem)]">
              <div
                className="p-6 prose prose-sm max-w-none h-full overflow-auto"
                dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
                style={{
                  lineHeight: "1.6",
                }}
              />
              <style dangerouslySetInnerHTML={{
                __html: `
                  .prose p {
                    margin-bottom: 0.5rem !important;
                  }
                  .prose ul {
                    list-style-type: disc !important;
                    padding-left: 1.5rem !important;
                    margin: 0.75rem 0 !important;
                  }
                  .prose ol {
                    list-style-type: decimal !important;
                    padding-left: 1.5rem !important;
                    margin: 0.75rem 0 !important;
                  }
                  .prose li {
                    margin: 0.5rem 0 !important;
                    display: list-item !important;
                  }
                  .prose ul ul {
                    list-style-type: circle !important;
                  }
                  .prose ul ul ul {
                    list-style-type: square !important;
                  }
                `
              }} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
