import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mic, Send, Minimize2, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import MapMessage from "./MapMessage";
import { cn } from "@/lib/utils";
import { rasaBackend, generateId, type ChatMessage } from "@/lib/rasaApi";
import type { UserPrivileges } from "@/types/admin";
import { QuickAccessBar } from "./QuickAccessBar";
import { MapQuickAccess } from "./MapQuickAccess";
import { fetchActiveFaqs } from "@/lib/adminApi";

// Helper for Web Speech API
const SpeechRecognition =
  (window as any).SpeechRecognition ||
  (window as any).webkitSpeechRecognition;

interface ChatWindowProps {
  onClose: () => void;
  isOpen: boolean;
}

 async function fetchUserPrivileges(): Promise<UserPrivileges> {
   try {
     const res = await fetch("/api/privileges");
     const json = await res.json();
     if (json?.success && json?.data) return json.data as UserPrivileges;
   } catch (err) {
     // ignore
   }
   return { chatEnabled: true, audioInputEnabled: true, mapAccessEnabled: true, autoTranslateEnabled: true };
 }

function convertResponseToMessages(response: any): ChatMessage[] {
  const messages: ChatMessage[] = [];

  const hasText = typeof response.answer === "string" ? response.answer.length > 0 : Array.isArray(response.answer);
  const hasImages = Boolean(response.imageUrl) || (Array.isArray(response.imageUrls) && response.imageUrls.length > 0);

  // Get answer text for filtering
  const answerText = Array.isArray(response.answer)
    ? response.answer.join("\n")
    : (typeof response.answer === "string" ? response.answer : "");

  // Frontend filter: Clear mapData if answer contains error messages
  let filteredMapData = response.mapData;
  let filteredMapDataList = response.mapDataList;
  
  if (
    !answerText ||
    answerText.includes("cannot understand") ||
    answerText.includes("try again") ||
    answerText.includes("I'm not sure I understand") ||
    answerText.includes("Could you rephrase")
  ) {
    filteredMapData = null;
    filteredMapDataList = null;
  }

  // Text (and/or images) message
  if (hasText || hasImages) {
    messages.push({
      id: generateId(),
      text: answerText,
      sender: "bot",
      type: "text",
      imageUrl: response.imageUrl,
      imageUrls: response.imageUrls,
      timestamp: new Date(),
    });
  }

  // Map message(s) - use filtered data
  if (Array.isArray(filteredMapDataList) && filteredMapDataList.length > 0) {
    filteredMapDataList.forEach((md: any) => {
      if (!md) return;
      messages.push({
        id: generateId(),
        text: "",
        sender: "bot",
        type: "map",
        mapData: md,
        timestamp: new Date(),
      });
    });
  } else if (Array.isArray(response.mapData) && response.mapData.length > 0) {
    response.mapData.forEach((md: any) => {
      if (!md) return;
      messages.push({
        id: generateId(),
        text: "",
        sender: "bot",
        type: "map",
        mapData: md,
        timestamp: new Date(),
      });
    });
  } else if (filteredMapData) {
    messages.push({
      id: generateId(),
      text: "",
      sender: "bot",
      type: "map",
      mapData: filteredMapData,
      timestamp: new Date(),
    });
  }

  return messages;
}

