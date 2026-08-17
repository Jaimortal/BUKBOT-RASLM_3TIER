import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flag, Mic, Send, Minimize2, ChevronUp, X, ZoomIn, ZoomOut, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import MapMessage from "./MapMessage";
import { cn } from "@/lib/utils";
import { rasaBackend, generateId, type ChatChoiceGroup, type ChatMessage, type ChatSuggestion } from "@/lib/rasaApi";
import type { UserPrivileges } from "@/types/admin";
import { QuickAccessBar } from "./QuickAccessBar";
import { MapQuickAccess } from "./MapQuickAccess";
import { fetchActiveFaqs, fetchChatWidgetSettings, submitChatbotReport, submitChatbotResponseReport } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";

// Helper for Web Speech API
const SpeechRecognition =
  (window as any).SpeechRecognition ||
  (window as any).webkitSpeechRecognition;

interface ChatWindowProps {
  onClose: () => void;
  isOpen: boolean;
}

const MAX_CHAT_MESSAGES = 80;
const MAX_PERSISTED_MESSAGES = 50;
const MAX_INLINE_MAPS = 1;
const MAX_PERSISTED_MAP_PAYLOADS = 8;

function trimChatMessages(items: ChatMessage[], limit = MAX_CHAT_MESSAGES): ChatMessage[] {
  if (items.length <= limit) return items;
  const welcome = items.find((message) => message.id === "welcome");
  const recent = items.filter((message) => message.id !== "welcome").slice(-(limit - (welcome ? 1 : 0)));
  return welcome ? [welcome, ...recent] : recent;
}

