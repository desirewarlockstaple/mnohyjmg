export interface BrainDashConfig {
  laneCount: 3;
  laneWidth: number;
  baseSpeed: number;
  speedRamp: number;
  maxSpeed: number;
  livesMax: number;
  worldChunkLength: number;
  obstacleEverySec: number;
  coinEverySec: number;
  questionEveryMeters: number;
  questionResolveAfterMeters: number;
  laneSwitchSpeed: number;
  jumpHeight: number;
  jumpDuration: number;
  slideDuration: number;
}

export const DEFAULT_CONFIG: BrainDashConfig = {
  laneCount: 3,
  laneWidth: 2,
  baseSpeed: 12,
  speedRamp: 0.6,
  maxSpeed: 28,
  livesMax: 3,
  worldChunkLength: 40,
  obstacleEverySec: 1.4,
  coinEverySec: 0.45,
  questionEveryMeters: 220,
  questionResolveAfterMeters: 70,
  laneSwitchSpeed: 8,
  jumpHeight: 1.6,
  jumpDuration: 0.7,
  slideDuration: 0.5,
};
