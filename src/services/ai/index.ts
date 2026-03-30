/**
 * Birleşik AI router.
 * features.claudeAI true ise Anthropic Claude kullanır,
 * değilse OpenAI GPT-4'e düşer.
 *
 * Tüm ekranlar bu modülden import etmelidir:
 *   import { sendChatMessage } from '../../services/ai';
 */
import { features } from '../../constants/config';
import * as claude from '../claude/ai';
import * as openai from '../openai/chat';

const provider = () => (features.claudeAI ? claude : openai);

export const sendChatMessage: typeof claude.sendChatMessage = (...args) =>
  provider().sendChatMessage(...args);

export const summarizeAndCategorizeMails: typeof claude.summarizeAndCategorizeMails = (...args) =>
  provider().summarizeAndCategorizeMails(...args);

export const analyzeMeeting: typeof claude.analyzeMeeting = (...args) =>
  provider().analyzeMeeting(...args);

export const generateMorningBriefing: typeof claude.generateMorningBriefing = (...args) =>
  provider().generateMorningBriefing(...args);

export const optimizeDailyPlan: typeof claude.optimizeDailyPlan = (...args) =>
  provider().optimizeDailyPlan(...args);

export const generateProactiveAdvice: typeof claude.generateProactiveAdvice = (...args) =>
  provider().generateProactiveAdvice(...args);

export const generateWeeklySummary: typeof claude.generateWeeklySummary = (...args) =>
  provider().generateWeeklySummary(...args);

export const processVoiceCommand: typeof claude.processVoiceCommand = (...args) =>
  provider().processVoiceCommand(...args);

/** Aktif AI sağlayıcı adı — UI'da göstermek için */
export const activeAIProvider = (): 'Claude' | 'GPT-4o' | null => {
  if (features.claudeAI) return 'Claude';
  if (features.openaiChat) return 'GPT-4o';
  return null;
};
