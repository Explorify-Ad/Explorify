import { useState, useEffect } from 'react';
import * as Battery from 'expo-battery';

/**
 * Returns battery level (0–1), charging state, and helpers for
 * adaptive routing decisions.
 *
 * batteryLevel tiers:
 *   < 0.10 → 'critical' — lock routes to 30 min, hard warning
 *   < 0.20 → 'low'      — cap routes to 60 min, soft warning
 *   < 0.50 → 'medium'   — no cap, but show info nudge
 *   >= 0.50 → 'ok'      — no restrictions
 */
export default function useBattery() {
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [isCharging, setIsCharging]     = useState(false);

  useEffect(() => {
    let levelSub;
    let stateSub;

    (async () => {
      const [level, state] = await Promise.all([
        Battery.getBatteryLevelAsync(),
        Battery.getBatteryStateAsync(),
      ]);
      setBatteryLevel(level);
      setIsCharging(
        state === Battery.BatteryState.CHARGING ||
        state === Battery.BatteryState.FULL,
      );

      // Subscribe to changes
      levelSub = Battery.addBatteryLevelListener(({ batteryLevel: l }) => {
        setBatteryLevel(l);
      });
      stateSub = Battery.addBatteryStateListener(({ batteryState }) => {
        setIsCharging(
          batteryState === Battery.BatteryState.CHARGING ||
          batteryState === Battery.BatteryState.FULL,
        );
      });
    })();

    return () => {
      levelSub?.remove();
      stateSub?.remove();
    };
  }, []);

  /** Tier string for UI decisions */
  const tier = isCharging
    ? 'ok'
    : batteryLevel === null
    ? 'ok'
    : batteryLevel < 0.10
    ? 'critical'
    : batteryLevel < 0.20
    ? 'low'
    : batteryLevel < 0.50
    ? 'medium'
    : 'ok';

  /**
   * Adjusts a proposed route time budget (minutes) based on battery.
   * Returns the capped budget and a human-readable reason if capped.
   */
  const getAdjustedBudget = (requestedMinutes) => {
    if (isCharging || batteryLevel === null) {
      return { budget: requestedMinutes, capped: false, reason: null };
    }
    if (batteryLevel < 0.10) {
      const budget = Math.min(requestedMinutes, 30);
      return { budget, capped: budget < requestedMinutes,
        reason: 'Battery critical — route shortened to save power.' };
    }
    if (batteryLevel < 0.20) {
      const budget = Math.min(requestedMinutes, 60);
      return { budget, capped: budget < requestedMinutes,
        reason: 'Battery low — route shortened to 1 hour.' };
    }
    return { budget: requestedMinutes, capped: false, reason: null };
  };

  /** Whether to reduce GPS polling frequency */
  const reduceGPS = !isCharging && batteryLevel !== null && batteryLevel < 0.20;

  return { batteryLevel, isCharging, tier, getAdjustedBudget, reduceGPS };
}