export default function ChatWindow({ onClose, isOpen }: ChatWindowProps) {
  const { data: privileges = { chatEnabled: true, audioInputEnabled: true, mapAccessEnabled: true, autoTranslateEnabled: true } } = useQuery({
    queryKey: ["privileges"],
    queryFn: fetchUserPrivileges,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchInterval: 30000, // Poll every 30 seconds instead of 5s (6x reduction)
    refetchOnWindowFocus: false, // Don't refetch when user returns to tab
    enabled: isOpen
  });

  const { data: activeFaqs } = useQuery({
    queryKey: ["activeFaqs"],
    queryFn: fetchActiveFaqs,
    staleTime: 5 * 60 * 1000,
    enabled: isOpen
  });

  // Fullscreen map state - stores the message ID of the map currently in fullscreen
  const [fullscreenMapId, setFullscreenMapId] = useState<string | null>(null);
  
  // Map Quick Access modal state
  const [showMapQuickAccess, setShowMapQuickAccess] = useState(false);
  
  const [showQuickAccess, setShowQuickAccess] = useState(true);

  // Generate or retrieve session ID for conversation tracking
  const [sessionId] = useState(() => {
    const stored = sessionStorage.getItem('chatSessionId');
    if (stored) return stored;
    const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('chatSessionId', newId);
    return newId;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem('chatMessages');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Remove time-based expiration since sessionStorage clears on reload
        return parsed.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load messages from sessionStorage:', error);
    }
    // Default welcome message
    return [
      {
        id: "welcome",
        text: "Hi there! I'm the BukSU Assistance Chatbot. Ask me anything about BukSU. Pwede ra gyud Bisaya or English",
        sender: "bot",
        type: "text",
        timestamp: new Date(),
      },
    ];
  });

  // Removed in-timeline FAQ Carousel injection. Now handled by QuickAccessBar floating UI.

  // Compute the fullscreen map message
  const fullscreenMapMessage = useMemo(() => {
    if (!fullscreenMapId) return null;
    return messages.find(m => m.id === fullscreenMapId && m.type === "map");
  }, [fullscreenMapId, messages]);

  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Quick Access Drag-to-Scroll State
  const quickAccessScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingFAQ, setIsDraggingFAQ] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);
  const [draggedDistance, setDraggedDistance] = useState(0);

  const handleDragStart = (e: React.MouseEvent) => {
    setIsDraggingFAQ(true);
    setDragStartX(e.pageX - (quickAccessScrollRef.current?.offsetLeft || 0));
    setDragScrollLeft(quickAccessScrollRef.current?.scrollLeft || 0);
    setDraggedDistance(0);
  };

  const handleDragEnd = () => {
    setIsDraggingFAQ(false);
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDraggingFAQ) return;
    e.preventDefault(); // prevents text selection highlighting
    const x = e.pageX - (quickAccessScrollRef.current?.offsetLeft || 0);
    const walk = (x - dragStartX) * 1.5;
    if (quickAccessScrollRef.current) {
      quickAccessScrollRef.current.scrollLeft = dragScrollLeft - walk;
    }
    setDraggedDistance(Math.abs(x - dragStartX));
  };

  useEffect(() => {
    if ((!privileges.chatEnabled || !privileges.audioInputEnabled) && isListening) {
      recognitionRef.current?.stop?.();
      setIsListening(false);
    }
  }, [privileges.chatEnabled, privileges.audioInputEnabled, isListening]);

  // Test backend on mount
  useEffect(() => {
    const testBackend = async () => {
      try {
        console.log("Testing backend connection...");
        const testResponse = await rasaBackend.sendMessage("test");
        console.log("Backend response:", testResponse);
      } catch (error) {
        console.error("Backend test failed:", error);
      }
    };
    
    if (isOpen) {
      testBackend();
    }
  }, [isOpen]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isTyping]);

  // Auto-scroll to bottom when exiting fullscreen mode
  useEffect(() => {
    if (!fullscreenMapId && scrollRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const scrollContainer = scrollRef.current?.querySelector(
          "[data-radix-scroll-area-viewport]"
        );
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }, 100);
    }
  }, [fullscreenMapId]);

  // Save messages to sessionStorage
  useEffect(() => {
    if (messages.length > 1) { // Only save if there are actual conversation messages
      try {
        const toSave = {
          messages: messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp.toISOString()
          })),
          // No timestamp needed for sessionStorage since it clears on reload
        };
        sessionStorage.setItem('chatMessages', JSON.stringify(toSave));
      } catch (error) {
        console.error('Failed to save messages to sessionStorage:', error);
      }
    }
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (SpeechRecognition && !recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = "en-US";
      recognition.interimResults = true; // Enable interim results for real-time feedback
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        
        if (event.results[current].isFinal) {
          // Final result - set input and auto-send
          setInputValue(transcript);
          setIsListening(false);
          // Send immediately without delay
          handleSend(transcript);
        } else {
          // Interim result - show in input field for visual feedback
          setInputValue(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        
        // Handle specific errors
        if (event.error === 'not-allowed') {
          alert('Microphone access was denied. Please allow microphone access to use voice input.');
        } else if (event.error === 'no-speech') {
          console.log('No speech detected');
        } else if (event.error === 'network') {
          alert('Network error occurred during speech recognition. Please check your internet connection.');
        } else {
          alert(`Speech recognition error: ${event.error}`);
        }
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = async () => {
    if (!privileges.chatEnabled || !privileges.audioInputEnabled) {
      return;
    }
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please try using Chrome, Edge, or Safari.");
      return;
    }
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      // Check microphone permissions first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
        
        setIsListening(true);
        setInputValue(""); // Clear previous input
        
        try {
          recognitionRef.current?.start();
        } catch (error) {
          console.error("Failed to start voice recognition:", error);
          setIsListening(false);
          alert("Failed to start voice recognition. Please try again.");
        }
      } catch (error) {
        console.error("Microphone permission denied:", error);
        alert("Microphone access is required for voice input. Please allow microphone access in your browser settings.");
      }
    }
  };

  const handleSend = async (displayStr?: string, payloadStr?: string) => {
    if (!privileges.chatEnabled) {
      return;
    }
    const rawDisplay = typeof displayStr === "string" ? displayStr : inputValue;
    const trimmedDisplay = rawDisplay.trim();
    if (!trimmedDisplay) return;

    const payloadToSend = payloadStr || trimmedDisplay;

    // User message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: trimmedDisplay,
      sender: "user",
      type: "text",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await rasaBackend.sendMessage(payloadToSend, sessionId);
      
      // Convert bot response to correct message types
      const botMessages = convertResponseToMessages(response);
      
      // Add a small delay to simulate typing
      setTimeout(() => {
        setMessages((prev) => [...prev, ...botMessages]);
        setIsTyping(false);
      }, 800);
      
    } catch (error) {
      console.error("Failed to get response", error);
      
      const errorMsg: ChatMessage = {
        id: generateId(),
        text: "Oops! Something went wrong. Please try again.",
        sender: "bot",
        type: "text",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMsg]);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <div className="bg-primary p-4 flex items-center justify-between text-primary-foreground shadow-sm shrink-0" style={{backgroundColor: '#001C38'}}>
        <div className="flex items-center gap-4" >
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse mt-1" />
          <div className="flex flex-col leading-tight">
            <h3 className="font-semibold text-sm text-white">Buksu Chatbot</h3>
            <p className="text-xs text-white/90 font-light">Ask me about BukSU</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-primary-foreground/80 hover:text-white hover:bg-white/10"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Fullscreen Map View - Only visible when a map is in fullscreen */}
      {fullscreenMapMessage && fullscreenMapMessage.mapData && (
        <div className="flex-1 relative bg-slate-100">
          <MapMessage
            locationName={fullscreenMapMessage.mapData.locationName}
            coordinates={(fullscreenMapMessage.mapData as any).coordinates}
            pins={(fullscreenMapMessage.mapData as any).pins}
            routes={(fullscreenMapMessage.mapData as any).routes}
            isFullscreen={true}
            onToggleFullscreen={() => setFullscreenMapId(null)}
          />
        </div>
      )}

      {/* Map Quick Access Modal - Fills the chatbox area */}
      {showMapQuickAccess && (
        <div className="absolute inset-0 z-30 flex flex-col">
          <MapQuickAccess onClose={() => setShowMapQuickAccess(false)} />
        </div>
      )}

      {/* Messages - Hidden when in fullscreen map mode */}
      {!fullscreenMapId && (
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4 pb-4">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex flex-col w-full",
                  msg.sender === "user" ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-muted text-foreground rounded-bl-none"
                  )}
                >
                  {/* Normal text */}
                  {msg.type === "text" && (
                    <div>
                      <p
                        className="leading-relaxed whitespace-pre-line"
                        dangerouslySetInnerHTML={{
                          __html: msg.text.replace(
                            /(https?:\/\/[^\s]+)/g,
                            (match) => {
                              const display = match.length > 40 ? match.slice(0, 37) + "..." : match;
                              return `<a href="${match}" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 break-all">${display}</a>`;
                            }
                          ),
                        }}
                      />

                      {msg.imageUrls && msg.imageUrls.length > 0 ? (
                        <div className="mt-2 grid gap-2">
                          {msg.imageUrls.map((url, idx) => (
                            <img
                              key={`${msg.id}-img-${idx}`}
                              src={url}
                              alt="Chatbot response"
                              loading="lazy"
                              className="w-full max-w-[320px] rounded-lg border border-border object-contain"
                            />
                          ))}
                        </div>
                      ) : msg.imageUrl ? (
                        <img
                          src={msg.imageUrl}
                          alt="Chatbot response"
                          loading="lazy"
                          className="mt-2 w-full max-w-[320px] rounded-lg border border-border object-contain"
                        />
                      ) : null}
                    </div>
                  )}

                  {/* Map message */}
                  {msg.type === "map" && msg.mapData && (
                    privileges.mapAccessEnabled ? (
                      <MapMessage
                        locationName={msg.mapData.locationName}
                        coordinates={(msg.mapData as any).coordinates}
                        pins={(msg.mapData as any).pins}
                        routes={(msg.mapData as any).routes}
                        isFullscreen={false}
                        onToggleFullscreen={() => {
                          setFullscreenMapId(msg.id);
                        }}
                      />
                    ) : (
                      <div className="mt-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                        Map access is disabled by the administrator.
                      </div>
                    )
                  )}
                </div>

                <div className="text-xs opacity-60 mt-1 text-center">
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </motion.div>
            ))}

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start w-full"
              >
                <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-none flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Input - Hidden when in fullscreen map mode */}
      {!fullscreenMapId && (
        <div className="flex flex-col shrink-0 bg-background border-t">
          
          {/* Collapse/Expand Quick Access */}
          {activeFaqs && activeFaqs.length > 0 && (
            <div className="relative z-20">
              {/* Dissolve top effect when closed */}
              {!showQuickAccess && (
                <div className="absolute bottom-full left-0 w-full h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
              )}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex justify-center">
                <button 
                  onClick={() => setShowQuickAccess(!showQuickAccess)}
                  className="bg-background border rounded-full p-1 shadow-sm hover:bg-muted text-muted-foreground group flex items-center justify-center transition-all duration-300"
                  title={showQuickAccess ? "Close Quick Access" : "Show Quick Access"}
                >
                  {showQuickAccess ? (
                    <X className="h-3.5 w-3.5 group-hover:text-foreground transition-colors" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5 group-hover:text-foreground transition-colors" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Quick Access Bar */}
          <div className={cn("transition-all duration-300 ease-in-out origin-bottom", showQuickAccess ? "max-h-[76px] opacity-100" : "max-h-0 opacity-0 overflow-hidden")}>
            <div className="relative w-full bg-background border-t border-border flex items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pt-5 pb-2 px-2 z-10 transition-all">
              {/* Map Quick Access Button */}
              {privileges.mapAccessEnabled && (
                <button
                  onClick={() => setShowMapQuickAccess(true)}
                  className="flex-shrink-0 flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 text-blue-700 rounded-full px-3 py-1.5 shadow-sm transition-all duration-200 whitespace-nowrap h-9 mx-1"
                >
                  <span className="text-[13px]">🗺️</span>
                  <span className="font-medium text-[13px] truncate">Map</span>
                </button>
              )}
              
              {/* FAQ Quick Access - scrollable area with fade edges */}
              {activeFaqs?.length ? (
                <div 
                  ref={quickAccessScrollRef}
                  onMouseDown={handleDragStart}
                  onMouseLeave={handleDragEnd}
                  onMouseUp={handleDragEnd}
                  onMouseMove={handleDragMove}
                  className={cn("flex-1 overflow-x-auto py-1 pl-1 pr-1 [&::-webkit-scrollbar]:hidden", isDraggingFAQ ? "cursor-grabbing" : "cursor-grab")}
                  style={{ 
                    maskImage: "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)", 
                    WebkitMaskImage: "-webkit-linear-gradient(left, transparent, black 16px, black calc(100% - 16px), transparent)",
                    msOverflowStyle: "none",
                    scrollbarWidth: "none"
                  }}
                >
                  <div className="flex gap-2">
                    {activeFaqs.map((faq, idx) => (
                      <button
                        key={faq.id || idx}
                        onClick={(e) => {
                          if (draggedDistance > 5) {
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                          }
                          handleSend(faq.displayLabel, faq.payload);
                        }}
                        className="flex-shrink-0 flex items-center gap-1.5 bg-muted hover:bg-accent border border-border text-foreground rounded-full px-3 py-1.5 shadow-sm transition-all duration-200 whitespace-nowrap h-9 pointer-events-auto"
                      >
                        <span className="text-[13px]">{faq.icon || "✨"}</span>
                        <span className="font-medium text-[13px] truncate max-w-[140px]">{faq.displayLabel}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Chat Input Field */}
          <div className="p-3 pb-1">
            <div className="flex items-center gap-2">
              {privileges.chatEnabled ? (
                <>
                  {privileges.audioInputEnabled ? (
                    <Button
                      variant={isListening ? "destructive" : "secondary"}
                      size="icon"
                      className="rounded-full shrink-0 h-10 w-10 transition-all duration-300"
                      onClick={toggleListening}
                      disabled={isTyping}
                    >
                      <Mic className={cn("h-5 w-5", isListening && "animate-pulse")} />
                    </Button>
                  ) : null}

                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? "Listening..." : "Type a message..."}
                    className={cn(
                      "rounded-full bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-primary/20 transition-all text-sm h-10",
                      isListening && "bg-red-50 border-red-200 animate-pulse"
                    )}
                    disabled={isTyping}
                  />

                  <Button
                    onClick={() => handleSend(inputValue)}
                    size="icon"
                    disabled={!inputValue.trim() || isTyping || isListening}
                    className="rounded-full shrink-0 h-10 w-10"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <div className="w-full text-center text-sm text-muted-foreground py-2">
                  Chat is currently disabled.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <a className="text-xs text-muted-foreground/60 hover:text-muted-foreground text-center mt-0 mb-0" href="#" target="_blank" rel="noopener noreferrer">
        Chatbot might also make mistakes
      </a>
    </div>
  );
}
