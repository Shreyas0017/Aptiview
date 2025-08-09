"use client"

import { CardDescription } from "@/components/ui/card"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, Mic, Video, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function AIDemoClientPage() {
  const [messages, setMessages] = useState<Array<{ type: "user" | "ai"; text: string }>>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(scrollToBottom, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() === "") return

    const userMessage = { type: "user" as const, text: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    // Simulate AI response
    await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate network delay

    const aiResponse = generateAIResponse(input)
    setMessages((prev) => [...prev, { type: "ai", text: aiResponse }])
    setIsTyping(false)
  }

  const generateAIResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase()
    if (lowerInput.includes("experience")) {
      return "Could you elaborate on your most significant achievement in your previous role?"
    } else if (lowerInput.includes("strengths")) {
      return "What do you consider your greatest strength, and how has it helped you succeed professionally?"
    } else if (lowerInput.includes("weaknesses") || lowerInput.includes("challenges")) {
      return "Can you describe a professional challenge you faced and how you overcame it?"
    } else if (lowerInput.includes("why us") || lowerInput.includes("why this company")) {
      return "What specifically interests you about this company and this role?"
    } else if (lowerInput.includes("questions for me")) {
      return "I'm here to answer your questions. What would you like to know about the role or the company?"
    } else if (lowerInput.includes("thank you") || lowerInput.includes("bye")) {
      return "Thank you for your time. We will be in touch shortly regarding the next steps."
    } else {
      return "That's an interesting point. Could you provide a specific example to illustrate what you mean?"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8 flex items-center justify-center">
      <Card className="w-full max-w-3xl h-[700px] flex flex-col shadow-lg">
        <CardHeader className="border-b p-4">
          <CardTitle className="flex items-center text-xl sm:text-2xl font-bold text-gray-900">
            <Video className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-gray-700" /> AI Interview Simulation
          </CardTitle>
          <CardDescription className="text-gray-600 text-sm sm:text-base">
            Experience a simulated AI-powered interview. Type your responses below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-4 sm:p-6 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 pr-2 sm:pr-4">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Avatar className="bg-black text-white size-8 sm:size-10">
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div className="bg-gray-100 p-3 rounded-lg max-w-[80%] text-gray-800 shadow-sm text-sm sm:text-base">
                  Hello! Welcome to your AI interview. Let's start with a common question: Tell me about yourself and
                  your professional background.
                </div>
              </div>
              {messages.map((msg, index) => (
                <div key={index} className={`flex items-start space-x-3 ${msg.type === "user" ? "justify-end" : ""}`}>
                  {msg.type === "ai" && (
                    <Avatar className="bg-black text-white size-8 sm:size-10">
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`p-3 rounded-lg max-w-[80%] shadow-sm text-sm sm:text-base ${
                      msg.type === "user" ? "bg-black text-white" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.type === "user" && (
                    <Avatar className="bg-gray-200 text-gray-800 size-8 sm:size-10">
                      <AvatarFallback>You</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex items-start space-x-3">
                  <Avatar className="bg-black text-white size-8 sm:size-10">
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-100 p-3 rounded-lg max-w-[80%] text-gray-800 flex items-center shadow-sm text-sm sm:text-base">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> AI is typing...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex w-full space-x-2">
            <Input
              placeholder="Type your answer here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 border-gray-300 focus-visible:ring-gray-400"
            />
            <Button type="submit" size="icon" className="bg-black hover:bg-gray-800">
              <Send className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" className="border-gray-300 hover:bg-gray-100 bg-transparent">
              <Mic className="h-5 w-5" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
