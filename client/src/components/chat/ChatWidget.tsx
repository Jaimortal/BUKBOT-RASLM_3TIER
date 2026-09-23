import { useState } from "react";
import { MessageSquare, MessageCircle, X, Bot, GraduationCap, Sparkles, HelpCircle, Info, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import ChatWindow from "./ChatWindow";
import { useQuery } from "@tanstack/react-query";
import { fetchChatWidgetSettings } from "@/lib/adminApi";

export function renderWidgetIcon(iconKey: string, isOpen: boolean) {
  switch (iconKey) {
    case "message-square":
    case "message-circle":
    case "💬":
      return <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />;
    case "bot":
    case "🤖":
      return <Bot className="h-5 w-5 sm:h-6 sm:w-6" />;
    case "graduation-cap":
    case "🎓":
      return <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />;
    case "sparkles":
      return <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />;
    case "help-circle":
    case "?":
      return <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6" />;
    case "info":
    case "i":
      return <Info className="h-5 w-5 sm:h-6 sm:w-6" />;
    case "x":
    case "✕":
      return <X className="h-5 w-5 sm:h-6 sm:w-6" />;
    case "chevron-down":
      return <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6" />;
    default:
      if (!iconKey) {
        return isOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />;
      }
      return <span className="text-xl sm:text-2xl font-bold">{iconKey}</span>;
  }
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: widgetSettings = {
    inactiveIcon: "message-square",
    inactiveImageUrl: "",
    activeIcon: "x",
    activeImageUrl: "",
    inactiveCustomImages: [],
    activeCustomImages: [],
    chatheadBgColor: "#001C38",
    chatheadOpacity: 1,
  } } = useQuery({
    queryKey: ["chatWidgetSettings"],
    queryFn: fetchChatWidgetSettings,
    staleTime: 60_000,
  });
  const currentIcon = isOpen ? widgetSettings.activeIcon : widgetSettings.inactiveIcon;
  const currentImage = isOpen ? widgetSettings.activeImageUrl : widgetSettings.inactiveImageUrl;

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-50 flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 💬 EDIT CHATBOX HEIGHT & WIDTH HERE 💬 */}
            {/* Find 'h-[700px]' below and change 700px to any height you prefer (e.g. 800px) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="mb-3 h-[calc(100dvh-5.5rem)] max-h-[calc(100dvh-5.5rem)] w-[calc(100vw-1.5rem)] sm:w-[400px] bg-background rounded-2xl shadow-2xl overflow-hidden border border-border/50 pointer-events-auto origin-bottom-center sm:origin-bottom-right sm:mr-0 mr-auto"
            >
              <ChatWindow 
                onClose={() => setIsOpen(false)} 
                isOpen={isOpen} 
                primaryColor={widgetSettings.chatheadBgColor || "#001C38"} 
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto h-11 w-11 sm:h-12 sm:w-12 rounded-full text-white shadow-lg flex items-center justify-center relative overflow-hidden group"
        style={{ backgroundColor: widgetSettings.chatheadBgColor || "#001C38", opacity: widgetSettings.chatheadOpacity ?? 1 }}
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        <AnimatePresence mode="wait">
          {currentImage ? (
            <motion.img
              key={`chat-image-${isOpen ? "active" : "inactive"}`}
              src={currentImage}
              alt="Chatbot"
              className="h-full w-full object-cover"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            />
          ) : (
            <motion.div
              key={`chat-icon-${isOpen ? "active" : "inactive"}-${currentIcon}`}
              className="flex items-center justify-center text-white"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              {renderWidgetIcon(currentIcon, isOpen)}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
