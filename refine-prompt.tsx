"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Loader2, Wand2 } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"

interface RefinedPrompt {
  rationale: string
  messages: Array<{ role: string; content: string }>
  input_variables: string[]
}

interface JSONSchema {
  name: string
  strict: boolean
  schema: any
}

interface SchemaResponse {
  schema: JSONSchema
  exampleStr: string
}

export default function RefinePrompt() {
  const [initialPrompt, setInitialPrompt] = useState("")
  const [outputFormat, setOutputFormat] = useState("JSON")
  const [refinedPrompt, setRefinedPrompt] = useState<RefinedPrompt | null>(null)
  const [jsonSchema, setJsonSchema] = useState<SchemaResponse | null>(null)
  const [isRefining, setIsRefining] = useState(false)
  const [isGeneratingSchema, setIsGeneratingSchema] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [messagesRawJson, setMessagesRawJson] = useState("")

  // Update messagesRawJson when refinedPrompt changes
  useEffect(() => {
    if (refinedPrompt) {
      setMessagesRawJson(JSON.stringify({ messages: refinedPrompt.messages }, null, 2))
    }
  }, [refinedPrompt])

  const handleRefine = async () => {
    if (!initialPrompt.trim()) {
      setError("Please enter an initial prompt")
      return
    }

    setIsRefining(true)
    setError(null)
    setRefinedPrompt(null)
    setJsonSchema(null)

    try {
      const response = await fetch('/api/v1/refine-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initialPrompt,
          outputFormat
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to refine prompt')
      }

      const data = await response.json()
      setRefinedPrompt(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsRefining(false)
    }
  }

  const handleGenerateSchema = async () => {
    if (!refinedPrompt) return

    setIsGeneratingSchema(true)
    setError(null)

    try {
      const response = await fetch('/api/v1/generate-json-schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: refinedPrompt.messages,
          userExample: null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate JSON schema')
      }

      const data = await response.json()
      setJsonSchema(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsGeneratingSchema(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const updateMessage = (index: number, content: string) => {
    if (!refinedPrompt) return

    const updatedMessages = [...refinedPrompt.messages]
    updatedMessages[index] = { ...updatedMessages[index], content }
    setRefinedPrompt({
      ...refinedPrompt,
      messages: updatedMessages
    })
  }

  const updateInputVariable = (index: number, value: string) => {
    if (!refinedPrompt) return

    const updatedVariables = [...refinedPrompt.input_variables]
    updatedVariables[index] = value
    setRefinedPrompt({
      ...refinedPrompt,
      input_variables: updatedVariables
    })
  }

  const generateCurlCommand = (): string => {
    if (!refinedPrompt) return ""

    const requestBody: any = {
      model: "gpt-4o-mini",
      messages: refinedPrompt.messages
    }

    // Add response_format if jsonSchema exists
    if (jsonSchema) {
      requestBody.response_format = {
        type: "json_schema",
        json_schema: jsonSchema.schema
      }
    }

    const curlCommand = `curl --location 'https://api.openai.com/v1/chat/completions' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: Bearer <OPENAI_API_KEY>' \\
--data '${JSON.stringify(requestBody, null, 2)}'`

    return curlCommand
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <NavigationHeader currentTool="Refine AI Prompt" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Input Section */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Your Idea</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Initial Prompt</label>
                <textarea
                  value={initialPrompt}
                  onChange={(e) => setInitialPrompt(e.target.value)}
                  placeholder="Enter your initial prompt here. Example: Generate interesting facts about my zodiac."
                  className="w-full h-32 resize-y border border-gray-300 rounded-lg p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Desired Output Format</label>
                <Select value={outputFormat} onValueChange={setOutputFormat}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JSON">JSON</SelectItem>
                    <SelectItem value="Plain Text">Plain Text</SelectItem>
                    <SelectItem value="Markdown">Markdown</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-2">{outputFormat === "JSON" ? "You will get a JSON response schema and example." : "You will get a refined prompt messages."}</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  onClick={handleRefine}
                  disabled={isRefining || !initialPrompt.trim()}
                  className="flex items-center gap-2"
                >
                  {isRefining ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  {isRefining ? "Refining..." : "Refine Prompt"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-red-800">{error}</p>
            </Card>
          )}

          {/* Refined Prompt Section */}
          {refinedPrompt && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Refined Prompt</h2>

              {/* Rationale */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Reasoning</label>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{refinedPrompt.rationale}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Messages</label>
                </div>
                <Tabs defaultValue="inputs" className="w-full">
                  <TabsList>
                    <TabsTrigger value="inputs">Inputs</TabsTrigger>
                    <TabsTrigger value="raw-json">Raw JSON</TabsTrigger>
                  </TabsList>
                  <TabsContent value="inputs">
                    <div className="space-y-4 mt-4">
                      {refinedPrompt.messages.map((message, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-700">
                              Role: 
                              <span className="ml-2 px-2 py-1 bg-gray-100 rounded-md font-mono text-xs">
                                {message.role}
                              </span>
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(JSON.stringify(message, null, 2))}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <textarea
                            value={message.content}
                            onChange={(e) => updateMessage(index, e.target.value)}
                            className={`w-full ${message.role === "system" ? "h-72" : "h-32"} resize-y border border-gray-300 rounded p-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"`}
                          />
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="raw-json">
                    <div className="mt-4">
                      <div className="flex items-center justify-end mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(messagesRawJson)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap">
                        {messagesRawJson}
                      </pre>
                      {/* <textarea
                        value={messagesRawJson}
                        // onChange={(e) => setMessagesRawJson(e.target.value)}
                        className="w-full h-96 resize-y border border-gray-300 bg-gray-50 rounded-lg p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      /> */}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Input Variables */}
              { Array.isArray(refinedPrompt.input_variables) && refinedPrompt.input_variables.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Input Variables</label>
                  <div className="space-y-2">
                    {refinedPrompt.input_variables.map((variable, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 w-20">Variable {index + 1}:</span>
                        <input
                          type="text"
                          value={variable}
                          onChange={(e) => updateInputVariable(index, e.target.value)}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) }

              {/* Generate JSON Schema Button (only for JSON output) */}
              {outputFormat === "JSON" && (
                <div className="pt-4 border-t flex justify-end">
                  <Button
                    onClick={handleGenerateSchema}
                    disabled={isGeneratingSchema}
                    // variant="outline"
                    className="flex items-center gap-2"
                  >
                    {isGeneratingSchema ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    {isGeneratingSchema ? "Generating..." : "Generate JSON Schema"}
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* JSON Schema Section */}
          {jsonSchema && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Generated JSON Schema</h2>

              {/* Schema */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Schema</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(jsonSchema.schema, null, 2))}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap">
                  {JSON.stringify(jsonSchema.schema, null, 2)}
                </pre>
              </div>

              {/* Example */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Example JSON</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(jsonSchema.exampleStr)}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap">
                  {jsonSchema.exampleStr}
                </pre>
              </div>
            </Card>
          )}

          {/* OpenAI cURL Request Example */}
          {refinedPrompt && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">OpenAI API cURL Request</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generateCurlCommand())}
                  className="h-8 w-8 p-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap">
                {generateCurlCommand()}
              </pre>
            </Card>
          )}
        </div>
      </div>

      {/* Copy Success Toast */}
      {copySuccess && (
        <div className="fixed top-20 right-8 bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm z-10">
          Copied to clipboard!
        </div>
      )}
    </div>
  )
}
