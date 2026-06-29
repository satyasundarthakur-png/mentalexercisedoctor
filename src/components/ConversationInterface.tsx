'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getAdaptiveResponse } from '@/lib/ai-composer';
import type { ChatMessage } from '@/types/session';

interface ConversationInterfaceProps {
  sessionTitle: string;
  onAdaptSession?: (feedback: string) => void;
}

const QUICK_RESPONSES = [
  { label: 'Feeling anxious', value: "I'm feeling anxious" },
  { label: 'Having pain', value: 'I have some pain' },
  { label: 'Feeling tired', value: "I'm feeling tired" },
  { label: "Can't imagine it", value: "I can't picture the imagery" },
  { label: 'Feeling relaxed', value: "I'm feeling relaxed and calm" },
];

export default function ConversationInterface({
  sessionTitle,
  onAdaptSession,
}: ConversationInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'ai',
      content: 'How are you feeling right now? Is the imagery comfortable for you?',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const addMessage = useCallback((role: 'user' | 'ai', content: string) => {
    setMessages((prev) => [...prev, { role, content, timestamp: Date.now() }]);
  }, []);

  const handleSend = useCallback(
    async (text?: string) => {
      const messageText = text ?? input.trim();
      if (!messageText || loading) return;

      setInput('');
      addMessage('user', messageText);
      setLoading(true);

      if (onAdaptSession) onAdaptSession(messageText);

      try {
        // Build history for context (exclude the initial AI greeting from history)
        const history = messages.slice(-8).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await getAdaptiveResponse(sessionTitle, history, messageText);
        addMessage('ai', response);
      } catch {
        addMessage(
          'ai',
          "Thank you for sharing. Let's continue gently — you're always in control of this experience."
        );
      } finally {
        setLoading(false);
        // Refocus input after response
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [input, loading, messages, sessionTitle, onAdaptSession, addMessage]
  );

  const startVoiceInput = useCallback(() => {
    setVoiceError('');

    const SpeechRecognitionAPI =
      (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setVoiceError('Voice input requires Chrome or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceError('Could not hear clearly. Please try again or type.');
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  return (
    <section
      className="bg-white rounded-3xl border border-[#e6e3d9] p-6 mt-6"
      aria-label="Live conversation with AI therapy guide"
    >
      {/* Header */}
      <div className="mb-4">
        <h4 className="font-medium text-[#2c3e2d] text-sm">Live conversation</h4>
        <p className="text-xs text-[#5c6b5c] mt-0.5">
          Talk to your AI guide — the session adapts to your feedback
        </p>
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="h-52 overflow-y-auto mb-4 flex flex-col gap-3 pr-1"
        role="log"
        aria-live="polite"
        aria-label="Conversation messages"
      >
        {messages.map((msg, index) => (
          <div
            key={`${msg.timestamp}-${index}`}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#0f4c3a] text-white rounded-br-sm'
                  : 'bg-[#f8f7f4] text-[#2c3e2d] rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#f8f7f4] text-[#5c6b5c] rounded-2xl rounded-bl-sm px-4 py-3 text-sm">
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Quick response buttons */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {QUICK_RESPONSES.map((qr) => (
          <button
            key={qr.value}
            onClick={() => handleSend(qr.value)}
            disabled={loading}
            className="px-3 py-1 text-xs rounded-full border border-[#d4d0c4] text-[#5c6b5c] hover:bg-[#f8f7f4] hover:border-[#0f4c3a] hover:text-[#0f4c3a] transition-colors disabled:opacity-40"
          >
            {qr.label}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <button
          onClick={startVoiceInput}
          disabled={loading}
          aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          className={`flex-shrink-0 px-3 py-2.5 rounded-2xl border transition-colors text-sm ${
            isListening
              ? 'border-[#0f4c3a] bg-[#f0fdf4] text-[#0f4c3a]'
              : 'border-[#c8c3b8] hover:bg-[#f8f7f4] text-[#2c3e2d]'
          } disabled:opacity-40`}
        >
          {isListening ? '⏹' : '🎤'}
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={isListening ? 'Listening…' : "How are you feeling?"}
          disabled={loading}
          aria-label="Type your message"
          className="flex-1 border border-[#c8c3b8] rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0f4c3a] disabled:opacity-60 bg-white text-[#2c3e2d] placeholder-[#8a9a8a]"
        />

        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          aria-label="Send message"
          className="flex-shrink-0 px-5 py-2.5 bg-[#0f4c3a] text-white rounded-2xl text-sm hover:bg-[#0a3a2b] transition-colors disabled:opacity-40 active:scale-95"
        >
          Send
        </button>
      </div>

      {/* Errors */}
      {voiceError && (
        <p className="mt-2 text-xs text-red-500" role="alert">
          {voiceError}
        </p>
      )}

      <p className="text-[10px] text-[#8a9a8a] mt-3 text-center">
        Your feedback helps the AI adapt the session in real time
      </p>
    </section>
  );
}
