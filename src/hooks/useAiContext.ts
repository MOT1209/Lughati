import { useMemo } from 'react';

import { useCurrentLearning } from '@/hooks/useCurrentLearning';
import { buildAIContext, weakTopicsFrom, type AIContext } from '@/services/ai';
import { useLearningStore } from '@/store/learningStore';

/** The learner context for AI requests (languages, level, weak topics) or null until languages are chosen. */
export function useAiContext(goal?: string): { context: AIContext | null; level: string } {
  const profile = useLearningStore((s) => s.profile);
  const learning = useCurrentLearning();
  const level = learning.status === 'success' ? learning.data.progress?.levelId ?? 'A1' : 'A1';
  const weak = useMemo(() => (learning.status === 'success' ? weakTopicsFrom(learning.data.attempts, learning.data.lessons) : []), [learning]);
  const context = useMemo(
    () => (profile ? buildAIContext({ learning: profile.target, explanation: profile.source, level, weakTopics: weak, goal }) : null),
    [profile, level, weak, goal],
  );
  return { context, level };
}
