import type { ar } from './locales/ar';

type Widen<T> = T extends string ? string : { -readonly [K in keyof T]: Widen<T[K]> };

/** Shape every locale file must satisfy; derived from the Arabic base so keys can't drift. */
export type Translation = Widen<typeof ar>;
