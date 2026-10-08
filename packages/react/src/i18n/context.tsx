import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { enMessages } from './en';
import { createFormat } from './format';
import type { EditorFormat, EditorMessageOverrides, EditorMessages } from './messages';
import { bindMessages, mergeMessages, type BoundMessages } from './resolve';

interface MessagesValue {
  /** Before binding, for a root inside this one to lay its own messages over. */
  messages: EditorMessages;
  /** How numbers and dates are written, which a root inside inherits unless it has a locale. */
  format: EditorFormat;
  /** What the parts call. */
  bound: BoundMessages;
}

const ENGLISH_FORMAT = createFormat(undefined);

const ENGLISH: MessagesValue = {
  messages: enMessages,
  format: ENGLISH_FORMAT,
  bound: bindMessages(enMessages, ENGLISH_FORMAT),
};

/** The English, bound, for the helpers a part calls outside a render (and their tests). */
export const englishMessages: BoundMessages = ENGLISH.bound;

const MessagesContext = createContext<MessagesValue>(ENGLISH);

/**
 * Provided by `BlockletterRoot`. A root inside another (`NewsletterEditor` within a host's own
 * root, say) starts from the outer one's messages and locale and lays its own over them, so a
 * host that translates its outer root translates the editor inside it too.
 */
export function MessagesProvider({
  messages,
  locale,
  children,
}: {
  messages: EditorMessageOverrides | undefined;
  locale: string | undefined;
  children: ReactNode;
}) {
  const parent = useContext(MessagesContext);
  const value = useMemo((): MessagesValue => {
    if (!messages && locale === undefined) return parent;
    const merged = mergeMessages(parent.messages, messages);
    const format = locale === undefined ? parent.format : createFormat(locale);
    return { messages: merged, format, bound: bindMessages(merged, format) };
  }, [parent, messages, locale]);
  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

/**
 * Every word the editor shows, in the language its root was given: English outside any root, so
 * a part rendered on its own (in a test, say) still has its words.
 */
export const useEditorMessages = (): BoundMessages => useContext(MessagesContext).bound;
