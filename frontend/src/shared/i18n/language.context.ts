import { createContext, useContext } from 'react';
import { getStrings, Strings } from './strings';

export interface LanguageContextValue {
  language: string;
  strings: Strings;
  setLanguage: (lang: string) => void;
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: 'pt-BR',
  strings: getStrings('pt-BR'),
  setLanguage: () => {},
});

export function useStringsFromContext(): Strings {
  return useContext(LanguageContext).strings;
}
