import type { LineupSlot } from '@/types/domain';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface FlowInsight {
    id: string;
    level: RiskLevel;
    category: 'overlap' | 'readiness' | 'transition' | 'bottleneck';
    title: string;
    description: string;
    affectedSlotIds: string[];
    suggestedAction?: {
        label: string;
        type: 'reorder' | 'buffer' | 'alert';
    };
}

/**
 * AI logic to scan a lineup and identify operational risks.
 */
export function scanLineup(slots: LineupSlot[]): FlowInsight[] {
    const insights: FlowInsight[] = [];

    for (let i = 0; i < slots.length; i++) {
        const current = slots[i];
        const next = slots[i + 1];

        // 1. Check Readiness (Personnel Arrival vs Performance Ready)
        if (current.act.arrivalStatus !== 'Ready' && current.act.arrivalStatus !== 'Arrived') {
            insights.push({
                id: `ready-${current.id}`,
                level: 'high',
                category: 'readiness',
                title: 'Team Not Ready',
                description: `"${current.act.name}" cast/crew have not checked in as Ready.`,
                affectedSlotIds: [current.id],
                suggestedAction: { label: 'Go to Performance', type: 'alert' }
            });
        }

        // 2. Check Transitions (Tight turnarounds)
        if (next) {
            const currentEnd = new Date(current.scheduledStartTime).getTime() + ((current.act.durationMinutes + (current.act.setupTimeMinutes || 0)) * 60000);
            const nextStart = new Date(next.scheduledStartTime).getTime();

            // If transition is less than 2 minutes and setup is complex
            if (nextStart - currentEnd < 120000 && (next.act.setupTimeMinutes || 0) > 5) {
                insights.push({
                    id: `transition-${current.id}-${next.id}`,
                    level: 'medium',
                    category: 'transition',
                    title: 'Tight Transition',
                    description: `Very short gap between "${current.act.name}" and "${next.act.name}" given the setup complexity.`,
                    affectedSlotIds: [current.id, next.id],
                    suggestedAction: { label: 'Add Buffer', type: 'buffer' }
                });
            }
        }
    }

    return insights;
}
