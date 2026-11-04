import { createContext, useContext } from 'react';

export const BookCtx = createContext(null);

export function useBook() {
  const ctx = useContext(BookCtx);
  if (!ctx) throw new Error('BookCtx missing');
  return ctx;
}
