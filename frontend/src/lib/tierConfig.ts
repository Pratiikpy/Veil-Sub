import { Star, MessageSquare, Crown } from 'lucide-react'

export const tierConfig: Record<number, { name: string; icon: typeof Star; color: string; border: string; bg: string; text: string; lockBg: string }> = {
  1: {
    name: 'Supporter',
    icon: Star,
    color: 'green',
    border: 'border-green-500/20',
    bg: 'bg-green-500/5',
    text: 'text-green-300',
    lockBg: 'bg-green-500/10',
  },
  2: {
    name: 'Premium',
    icon: MessageSquare,
    color: 'blue',
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/5',
    text: 'text-blue-300',
    lockBg: 'bg-blue-500/10',
  },
  3: {
    name: 'VIP',
    icon: Crown,
    color: 'violet',
    border: 'border-violet-500/20',
    bg: 'bg-violet-500/5',
    text: 'text-violet-300',
    lockBg: 'bg-violet-500/10',
  },
}
