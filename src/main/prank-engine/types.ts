import { PrankId, TriggerType } from '../../shared/types';

export interface PrankState {
  id: PrankId;
  active: boolean;
  lastFired: number;
  cooldownUntil: number;
  stopTimer: NodeJS.Timeout | null;
}

export interface PrankTriggerEvent {
  type: TriggerType;
  x?: number;
  y?: number;
  key?: string;
}
