"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import type { SystemStatus } from "@/types/system-status"
import type { Message, MessageType, MessageRole } from "@/types/message"
import { v4 as uuidv4 } from 'uuid'

interface Thread {
  id: string;
  name: string;
  messages: Message[];
}

export function AssistantDashboard() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    status: "connected",
    message: "System ready",
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)

 
  // Load threads from localStorage on component mount
  const [threads, setThreads] = useState(() => {
    if (typeof window === 'undefined') return [{
      id: uuidv4(),
      name: "New Chat",
      messages: [], // Start with no messages
    }];

    const savedThreads = localStorage.getItem('chat-threads');
    if (savedThreads) {
      try {
        const parsedThreads = JSON.parse(savedThreads);
        // Convert string timestamps back to Date objects
        return parsedThreads.map((thread: any) => ({
          ...thread,
          messages: thread.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
      } catch (e) {
        console.error('Error parsing saved threads:', e);
        return [{
          id: uuidv4(),
          name: "New Chat",
          messages: [], // Start with no messages
        }];
      }
    }
    return [{
      id: uuidv4(),
      name: "New Chat",
      messages: [], // Start with no messages
    }];
  });

  // Save threads to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chat-threads', JSON.stringify(threads));
    }
  }, [threads]);

  const [selectedThreadId, setSelectedThreadId] = useState(() => {
    if (typeof window === 'undefined') return threads[0].id;
    const savedThreadId = localStorage.getItem('selected-thread-id');
    return savedThreadId || threads[0].id;
  });

  // Save selected thread ID to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected-thread-id', selectedThreadId);
    }
  }, [selectedThreadId]);

  // Ensure there is always a valid selected thread
  useEffect(() => {
    if (!threads.length || !threads.find((t: Thread) => t.id === selectedThreadId)) {
      const newThread = {
        id: uuidv4(),
        name: "New Chat",
        messages: [],
      };
      setThreads([newThread]);
      setSelectedThreadId(newThread.id);
    }
  }, [threads, selectedThreadId]);

  const handleNewChat = () => {
    const newThread: Thread = {
      id: uuidv4(),
      name: "New Chat",
      messages: [], // Start with no messages
    };
    setThreads((prev: Thread[]) => [...prev, newThread]);
    setSelectedThreadId(newThread.id);
  };

  const setMessages = (updater: (prev: Message[]) => Message[]) => {
    setThreads((prevThreads: Thread[]) =>
      prevThreads.map((thread: Thread) =>
        thread.id === selectedThreadId
          ? {
              ...thread,
              messages: (() => {
                const updatedMessages = typeof updater === 'function' 
                  ? updater(thread.messages)
                  : updater;
                
                // Update thread name if this is the first user message
                if (updatedMessages.length > 0) {
                  const firstUserMessage = updatedMessages.find(msg => msg.role === 'user');
                  if (firstUserMessage && thread.name.startsWith('Thread')) {
                    // Use first 30 characters of the message as thread name
                    const newName = firstUserMessage.content.slice(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '');
                    thread.name = newName;
                  }
                }

                // Ensure user messages are preserved exactly as they were
                return updatedMessages.map((msg: Message) => {
                  if (msg.role === 'user') {
                    return {
                      ...msg,
                      content: msg.content // Preserve exact user input
                    };
                  }
                  return msg;
                });
              })()
            }
          : thread
      )
    );
  };

  const selectedThread = threads.find((t: Thread) => t.id === selectedThreadId);

  const handleDeleteThread = (id: string) => {
    setThreads((prev: Thread[]) => prev.filter((thread: Thread) => thread.id !== id));
    // If the deleted thread was selected, select another
    if (selectedThreadId === id && threads.length > 1) {
      const nextThread = threads.find((t: Thread) => t.id !== id);
      if (nextThread) setSelectedThreadId(nextThread.id);
    }
  };

  const handleRenameThread = (id: string, newName: string) => {
    setThreads((prev: { id: string }[]) =>
      prev.map((thread: { id: string }) =>
        thread.id === id ? { ...thread, name: newName } : thread
      )
    );
  };

  const handleThreadNameUpdate = (newName: string) => {
    setThreads((prev: Thread[]) =>
      prev.map((thread: Thread) =>
        thread.id === selectedThreadId
          ? { ...thread, name: newName }
          : thread
      )
    );
  };

  return (
    <div className="flex h-screen flex-col">
      <Header systemStatus={systemStatus} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          isOpen={sidebarOpen}
          onNewChat={handleNewChat}
          threads={threads}
          selectedThreadId={selectedThreadId}
          setSelectedThreadId={setSelectedThreadId}
          onRenameThread={handleRenameThread}
          onDeleteThread={handleDeleteThread}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 overflow-hidden transition-all duration-300">
          <ChatInterface
            onStatusChange={setSystemStatus}
            messages={selectedThread ? selectedThread.messages : []}
            setMessages={setMessages}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            sidebarOpen={sidebarOpen}
            onThreadNameUpdate={handleThreadNameUpdate}
          />
        </main>
      </div>
    </div>
  )
}
