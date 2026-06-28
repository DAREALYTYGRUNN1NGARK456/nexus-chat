import { useState, useEffect, useCallback, useRef } from 'react';
import insforge from '../lib/insforge';
import type { Message } from '../types';

export function useMessages(channelId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  const fetchMessages = useCallback(async (chId: string) => {
    setLoading(true);
    const res = await insforge.dbQuery<Message>('messages', { channel_id: chId }, 100, 'created_at:asc');
    if (res.success && res.data) setMessages(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      return;
    }

    fetchMessages(channelId);

    // Subscribe to real-time updates
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = insforge.subscribe(
      'messages',
      { channel_id: channelId },
      (event, data) => {
        const msg = data as Message;
        if (event === 'insert') {
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        } else if (event === 'update') {
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m));
        } else if (event === 'delete') {
          setMessages(prev => prev.filter(m => m.id !== msg.id));
        }
      }
    );

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [channelId, fetchMessages]);

  const sendMessage = async (content: string, authorId: string) => {
    if (!channelId || !content.trim()) return;
    await insforge.dbCreate('messages', {
      channel_id: channelId,
      author_id: authorId,
      content: content.trim(),
      is_bot: false,
      created_at: new Date().toISOString(),
    });
  };

  const deleteMessage = async (messageId: string) => {
    await insforge.dbDelete('messages', messageId);
    setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const editMessage = async (messageId: string, content: string) => {
    await insforge.dbUpdate('messages', messageId, {
      content,
      edited_at: new Date().toISOString(),
    });
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, edited_at: new Date().toISOString() } : m));
  };

  return { messages, loading, sendMessage, deleteMessage, editMessage };
}
