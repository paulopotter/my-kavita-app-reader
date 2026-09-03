import { useConfigLanguage } from '../config.hooks';

// The onboarding screen has almost no state of its own — it composes config pieces. What it
// owns: the language switch (delegated to config.hooks, shared with the Config menu) and,
// eventually, any "are we done?" gate beyond what the server screen already tracks.
export function useSetup() {
  const { language, changeLanguage } = useConfigLanguage();
  return { language, changeLanguage };
}
