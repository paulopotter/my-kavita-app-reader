import { useContext } from 'react';
import { LanguageContext } from './LanguageContext';
import { Strings } from './strings';

export function useStrings(): Strings {
  return useContext(LanguageContext).strings;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  return { language: ctx.language, setLanguage: ctx.setLanguage };
}
