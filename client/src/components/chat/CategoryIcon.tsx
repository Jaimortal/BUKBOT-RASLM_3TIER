import { MapPin, ClipboardList, GraduationCap, Building2, Landmark, HelpCircle } from "lucide-react";
import type { CategoryId } from "@/lib/categoryConfig";

interface CategoryIconProps {
  id: CategoryId | string;
  className?: string;
}

export function CategoryIcon({ id, className = "h-4 w-4" }: CategoryIconProps) {
  switch (id) {
    case "location":
      return <MapPin className={className} />;
    case "procedures":
      return <ClipboardList className={className} />;
    case "academics":
      return <GraduationCap className={className} />;
    case "services":
      return <Building2 className={className} />;
    case "university":
      return <Landmark className={className} />;
    default:
      return <HelpCircle className={className} />;
  }
}
