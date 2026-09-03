// MOVED — the smoke-test script now lives at debug/debug.steps.ts (Task 035 structure pass).
// This re-export keeps the still-live legacy ConfigScreen.tsx compiling until the router swap.
// Delete this file together with ConfigScreen.tsx / useConfig.ts / ConfigService.ts /
// ConfigTransform.ts when the new config.screen goes live.
export * from './debug/debug.steps';
