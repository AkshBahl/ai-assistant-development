"use client"

import { useState, useRef } from "react"
import type { Message } from "@/types/message"
import { Button } from "@/components/ui/button"
import { File, FileText, FileSpreadsheet, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Highlighter } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

interface ChatMessageProps {
  message: Message
}

interface PDFAnnotation {
  id: string
  page: number
  text: string
  position: { x: number; y: number }
  type: "highlight" | "comment"
}

// Utility to remove source references like [5:0†source], [5:0†day 1.txt], 【5:0†source】, or 【5:0†day 1.txt】
function removeSources(text: string) {
  // Remove all source references like [5:0†source], [5:0†day 1.txt], 【5:0†source】, or 【5:0†day 1.txt】
  let cleaned = text.replace(/(\[.*?†.*?\]|【.*?†.*?】)/g, "");
  // Remove any trailing whitespace
  return cleaned.trim();
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [annotations, setAnnotations] = useState<PDFAnnotation[]>([])
  const [selectedText, setSelectedText] = useState("")
  const [showAnnotationDialog, setShowAnnotationDialog] = useState(false)
  const [annotationText, setAnnotationText] = useState("")
  const pdfContainerRef = useRef<HTMLDivElement>(null)

  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"
  const isSystem = message.role === "system"

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleExpand = () => {
    setExpanded(!expanded)
  }

  const getFileIcon = (fileType: string) => {
    if (fileType === "application/pdf") {
      return <File className="h-4 w-4 text-red-500" />
    } else if (fileType === "text/plain") {
      return <FileText className="h-4 w-4 text-blue-500" />
    } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return <FileSpreadsheet className="h-4 w-4 text-blue-700" />
    }
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handlePdfPreview = () => {
    setShowPdfPreview(true)
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 2))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 0.5))
  }

  const handlePageChange = (delta: number) => {
    setCurrentPage((prev) => Math.max(1, prev + delta))
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.toString()) {
      setSelectedText(selection.toString())
      setShowAnnotationDialog(true)
    }
  }

  const handleAddAnnotation = () => {
    if (annotationText && selectedText) {
      const newAnnotation: PDFAnnotation = {
        id: Date.now().toString(),
        page: currentPage,
        text: annotationText,
        position: { x: 0, y: 0 },
        type: "comment",
      }
      setAnnotations((prev) => [...prev, newAnnotation])
      setAnnotationText("")
      setShowAnnotationDialog(false)
    }
  }

  const handleDownload = () => {
    if (message.file?.url) {
      const link = document.createElement("a")
      link.href = message.file.url
      link.download = message.file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const renderMessageContent = () => {
    if (message.type === "file" && message.file) {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {getFileIcon(message.file.type)}
            <div className="flex flex-col">
              <span className={cn("font-medium", isUser ? "text-white" : "text-black dark:text-black")}>
                {message.file.name}
              </span>
              <span className={cn("text-xs", "text-black/70")}>{formatFileSize(message.file.size)}</span>
            </div>
          </div>
          {message.content !== `Attached file: ${message.file.name}` && (
            <div className={cn("mt-2 whitespace-pre-wrap", "text-black")}>{removeSources(message.content)}</div>
          )}
        </div>
      )
    }
    return <div className={cn("whitespace-pre-wrap", "text-black")}>{removeSources(message.content)}</div>
  }

  // Debug log for message content
  console.log("Rendering message.content:", message.content, typeof message.content);
  return (
    <>
      <div className={cn("flex items-start gap-4 pr-5", isUser ? "flex-row-reverse" : "flex-row")}>
        <div className={cn("flex flex-col gap-1 max-w-[85%]", isUser ? "items-end" : "items-start")}>
          <div
            className={cn(
              "rounded-2xl px-4 py-2 text-sm",
              isUser ? "bg-gray-200 text-black" : "bg-white text-black",
              isSystem && "bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100",
            )}
          >
            {renderMessageContent()}
          </div>
        </div>
      </div>

      {message.type === "file" && message.file?.type === "application/pdf" && (
        <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="text-black dark:text-black">{message.file.name}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handlePageChange(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-black dark:text-black">Page {currentPage}</span>
                  <Button variant="outline" size="icon" onClick={() => handlePageChange(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleTextSelection}>
                    <Highlighter className="h-4 w-4" />
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div
              ref={pdfContainerRef}
              className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 rounded-lg"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
            >
              <iframe
                src={`${message.file.url}#page=${currentPage}`}
                className="w-full h-full"
                onMouseUp={handleTextSelection}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showAnnotationDialog} onOpenChange={setShowAnnotationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Annotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-2 bg-muted rounded">
              <p className="text-sm font-medium text-black dark:text-black">Selected Text:</p>
              <p className="text-sm text-black dark:text-black">{selectedText}</p>
            </div>
            <Textarea
              placeholder="Add your annotation..."
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAnnotationDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAnnotation}>Add Annotation</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
