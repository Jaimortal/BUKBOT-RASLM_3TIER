import { motion } from "framer-motion";
import { ALL_CATEGORIES, type CategoryId } from "@/lib/categoryConfig";
import { MapPin, ClipboardList, GraduationCap, Building2, Landmark, ChevronRight } from "lucide-react";

interface WelcomeScreenProps {
  onSelectCategory: (categoryId: CategoryId) => void;
}

const ICON_MAP: Record<string, any> = {
  MapPin,
  ClipboardList,
  GraduationCap,
  Building2,
  Landmark,
};

export function WelcomeScreen({ onSelectCategory }: WelcomeScreenProps) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-4 overflow-y-auto bg-slate-950/65 backdrop-blur-md animate-in fade-in-0 duration-300">
      <div className="w-full max-w-md my-auto flex flex-col items-center gap-4 text-center">
        {/* Welcome Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-center"
        >
          <img
            src="/LOGO.png"
            alt="BukSU Logo"
            className="h-16 w-16 object-contain drop-shadow-md select-none"
            draggable={false}
          />
        </motion.div>

        {/* Welcoming Typography */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="space-y-1"
        >
          <h2 className="text-lg font-extrabold tracking-tight text-white sm:text-xl drop-shadow-sm">
            Hello, BukSUan!
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed max-w-xs mx-auto">
            What would you like me to assist you with today?
          </p>
          <p className="text-[11px] text-slate-300 font-light pt-0.5">
            Select a category below to begin our conversation:
          </p>
        </motion.div>

        {/* Category Choice Cards */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full space-y-2 pt-1"
        >
          {ALL_CATEGORIES.map((cat) => {
            const IconComponent = ICON_MAP[cat.iconName] || Landmark;
            return (
              <motion.button
                key={cat.id}
                type="button"
                whileHover={{ scale: 1.015, y: -1 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => onSelectCategory(cat.id)}
                className="group relative flex w-full items-center justify-between overflow-hidden rounded-2xl border border-white/15 bg-white/90 p-3 text-left shadow-md transition-all duration-200 hover:bg-white hover:border-white hover:shadow-xl hover:shadow-blue-900/20 focus:outline-none focus:ring-2 focus:ring-sky-400/40 backdrop-blur-sm cursor-pointer"
              >
                {/* Left Icon Badge */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-blue-950 shadow-xs transition-all duration-200 group-hover:bg-[#001C38] group-hover:text-white"
                >
                  <IconComponent className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 px-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-blue-950 truncate">
                      {cat.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1 group-hover:text-slate-600">
                    {cat.description}
                  </p>
                </div>

                {/* Right Arrow */}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100/80 text-slate-400 transition-all duration-200 group-hover:bg-blue-600 group-hover:text-white group-hover:translate-x-0.5">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* Footer Info */}
      <div className="w-full text-center text-[10.5px] text-slate-400 pt-3">
        Bukidnon State University AI Chatbot • Direct FAQ Knowledge
      </div>
    </div>
  );
}
