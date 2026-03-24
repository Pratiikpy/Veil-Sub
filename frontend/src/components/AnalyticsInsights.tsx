'use client'

import { useMemo } from 'react'
import { m } from 'framer-motion'
import { Lightbulb, TrendingUp, AlertTriangle, Award, Target } from 'lucide-react'

type InsightType = 'success' | 'warning' | 'milestone' | 'tip'

interface Insight {
  type: InsightType
  title: string
  message: string
}

interface AnalyticsInsightsProps {
  subscriberCount: number
  totalRevenue: number   // microcredits
  contentCount: number
  recentPosts: number    // posts in last 30 days
  churnRate?: number     // 0-1 range
}

const TYPE_CONFIG: Record<InsightType, { bg: string; border: string; text: string; icon: typeof Lightbulb }> = {
  success: {
    bg: 'bg-emerald-500/[0.06]',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    icon: TrendingUp,
  },
  warning: {
    bg: 'bg-amber-500/[0.06]',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    icon: AlertTriangle,
  },
  milestone: {
    bg: 'bg-violet-500/[0.06]',
    border: 'border-violet-500/20',
    text: 'text-violet-400',
    icon: Award,
  },
  tip: {
    bg: 'bg-blue-500/[0.06]',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    icon: Lightbulb,
  },
}

/**
 * Generate rule-based insights from analytics data.
 * No AI needed -- just pattern detection on real numbers.
 */
function generateInsights(data: AnalyticsInsightsProps): Insight[] {
  const insights: Insight[] = []

  // Posting frequency
  if (data.contentCount > 0 && data.recentPosts === 0) {
    insights.push({
      type: 'warning',
      title: 'Time to post',
      message: "You haven't posted in 30 days. Active creators retain 3x more subscribers.",
    })
  } else if (data.recentPosts >= 8) {
    insights.push({
      type: 'success',
      title: 'Great posting streak',
      message: `${data.recentPosts} posts this month. Your subscribers are getting great value.`,
    })
  } else if (data.recentPosts >= 1 && data.recentPosts < 4) {
    insights.push({
      type: 'tip',
      title: 'Post more often',
      message: `${data.recentPosts} post${data.recentPosts === 1 ? '' : 's'} this month. Aim for 4+ to keep subscribers engaged.`,
    })
  }

  // Revenue milestones
  if (data.totalRevenue > 100_000_000) {
    insights.push({
      type: 'milestone',
      title: 'Revenue milestone',
      message: 'You\'ve earned over 100 ALEO. You\'re in the top tier of VeilSub creators.',
    })
  } else if (data.totalRevenue > 10_000_000) {
    insights.push({
      type: 'milestone',
      title: 'Revenue milestone',
      message: 'You\'ve earned over 10 ALEO. Keep growing your subscriber base!',
    })
  } else if (data.totalRevenue > 1_000_000) {
    insights.push({
      type: 'milestone',
      title: 'First ALEO earned',
      message: 'Congrats on your first full ALEO in revenue. Consistency is key from here.',
    })
  }

  // Subscriber growth prompts
  if (data.subscriberCount === 0 && data.contentCount > 0) {
    insights.push({
      type: 'tip',
      title: 'Get your first subscriber',
      message: 'Share your creator page link to attract subscribers. Free posts help with discovery.',
    })
  } else if (data.subscriberCount === 0 && data.contentCount === 0) {
    insights.push({
      type: 'tip',
      title: 'Publish your first post',
      message: 'Create your first post to start attracting subscribers. Free content drives discovery.',
    })
  } else if (data.subscriberCount >= 5 && data.subscriberCount < 10) {
    insights.push({
      type: 'success',
      title: 'Growing audience',
      message: `${data.subscriberCount} subscribers. You're building a real community. Consider adding exclusive tiers.`,
    })
  } else if (data.subscriberCount >= 10) {
    insights.push({
      type: 'milestone',
      title: 'Double digits',
      message: `${data.subscriberCount} subscribers. Your community is thriving.`,
    })
  }

  // Churn warning
  if (data.churnRate !== undefined && data.churnRate > 0.25 && data.subscriberCount > 0) {
    insights.push({
      type: 'warning',
      title: 'High churn rate',
      message: `${Math.round(data.churnRate * 100)}% churn. Try posting more frequently or adding exclusive content to retain subscribers.`,
    })
  }

  // Content-to-subscriber ratio
  if (data.contentCount > 10 && data.subscriberCount === 0) {
    insights.push({
      type: 'tip',
      title: 'Content needs visibility',
      message: `${data.contentCount} posts but no subscribers yet. Share your profile link on social media to drive discovery.`,
    })
  }

  return insights
}

/**
 * Smart Analytics Insights -- rule-based pattern detection
 * displayed as cards on the analytics page.
 */
export default function AnalyticsInsights(props: AnalyticsInsightsProps) {
  const insights = useMemo(() => generateInsights(props), [
    props.subscriberCount,
    props.totalRevenue,
    props.contentCount,
    props.recentPosts,
    props.churnRate,
  ])

  if (insights.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-4 h-4 text-violet-400" aria-hidden="true" />
        <h3 className="text-sm font-medium text-white">Smart Insights</h3>
      </div>
      {insights.map((insight, i) => {
        const config = TYPE_CONFIG[insight.type]
        const Icon = config.icon
        return (
          <m.div
            key={`${insight.type}-${insight.title}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`flex items-start gap-3 p-4 rounded-xl border ${config.bg} ${config.border}`}
          >
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.text}`} aria-hidden="true" />
            <div className="min-w-0">
              <p className={`text-sm font-medium ${config.text} mb-0.5`}>{insight.title}</p>
              <p className="text-xs text-white/60 leading-relaxed">{insight.message}</p>
            </div>
          </m.div>
        )
      })}
    </div>
  )
}
