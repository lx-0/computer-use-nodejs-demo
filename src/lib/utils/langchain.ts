import { BaseMessage } from '@langchain/core/messages';

/**
 * Get the content of a message, handling arrays of content objects.
 * Returns '' if the message content type is not text.
 * @param message
 * @returns
 */
export const getMessageContent = (message: BaseMessage): string => {
  if (message.content instanceof Array) {
    return message.content.map((content) => (content.type === 'text' ? content.text : '')).join('');
  }
  return message.content;
};