function lightweightMessagesForStorage(items: ChatMessage[]): ChatMessage[] {
  const trimmed = trimChatMessages(items, MAX_PERSISTED_MESSAGES);
  const mapIdsToKeep = new Set(
    trimmed
      .filter((message) => message.type === "map" && message.mapData)
      .slice(-MAX_PERSISTED_MAP_PAYLOADS)
      .map((message) => message.id)
  );

  return trimmed.map((message) => {
    if (message.type !== "map" || mapIdsToKeep.has(message.id)) {
      return message;
    }
    return {
      ...message,
      mapData: undefined,
      imageUrl: undefined,
      imageUrls: undefined,
      text: message.mapData?.locationName
        ? `Map preview removed to keep the chat lightweight: ${message.mapData.locationName}`
        : "Map preview removed to keep the chat lightweight.",
      type: "text",
    };
  });
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHtmlBoldToMarkdown(value: string): string {
  return String(value || "")
    .replace(/<\s*(b|strong)\s*>/gi, "**")
    .replace(/<\s*\/\s*(b|strong)\s*>/gi, "**");
}

function renderSafeMessageHtml(value: string): string {
  const escaped = escapeHtml(safeHtmlBoldToMarkdown(value || ""));
  const withBold = escaped.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
  return withBold.replace(
    /(https?:\/\/[^\s<]+)/g,
    (match) => {
      const cleanHref = match.replace(/&amp;/g, "&");
      const display = match.length > 40 ? `${match.slice(0, 37)}...` : match;
      return `<a href="${cleanHref}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; background-color: #dbeafe; padding: 2px 6px; border-radius: 4px; text-decoration: underline; font-weight: 500; word-break: break-all;">${display}</a>`;
    }
  );
}

function textForSpeech(value: string): string {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = renderSafeMessageHtml(value || "");
  return (wrapper.textContent || wrapper.innerText || "")
    .replace(/\s+/g, " ")
    .trim();
}

function convertResponseToMessages(response: any): ChatMessage[] {
  const messages: ChatMessage[] = [];

  // answer is now string[] from RasaBackend
  const answerParts: string[] = Array.isArray(response.answer) ? response.answer : [];

  // Frontend filter: Clear mapData if answer contains error messages
  // We check the full concatenated text for keywords
  const fullText = answerParts.join(" ");
  let filteredMapData = response.mapData;
  let filteredMapDataList = response.mapDataList;
  
  if (
    !fullText ||
    fullText.includes("cannot understand") ||
    fullText.includes("try again") ||
    fullText.includes("I'm not sure I understand") ||
    fullText.includes("Could you rephrase")
  ) {
    filteredMapData = null;
    filteredMapDataList = null;
  }

  // Create separate messages for each text part (skip empty/whitespace-only)
  const nonEmptyParts = answerParts.filter(text => text && text.trim());
  nonEmptyParts.forEach((text, index) => {
    const isLastTextPart = index === nonEmptyParts.length - 1;
    
    messages.push({
      id: generateId() + "-t-" + index,
      text: text.trim(),
      sender: "bot",
      type: "text",
      suggestions: isLastTextPart ? response.suggestions : undefined,
      choiceGroups: isLastTextPart ? response.choiceGroups : undefined,
      timestamp: new Date(),
      // Hide timestamp if it's not the last message in the sequence
      hideTimestamp: true 
    });
  });

  // Collect images as standalone chat cards instead of embedding them in text/map bubbles.
  const allImages = response.imageUrls?.length ? response.imageUrls : (response.imageUrl ? [response.imageUrl] : []);
  
  // Map message(s) - use filtered data
  if (Array.isArray(filteredMapDataList) && filteredMapDataList.length > 0) {
    filteredMapDataList.forEach((md: any, idx: number) => {
      if (!md) return;
      messages.push({
        id: generateId() + "-m-list-" + idx,
        text: "",
        sender: "bot",
        type: "map",
        mapData: md,
        timestamp: new Date(),
        hideTimestamp: true
      });
    });
  } else if (Array.isArray(response.mapData) && response.mapData.length > 0) {
    response.mapData.forEach((md: any, idx: number) => {
      if (!md) return;
      messages.push({
        id: generateId() + "-m-data-" + idx,
        text: "",
        sender: "bot",
        type: "map",
        mapData: md,
        timestamp: new Date(),
        hideTimestamp: true
      });
    });
  } else if (filteredMapData) {
    messages.push({
      id: generateId() + "-m-single",
      text: "",
      sender: "bot",
      type: "map",
      mapData: filteredMapData,
      timestamp: new Date(),
      hideTimestamp: true
    });
  }

  if (allImages.length > 0) {
    messages.push({
      id: generateId() + "-img",
      text: "",
      sender: "bot",
      type: "image",
      imageUrls: allImages,
      suggestions: nonEmptyParts.length === 0 ? response.suggestions : undefined,
      choiceGroups: nonEmptyParts.length === 0 ? response.choiceGroups : undefined,
      timestamp: new Date(),
      hideTimestamp: true
    });
  }

  // Final pass: Ensure the VERY LAST message in the group shows the timestamp
  if (messages.length > 0) {
    messages[messages.length - 1].hideTimestamp = false;
  }

  return messages;
}

export default function ChatWindow({ onClose, isOpen }: ChatWindowProps) {
  const { toast } = useToast();
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

  const { data: widgetSettings } = useQuery({
    queryKey: ["chatWidgetSettings"],
    queryFn: fetchChatWidgetSettings,
    staleTime: 60 * 1000,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
    enabled: isOpen
  });

  // Fullscreen map state - stores the message ID of the map currently in fullscreen
  const [fullscreenMapId, setFullscreenMapId] = useState<string | null>(null);
  
  // Fullscreen image state
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Map Quick Access modal state
  const [showMapQuickAccess, setShowMapQuickAccess] = useState(false);
  
  const [showQuickAccess, setShowQuickAccess] = useState(true);
  const [choiceModal, setChoiceModal] = useState<ChatChoiceGroup | null>(null);
  const [stickyChoiceMessageId, setStickyChoiceMessageId] = useState<string | null>(null);
  const [dismissedStickyChoiceIds, setDismissedStickyChoiceIds] = useState<string[]>([]);
  const choiceBoardRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
        return trimChatMessages(parsed.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
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
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [responseReportContext, setResponseReportContext] = useState<{ question: string; botResponse: string } | null>(null);
  const [reportEmail, setReportEmail] = useState("");
  const [reportText, setReportText] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [audioResponseEnabled, setAudioResponseEnabled] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const lastAutoSpokenMessageIdRef = useRef<string | null>(null);
  const speakingMessageIdRef = useRef<string | null>(null);

  // Quick Access Drag-to-Scroll State
  const quickAccessScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingFAQ, setIsDraggingFAQ] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);
  const [draggedDistance, setDraggedDistance] = useState(0);
  const [isDraggingStickyChoices, setIsDraggingStickyChoices] = useState(false);
  const [stickyDragStartX, setStickyDragStartX] = useState(0);
  const [stickyDragScrollLeft, setStickyDragScrollLeft] = useState(0);
  const [stickyDraggedDistance, setStickyDraggedDistance] = useState(0);

  const latestChoiceGroupMessage = useMemo(() => {
    return [...messages].reverse().find(
      (message) => message.sender === "bot" && message.choiceGroups && message.choiceGroups.length > 0
    ) || null;
  }, [messages]);

  const liveInlineMapIds = useMemo(() => {
    if (MAX_INLINE_MAPS <= 0) return new Set<string>();
    return new Set(
      messages
        .filter((message) => message.type === "map" && message.mapData)
        .slice(-MAX_INLINE_MAPS)
        .map((message) => message.id)
    );
  }, [messages]);

  const latestReportableBotMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message.sender !== "bot" || message.hideTimestamp) continue;
      const hasPreviousUserMessage = messages.slice(0, i).some((item) => item.sender === "user");
      if (hasPreviousUserMessage) return message.id;
    }
    return undefined;
  }, [messages]);

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

  const handleStickyChoiceDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!stickyChoiceMessageId) return;
    setIsDraggingStickyChoices(true);
    setStickyDragStartX(e.pageX - e.currentTarget.offsetLeft);
    setStickyDragScrollLeft(e.currentTarget.scrollLeft);
    setStickyDraggedDistance(0);
  };

  const handleStickyChoiceDragEnd = () => {
    setIsDraggingStickyChoices(false);
  };

  const handleStickyChoiceDragMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingStickyChoices) return;
    e.preventDefault();
    const x = e.pageX - e.currentTarget.offsetLeft;
    const walk = (x - stickyDragStartX) * 1.4;
    e.currentTarget.scrollLeft = stickyDragScrollLeft - walk;
    setStickyDraggedDistance(Math.abs(x - stickyDragStartX));
  };

  const resetReportForm = () => {
    setReportEmail("");
    setReportText("");
    setResponseReportContext(null);
  };

  const messageReportText = (message: ChatMessage) => {
    if (message.type === "map" && message.mapData) {
      return `Map: ${message.mapData.locationName || "Location map"}`;
    }
    return message.text || "";
  };

  const getResponseReportContext = (messageIndex: number) => {
    let userIndex = -1;
    for (let i = messageIndex - 1; i >= 0; i -= 1) {
      if (messages[i]?.sender === "user") {
        userIndex = i;
        break;
      }
    }
    if (userIndex < 0) return null;

    const botResponse = messages
      .slice(userIndex + 1, messageIndex + 1)
      .filter((message) => message.sender === "bot")
      .map(messageReportText)
      .filter(Boolean)
      .join("\n\n");

    if (!botResponse.trim()) return null;
    return {
      question: messages[userIndex].text,
      botResponse,
    };
  };

  const openResponseReport = (messageIndex: number) => {
    const context = getResponseReportContext(messageIndex);
    if (!context) {
      toast({ title: "Cannot report this response", description: "No matching question and response were found.", variant: "destructive" });
      return;
    }
    setResponseReportContext(context);
    setIsReportOpen(true);
  };

  const audioFeatureAvailable = Boolean(widgetSettings?.audioResponseEnabled) && typeof window !== "undefined" && "speechSynthesis" in window;

  const looksCebuanoOrFilipino = (value: string) => {
    return /\b(unsa|asa|aha|kanus|kinsa|ngano|giunsa|pwede|nako|nimo|imong|akong|adto|makuha|makita|kuha|dad-a|dala|kinahanglan|palihug|ug|sa|ang|mga|para|walay|naa|adtoon|pangutana)\b/i.test(value);
  };

  const pickSpeechVoice = (value: string) => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return undefined;

    const wantsFilipinoVoice = looksCebuanoOrFilipino(value) || /[^\x00-\x7F]/.test(value);
    const preferredLangs = wantsFilipinoVoice
      ? ["ceb", "fil-ph", "fil", "tl-ph", "tl", "en-ph", "en-us"]
      : ["en-ph", "en-us", "en-gb", "en"];

    return preferredLangs
      .map((lang) => voices.find((voice) => voice.lang.toLowerCase().startsWith(lang)))
      .find(Boolean);
  };

  const stopSpeaking = () => {
    if (!audioFeatureAvailable) return;
    window.speechSynthesis.cancel();
    speakingMessageIdRef.current = null;
    setSpeakingMessageId(null);
  };

  const speakText = (value: string, messageId?: string) => {
    if (!audioFeatureAvailable) return;
    const clean = textForSpeech(value);
    if (!clean) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean.slice(0, 3000));
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.lang = looksCebuanoOrFilipino(clean) || /[^\x00-\x7F]/.test(clean) ? "fil-PH" : "en-US";
    const voice = pickSpeechVoice(clean);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    speakingMessageIdRef.current = messageId || null;
    setSpeakingMessageId(messageId || null);
    utterance.onend = () => {
      if (speakingMessageIdRef.current === messageId) {
        speakingMessageIdRef.current = null;
        setSpeakingMessageId(null);
      }
    };
    utterance.onerror = utterance.onend;
    window.speechSynthesis.speak(utterance);
  };

  const speakBotResponseAt = (messageIndex: number) => {
    const message = messages[messageIndex];
    if (!message) return;
    if (speakingMessageIdRef.current === message.id && window.speechSynthesis.speaking) {
      stopSpeaking();
      return;
    }

    const context = getResponseReportContext(messageIndex);
    if (!context) {
      if (message.text) speakText(message.text, message.id);
      return;
    }
    speakText(context.botResponse, message.id);
  };

  const toggleAudioResponse = () => {
    if (!audioFeatureAvailable) {
      toast({ title: "Audio response unavailable", description: "This browser does not support text-to-speech or the feature is disabled by the administrator.", variant: "destructive" });
      return;
    }
    setAudioResponseEnabled((current) => {
      const next = !current;
      if (!next) stopSpeaking();
      toast({ title: next ? "Audio response is enabled" : "Audio response is disabled" });
      return next;
    });
  };

  const handleSubmitReport = async () => {
    const email = reportEmail.trim();
    const report = reportText.trim();
    if (!/^[^\s@]+@gmail\.com$/.test(email)) {
      toast({ title: "Gmail required", description: "Please enter a valid Gmail address.", variant: "destructive" });
      return;
    }
    if (!report) {
      toast({ title: "Report required", description: "Please describe what went wrong.", variant: "destructive" });
      return;
    }
    if (report.length > 1000) {
      toast({ title: "Report too long", description: "Reports are limited to 1000 characters.", variant: "destructive" });
      return;
    }

    setIsSubmittingReport(true);
    const result = responseReportContext
      ? await submitChatbotResponseReport({
        email,
        report,
        question: responseReportContext.question,
        botResponse: responseReportContext.botResponse,
      })
      : await submitChatbotReport({ email, report });
    setIsSubmittingReport(false);

    if (!result.success) {
      if (result.limited && result.remainingDays) {
        toast({
          title: "Report limit reached",
          description: `You will be able to submit another report in about ${result.remainingDays} day${result.remainingDays === 1 ? "" : "s"}.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Report not sent", description: result.message || "Please try again later.", variant: "destructive" });
      }
      return;
    }

    toast({ title: "Report sent", description: "Thank you. Your report was saved for future updates." });
    setIsReportOpen(false);
    resetReportForm();
  };

  useEffect(() => {
    if ((!privileges.chatEnabled || !privileges.audioInputEnabled) && isListening) {
      recognitionRef.current?.stop?.();
      setIsListening(false);
    }
  }, [privileges.chatEnabled, privileges.audioInputEnabled, isListening]);

  useEffect(() => {
    if (!audioFeatureAvailable && audioResponseEnabled) {
      setAudioResponseEnabled(false);
      stopSpeaking();
    }
  }, [audioFeatureAvailable, audioResponseEnabled]);

  useEffect(() => {
    if (!audioFeatureAvailable || !audioResponseEnabled || isTyping || !latestReportableBotMessageId) return;
    if (lastAutoSpokenMessageIdRef.current === latestReportableBotMessageId) return;
    const messageIndex = messages.findIndex((message) => message.id === latestReportableBotMessageId);
    if (messageIndex < 0) return;
    lastAutoSpokenMessageIdRef.current = latestReportableBotMessageId;
    speakBotResponseAt(messageIndex);
  }, [audioFeatureAvailable, audioResponseEnabled, isTyping, latestReportableBotMessageId, messages]);

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
        scrollContainer.scrollLeft = 0;
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isTyping]);

  useEffect(() => {
    const activeMessage = latestChoiceGroupMessage;
    if (!activeMessage || dismissedStickyChoiceIds.includes(activeMessage.id)) {
      setStickyChoiceMessageId(null);
      return;
    }

    const viewport = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    const updateStickyState = () => {
      const board = choiceBoardRefs.current[activeMessage.id];
      const shell = scrollRef.current;
      if (!board || !shell) {
        setStickyChoiceMessageId(null);
        return;
      }

      const boardRect = board.getBoundingClientRect();
      const shellRect = shell.getBoundingClientRect();
      const isBoardVisible = boardRect.top >= shellRect.top + 8 && boardRect.bottom <= shellRect.bottom - 8;
      setStickyChoiceMessageId(isBoardVisible ? null : activeMessage.id);
    };

    updateStickyState();
    viewport?.addEventListener("scroll", updateStickyState);
    window.addEventListener("resize", updateStickyState);

    return () => {
      viewport?.removeEventListener("scroll", updateStickyState);
      window.removeEventListener("resize", updateStickyState);
    };
  }, [latestChoiceGroupMessage, dismissedStickyChoiceIds]);

  // Auto-scroll to bottom when exiting fullscreen mode
  useEffect(() => {
    if (!fullscreenMapId && scrollRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const scrollContainer = scrollRef.current?.querySelector(
          "[data-radix-scroll-area-viewport]"
        );
        if (scrollContainer) {
          scrollContainer.scrollLeft = 0;
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
          messages: lightweightMessagesForStorage(messages).map(msg => ({
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
    if (!privileges.chatEnabled || isTyping) {
      return;
    }
    const rawDisplay = typeof displayStr === "string" ? displayStr : inputValue;
    const trimmedDisplay = rawDisplay.trim();
    if (!trimmedDisplay) return;

    const payloadToSend = payloadStr || trimmedDisplay;
    setChoiceModal(null);

    // User message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: trimmedDisplay,
      sender: "user",
      type: "text",
      timestamp: new Date(),
    };

    setMessages((prev) => trimChatMessages([...prev, userMsg]));
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await rasaBackend.sendMessage(payloadToSend, sessionId);
      
      // Convert bot response to correct message types
      const botMessages = convertResponseToMessages(response);
      
      // Add a small delay to simulate typing
      setTimeout(() => {
        setMessages((prev) => trimChatMessages([...prev, ...botMessages]));
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
      
      setMessages((prev) => trimChatMessages([...prev, errorMsg]));
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  const regularChoiceButtonClass =
    "flex min-h-[64px] min-w-0 w-full items-center overflow-hidden rounded-xl border border-sky-200 bg-white px-3.5 py-1 text-left text-[13px] font-semibold leading-snug text-[#003B63] shadow-[0_3px_10px_rgba(14,74,122,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-[0_6px_16px_rgba(14,74,122,0.18)] focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:transform-none";
  const compactChoiceButtonClass =
    "flex h-9 min-w-0 items-center overflow-hidden rounded-full border border-border bg-white px-3 py-1.5 text-[13px] font-medium text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:transform-none";

  const renderSuggestionBoard = (messageId: string, suggestions?: ChatSuggestion[]) => {
    if (!suggestions || suggestions.length === 0) return null;

    return (
      <div className="mt-2 grid w-full max-w-[96%] min-w-0 grid-cols-2 gap-2 overflow-hidden px-1 py-1">
        {suggestions.map((suggestion, idx) => (
          <button
            key={`${messageId}-suggestion-${idx}`}
            type="button"
            disabled={isTyping || !privileges.chatEnabled}
            onClick={() => handleSend(suggestion.label, suggestion.payload || suggestion.label)}
            className={regularChoiceButtonClass}
          >
            <span className="min-w-0 break-words">{suggestion.label}</span>
          </button>
        ))}
      </div>
    );
  };

  const renderChoiceGroupBoard = (msg: ChatMessage, sticky = false) => {
    if (!msg.choiceGroups || msg.choiceGroups.length === 0) return null;

    return (
      <div
        ref={!sticky ? (node) => {
          choiceBoardRefs.current[msg.id] = node;
        } : undefined}
        className={cn(
          "relative mt-2 w-full max-w-[96%] min-w-0 overflow-hidden px-1 py-1",
          sticky && "m-0 max-w-none bg-background px-2 py-2 shadow-md ring-1 ring-border"
        )}
      >
        <div
          onWheel={sticky ? (event) => {
            const target = event.currentTarget;
            if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
              target.scrollLeft += event.deltaY;
              event.preventDefault();
            }
          } : undefined}
          onMouseDown={sticky ? handleStickyChoiceDragStart : undefined}
          onMouseLeave={sticky ? handleStickyChoiceDragEnd : undefined}
          onMouseUp={sticky ? handleStickyChoiceDragEnd : undefined}
          onMouseMove={sticky ? handleStickyChoiceDragMove : undefined}
          className={cn(
            "grid min-w-0 grid-cols-2 gap-2",
            sticky && "flex cursor-grab select-none overflow-x-auto pb-1 pr-8 active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
          )}
        >
          {msg.choiceGroups.map((group, groupIdx) => (
            <button
              key={`${msg.id}-choice-group-${groupIdx}`}
              type="button"
              disabled={isTyping || !privileges.chatEnabled}
              onClick={() => {
                if (sticky && stickyDraggedDistance > 5) return;
                if (isTyping) return;
                setChoiceModal(group);
              }}
              className={sticky
                ? "flex h-9 min-w-[116px] shrink-0 items-center justify-center rounded-full border border-border bg-white px-2.5 py-1.5 text-center text-[12px] font-medium text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:transform-none"
                : regularChoiceButtonClass}
            >
              <span className="min-w-0 break-words">{group.title}</span>
            </button>
          ))}
        </div>
        {sticky && (
          <button
            type="button"
            disabled={isTyping}
            onClick={() => {
              setDismissedStickyChoiceIds((prev) => Array.from(new Set([...prev, msg.id])));
              setStickyChoiceMessageId(null);
            }}
            className="absolute bottom-1 right-2 rounded-full bg-background p-1 text-muted-foreground shadow-sm ring-1 ring-border transition-colors hover:text-foreground disabled:opacity-50 disabled:pointer-events-none"
            aria-label="Hide service category shortcut"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  };

  const stickyChoiceMessage = stickyChoiceMessageId
    ? messages.find((message) => message.id === stickyChoiceMessageId)
    : null;

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <div className="bg-primary p-4 flex items-center justify-between text-primary-foreground shadow-sm shrink-0" style={{backgroundColor: '#001C38'}}>
        <div className="flex items-center gap-4" >
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse mt-1" />
          <div className="flex flex-col leading-tight">
            <h3 className="font-semibold text-sm text-white">Buksu Chatbot</h3>
            {/* <p className="text-xs text-white/90 font-light">Ask me about BukSU</p> */}
          </div>
        </div>
        <div className="flex gap-1">
          {audioFeatureAvailable && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleAudioResponse}
              className="h-8 w-8 text-primary-foreground/80 hover:text-white hover:bg-white/10"
              title={audioResponseEnabled ? "Disable audio response" : "Enable audio response"}
            >
              {audioResponseEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          )}
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

      {stickyChoiceMessage && renderChoiceGroupBoard(stickyChoiceMessage, true)}

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
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <ScrollArea
            className="h-full overflow-x-hidden p-4 [&_[data-radix-scroll-area-viewport]]:!overflow-x-hidden [&_[data-radix-scroll-area-viewport]>div]:!block [&_[data-radix-scroll-area-viewport]>div]:!w-full [&_[data-radix-scroll-area-viewport]>div]:!min-w-0"
            ref={scrollRef}
          >
          <div
            className={cn(
              "w-full max-w-full min-w-0 overflow-x-hidden pb-4 transition duration-200",
              choiceModal && "pointer-events-none blur-[2px]"
            )}
          >
            {messages.length === 1 && messages[0]?.id === "welcome" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto flex max-w-[92%] flex-col items-center gap-3 px-4 py-4 text-center text-foreground"
              >
                <p className="text-sm font-semibold">What can this bot help you with?</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    disabled={isTyping || !privileges.chatEnabled}
                    onClick={() => handleSend("Chatbot Help menu", "chatbot help menu")}
                    className={compactChoiceButtonClass}
                  >
                    Chatbot Help menu
                  </button>
                  <button
                    type="button"
                    disabled={isTyping || !privileges.chatEnabled}
                    onClick={() => handleSend("BukSU student services", "what are the student services")}
                    className={compactChoiceButtonClass}
                  >
                    BukSU student services
                  </button>
                </div>
              </motion.div>
            )}
            {messages.map((msg, msgIndex) => {
              const previousMessage = messages[msgIndex - 1];
              const nextMessage = messages[msgIndex + 1];
              const isMapMessage = msg.type === "map";
              const isImageMessage = msg.type === "image";
              const isMediaMessage = isMapMessage || isImageMessage;
              const isTextMessage = msg.type === "text";
              const isSameSenderGroup = previousMessage?.sender === msg.sender && previousMessage?.type === msg.type;
              const isBotTextBubble = msg.sender === "bot" && isTextMessage;
              const isPreviousBotTextBubble = previousMessage?.sender === "bot" && previousMessage?.type === "text";
              const isNextBotTextBubble = nextMessage?.sender === "bot" && nextMessage?.type === "text";
              const isSingleBotBubble = isBotTextBubble && !isPreviousBotTextBubble && !isNextBotTextBubble;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex w-full max-w-full min-w-0 flex-col overflow-visible",
                    msgIndex === 0 ? "mt-0" : isSameSenderGroup ? "mt-1" : "mt-4",
                    msg.sender === "user" ? "items-end" : "items-start pl-1",
                    isBotTextBubble && "pt-0.5"
                  )}
                >
                <div
                  className={cn(
                    isMediaMessage
                      ? "w-[94%] max-w-[94%] min-w-0 overflow-hidden rounded-2xl text-sm"
                      : "max-w-[80%] min-w-0 overflow-hidden rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    msg.sender === "user" && !isMediaMessage
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : !isMediaMessage && cn(
                        "bg-white text-foreground shadow-[0_3px_10px_rgba(14,74,122,0.10)] ring-1 ring-black/5",
                        (isNextBotTextBubble || isSingleBotBubble) && "rounded-bl-none",
                        isPreviousBotTextBubble && "rounded-tl-none"
                      )
                  )}
                >
                  {/* Normal text */}
                  {msg.type === "text" && (
                    <div>
                      <p
                        className="break-words leading-relaxed whitespace-pre-line"
                        dangerouslySetInnerHTML={{
                          __html: renderSafeMessageHtml(msg.text),
                        }}
                      />

                    </div>
                  )}

                  {/* Image message */}
                  {msg.type === "image" && (msg.imageUrls?.length || msg.imageUrl) && (
                    <div className="grid w-full max-w-full min-w-0 gap-2 overflow-hidden rounded-2xl">
                      {(msg.imageUrls?.length ? msg.imageUrls : [msg.imageUrl]).filter(Boolean).map((url, idx) => (
                        <button
                          key={`${msg.id}-image-card-${idx}`}
                          type="button"
                          onClick={() => {
                            setFullscreenImageUrl(url || null);
                            setImageZoom(0.5);
                            setImagePan({ x: 0, y: 0 });
                          }}
                          className="w-full max-w-full overflow-hidden rounded-2xl bg-white p-0 text-left shadow-[0_2px_12px_rgba(14,74,122,0.24)] transition-all duration-200 hover:shadow-[0_8px_22px_rgba(14,74,122,0.30)] focus:outline-none focus:ring-2 focus:ring-sky-200"
                        >
                          <img
                            src={url}
                            alt={idx === 0 ? "Chatbot response image" : `Chatbot response image ${idx + 1}`}
                            loading="lazy"
                            className="block max-h-72 w-full object-contain"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Map message */}
                  {msg.type === "map" && msg.mapData && (
                    privileges.mapAccessEnabled ? (
                      <>
                        {liveInlineMapIds.has(msg.id) ? (
                          <div className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl shadow-[0_2px_12px_rgba(14,74,122,0.24)] transition-all duration-200 hover:shadow-[0_8px_22px_rgba(14,74,122,0.30)]">
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
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setFullscreenMapId(msg.id)}
                            className="flex w-full max-w-full min-w-0 items-center justify-between rounded-2xl border border-sky-100 bg-sky-50/70 px-3 py-2 text-left text-xs font-semibold text-[#003B63] shadow-sm transition-colors hover:bg-sky-100"
                          >
                            <span className="min-w-0 truncate">{msg.mapData.locationName || "Open map"}</span>
                            <span className="ml-2 shrink-0 text-[11px] font-bold">Open map</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="mt-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                        Map access is disabled by the administrator.
                      </div>
                    )
                  )}
                </div>

                {msg.sender === "bot" && (
                  <>
                    {renderSuggestionBoard(msg.id, msg.suggestions)}
                    {renderChoiceGroupBoard(msg)}
                  </>
                )}

                {!msg.hideTimestamp && (
                  <div className="mt-1 flex items-center justify-center gap-1.5 text-xs opacity-60">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {msg.sender === "bot" && msg.id === latestReportableBotMessageId && (
                      <>
                        {audioFeatureAvailable && (
                          <button
                            type="button"
                            onClick={() => speakBotResponseAt(msgIndex)}
                            className="rounded-full p-0.5 transition hover:bg-slate-200 hover:opacity-100"
                            title={speakingMessageId === msg.id ? "Stop reading" : "Read this response"}
                          >
                            {speakingMessageId === msg.id ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openResponseReport(msgIndex)}
                          className="rounded-full p-0.5 transition hover:bg-slate-200 hover:opacity-100"
                          title="Report this response"
                        >
                          <Flag className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
                </motion.div>
              );
            })}

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start w-full"
              >
                <div className="rounded-2xl rounded-bl-none bg-white px-4 py-3 shadow-[0_3px_10px_rgba(14,74,122,0.10)] ring-1 ring-black/5 flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {choiceModal && (
          <div
            className="absolute inset-0 z-20 flex items-start justify-center bg-slate-900/10 px-4 pb-4 pt-12 backdrop-blur-[1px]"
            onClick={() => setChoiceModal(null)}
          >
            <div
              className="flex max-h-full w-full flex-col overflow-hidden rounded-2xl bg-background shadow-2xl ring-1 ring-black/10"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between bg-[#001C38] px-4 py-3 text-white shadow-sm">
                <h4 className="text-sm font-semibold">{choiceModal.title}</h4>
                <button
                  type="button"
                  onClick={() => setChoiceModal(null)}
                  className="rounded-full p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close choices"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain p-3">
                <div className="grid grid-cols-1 gap-2">
                  {choiceModal.items.map((item, idx) => (
                    <button
                      key={`${choiceModal.title}-${idx}`}
                      type="button"
                      disabled={isTyping || !privileges.chatEnabled}
                      onClick={() => handleSend(item.label, item.payload || item.label)}
                      className={regularChoiceButtonClass}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
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
                        disabled={isTyping || !privileges.chatEnabled}
                        onClick={(e) => {
                          if (draggedDistance > 5) {
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                          }
                          handleSend(faq.displayLabel, faq.payload);
                        }}
                        className="flex-shrink-0 flex items-center gap-1.5 bg-muted hover:bg-accent border border-border text-foreground rounded-full px-3 py-1.5 shadow-sm transition-all duration-200 whitespace-nowrap h-9 pointer-events-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:transform-none"
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
      <button
        type="button"
        onClick={() => {
          setResponseReportContext(null);
          setIsReportOpen(true);
        }}
        className="text-xs text-muted-foreground/60 hover:text-muted-foreground text-center mt-0 mb-0"
      >
        Chatbot might also make mistakes
      </button>

      {isReportOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-transparent px-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
            <div className="flex items-center justify-between px-4 py-3 text-white" style={{ backgroundColor: "#001C38" }}>
              <div>
                <h3 className="text-sm font-semibold">{responseReportContext ? "Report this response" : "Report chatbot issue"}</h3>
                <p className="text-[11px] text-white/70">
                  {responseReportContext ? "You can report up to ten responses every 30 days." : "You can report up to five times every 30 days."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsReportOpen(false);
                  resetReportForm();
                }}
                className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
                disabled={isSubmittingReport}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-4">
              {responseReportContext && (
                <div className="max-h-48 overflow-y-auto rounded-xl border bg-slate-50 p-3 text-xs text-slate-700">
                  <div className="mb-3">
                    <p className="mb-1 font-semibold text-slate-900">Question</p>
                    <p className="whitespace-pre-wrap">{responseReportContext.question}</p>
                  </div>
                  <div>
                    <p className="mb-1 font-semibold text-slate-900">Chatbot response</p>
                    <p className="whitespace-pre-wrap">{responseReportContext.botResponse}</p>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Please keep your report clear and under 1000 characters.</p>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Gmail</label>
                <Input
                  type="email"
                  value={reportEmail}
                  onChange={(event) => setReportEmail(event.target.value)}
                  placeholder="your.email@gmail.com"
                  disabled={isSubmittingReport}
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700">Report</label>
                  <span className="text-[11px] text-muted-foreground">{reportText.length}/1000</span>
                </div>
                <Textarea
                  value={reportText}
                  onChange={(event) => setReportText(event.target.value.slice(0, 1000))}
                  placeholder="Tell us what answer or feature was wrong..."
                  className="min-h-32 resize-none"
                  disabled={isSubmittingReport}
                  maxLength={1000}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsReportOpen(false);
                    resetReportForm();
                  }}
                  disabled={isSubmittingReport}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmitReport} disabled={isSubmittingReport}>
                  {isSubmittingReport ? "Sending..." : "Send report"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image View - Contained within chatbox */}
      {fullscreenImageUrl && (
        <div
          className="absolute inset-0 z-40 bg-black/95 flex flex-col"
          onClick={() => setFullscreenImageUrl(null)}
        >
          {/* Header with close button */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{backgroundColor: '#001C38'}}>
            <span className="text-white/80 text-sm font-medium">Image Viewer</span>
            <button
              onClick={() => setFullscreenImageUrl(null)}
              className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Image container with pan/zoom (mouse + touch support) */}
          <div
            className="flex-1 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing relative touch-none"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => {
              setIsDraggingImage(true);
              setDragStart({ x: e.clientX - imagePan.x, y: e.clientY - imagePan.y });
            }}
            onMouseMove={(e) => {
              if (!isDraggingImage) return;
              setImagePan({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
              });
            }}
            onMouseUp={() => setIsDraggingImage(false)}
            onMouseLeave={() => setIsDraggingImage(false)}
            // Mobile touch support
            onTouchStart={(e) => {
              const touch = e.touches[0];
              setIsDraggingImage(true);
              setDragStart({ x: touch.clientX - imagePan.x, y: touch.clientY - imagePan.y });
            }}
            onTouchMove={(e) => {
              if (!isDraggingImage) return;
              e.preventDefault(); // Prevent scrolling while panning image
              const touch = e.touches[0];
              setImagePan({
                x: touch.clientX - dragStart.x,
                y: touch.clientY - dragStart.y
              });
            }}
            onTouchEnd={() => setIsDraggingImage(false)}
            onTouchCancel={() => setIsDraggingImage(false)}
          >
            <img
              src={fullscreenImageUrl}
              alt="Fullscreen view"
              className="max-w-none select-none"
              style={{
                transform: `translate(${imagePan.x}px, ${imagePan.y}px) scale(${imageZoom})`,
                transition: isDraggingImage ? 'none' : 'transform 0.1s ease-out',
                cursor: isDraggingImage ? 'grabbing' : 'grab'
              }}
              draggable={false}
            />
          </div>

          {/* Zoom controls at bottom */}
          <div className="flex items-center justify-center gap-2 px-4 py-3 shrink-0"  style={{backgroundColor: '#001C38'}}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setImageZoom(z => Math.max(0.25, z - 0.25));
              }}
              className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <span className="text-white text-sm min-w-[60px] text-center">
              {Math.round(imageZoom * 100)}%
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setImageZoom(z => Math.min(1, z + 0.25));
              }}
              className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setImageZoom(0.5);
                setImagePan({ x: 0, y: 0 });
              }}
              className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
