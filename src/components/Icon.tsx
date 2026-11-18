import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brush,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CloudCheck,
  Eraser,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Image,
  Leaf,
  Link,
  Lock,
  Menu,
  Mic,
  Minus,
  Music,
  Pause,
  PawPrint,
  PenTool,
  Play,
  Plus,
  Redo2,
  Shield,
  Square,
  Sun,
  Trash2,
  Undo2,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';

/**
 * Ikonok a Lucide készletből (ugyanez a shadcn/ui ikonkészlete, döntésnapló, 2026-11-18). A nevek a felületen és az
 * adatbázisban (kategóriák ikonja) használt kulcsok.
 */
const ICONS: Record<string, LucideIcon> = {
  image: Image,
  paw: PawPrint,
  leaf: Leaf,
  back: ArrowLeft,
  eye: Eye,
  'eye-off': EyeOff,
  check: Check,
  globe: Globe,
  external: ExternalLink,
  plus: Plus,
  upload: Upload,
  close: X,
  forward: ArrowRight,
  brush: Brush,
  points: PenTool,
  eraser: Eraser,
  undo: Undo2,
  redo: Redo2,
  link: Link,
  cloud: CloudCheck,
  chevron: ChevronRight,
  'chevron-down': ChevronDown,
  play: Play,
  pause: Pause,
  mic: Mic,
  stop: Square,
  minus: Minus,
  lock: Lock,
  menu: Menu,
  shield: Shield,
  city: Building2,
  story: BookOpen,
  season: Sun,
  music: Music,
  trash: Trash2,
  help: CircleHelp,
};

/** Ikonméret tokenből (--icon-sm / -md / -lg), szám nem adható meg (döntésnapló, 2026-11-18). */
export type IconSize = 'sm' | 'md' | 'lg';

export function Icon({ name, size = 'md' }: { name: string; size?: IconSize }) {
  const Glyph = ICONS[name];
  if (!Glyph) return null;
  return <Glyph className={`icon icon-${size}`} strokeWidth={2} aria-hidden="true" focusable="false" />;
}
