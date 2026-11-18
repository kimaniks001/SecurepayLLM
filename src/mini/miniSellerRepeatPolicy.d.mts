import type {MiniTradeMemoryEntry,MiniTradeMemorySave,MiniRepeatCadence,MiniStopRule} from '../api/securepay/mini-trade-memory';
export function miniSellerRepeatTemplate(input:{
  title:string; referenceKey:string; termsHint:string;
  cadence:MiniRepeatCadence;stopRule:MiniStopRule;untilDate:string|null
}):MiniTradeMemorySave|null;
export function miniSellerRepeatTiming(entry:MiniTradeMemoryEntry):string;
