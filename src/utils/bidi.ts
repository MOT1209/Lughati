// Unicode bidi isolates keep mixed-script strings from reordering each other, e.g. an
// Arabic sentence containing "Deutsch" or a Latin user name.
const FSI = '⁨'; // first-strong isolate: direction decided by the content
const LRI = '⁦'; // left-to-right isolate
const PDI = '⁩'; // pop directional isolate

/** Isolate text of unknown direction (user names, free text) inside a sentence. */
export function isolate(text: string): string {
  return `${FSI}${text}${PDI}`;
}

/** Isolate text that is always LTR (native language names such as "Español"). */
export function isolateLtr(text: string): string {
  return `${LRI}${text}${PDI}`;
}
