import type { LucideIcon } from "lucide-react";
import {
  BriefcaseBusiness,
  Car,
  CirclePlus,
  Clapperboard,
  Ellipsis,
  FileText,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Landmark,
  PawPrint,
  Plane,
  Receipt,
  RotateCcw,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tag,
  TrendingUp,
  Utensils,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  "briefcase-business": BriefcaseBusiness,
  car: Car,
  "circle-plus": CirclePlus,
  clapperboard: Clapperboard,
  ellipsis: Ellipsis,
  "file-text": FileText,
  gift: Gift,
  "graduation-cap": GraduationCap,
  "hand-coins": HandCoins,
  "heart-pulse": HeartPulse,
  house: House,
  landmark: Landmark,
  "paw-print": PawPrint,
  plane: Plane,
  receipt: Receipt,
  "rotate-ccw": RotateCcw,
  shirt: Shirt,
  "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart,
  smartphone: Smartphone,
  tag: Tag,
  "trending-up": TrendingUp,
  utensils: Utensils,
};

export function CategoryIcon({
  icon,
  color,
  className = "size-4",
}: {
  icon: string;
  color: string;
  className?: string;
}) {
  const Icon = icons[icon] ?? Tag;
  return <Icon className={className} style={{ color }} aria-hidden />;
}
