// components/SpaceIcon.tsx — renders a Space/Category icon token.
//
// space.icon / category.icon store a Lucide icon slug from the plugin's icon
// picker (the canonical 24: users, hand, megaphone, message-circle,
// help-circle, lightbulb, star, rocket, book-open, award, shield, pin,
// bookmark, home, hash, folder, user, settings, bell, flag, image, eye, lock,
// smile-plus). Rendering the raw slug as text looked broken — this maps the
// slug to the matching lucide-react-native icon, falling back to Hash for an
// empty or unknown slug.

import {
  Award,
  Bell,
  Bookmark,
  BookOpen,
  Eye,
  Flag,
  Folder,
  Hand,
  Hash,
  HelpCircle,
  Home,
  Image as ImageIcon,
  Lightbulb,
  Lock,
  Megaphone,
  MessageCircle,
  Pin,
  Rocket,
  Settings,
  Shield,
  SmilePlus,
  Star,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react-native';

const ICON_MAP: Record<string, LucideIcon> = {
  users: Users,
  hand: Hand,
  megaphone: Megaphone,
  'message-circle': MessageCircle,
  'help-circle': HelpCircle,
  lightbulb: Lightbulb,
  star: Star,
  rocket: Rocket,
  'book-open': BookOpen,
  award: Award,
  shield: Shield,
  pin: Pin,
  bookmark: Bookmark,
  home: Home,
  hash: Hash,
  folder: Folder,
  user: User,
  settings: Settings,
  bell: Bell,
  flag: Flag,
  image: ImageIcon,
  eye: Eye,
  lock: Lock,
  'smile-plus': SmilePlus,
};

export interface SpaceIconProps {
  /** Lucide icon slug from the plugin picker. Empty/unknown → Hash. */
  icon?: string | null;
  size?: number;
  color?: string;
}

export default function SpaceIcon({ icon, size = 22, color }: SpaceIconProps) {
  const Cmp = (icon && ICON_MAP[icon]) || Hash;
  return <Cmp size={size} color={color} />;
}
