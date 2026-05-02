import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { chatWithMedGemma } from '../lib/gemini';
import { ChatMessage } from '../types';

export default function MedGemmaChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I am MedGemma, your personalized healthcare consultant. How can I help you manage your health today?",
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // Show button if we are more than 200px away from the bottom
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 200;
    setShowScrollButton(!isAtBottom);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithMedGemma(input, messages);
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response || "I couldn't process that. Could you try again?",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F4ED] rounded-[32px] overflow-hidden border border-natural-border shadow-inner">
      <div className="p-6 border-b border-natural-border bg-white flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-sage-primary flex items-center justify-center text-white shadow-md">
          <Bot size={24} />
        </div>
        <div>
          <h3 className="font-serif font-bold text-sage-primary italic text-xl leading-tight">Consultant Engine</h3>
          <p className="text-[10px] text-sage-muted font-bold uppercase tracking-widest mt-1 underline decoration-sage-muted/30">MedGemma v2.4 Active</p>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-white/30 backdrop-blur-sm relative"
      >
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-4 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center shadow-sm ${
                   message.role === 'user' ? 'bg-earth-accent text-white' : 'bg-sage-primary text-white font-serif italic'
                }`}>
                  {message.role === 'user' ? <User size={14} /> : 'g'}
                </div>
                <div className={`p-5 rounded-[24px] shadow-sm flex flex-col ${
                  message.role === 'user' 
                    ? 'bg-sage-primary text-white rounded-tr-none' 
                    : 'bg-white text-natural-text rounded-tl-none border border-natural-border'
                }`}>
                  <div className={`prose prose-sm max-w-none ${message.role === 'user' ? 'prose-invert text-white/90' : 'text-natural-text/90'}`}>
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  <span className={`text-[10px] mt-4 font-bold uppercase tracking-widest ${message.role === 'user' ? 'text-white/40' : 'text-sage-muted'}`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-4 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-sage-primary text-white flex items-center justify-center font-serif italic shadow-sm">
                g
              </div>
              <div className="p-5 bg-white rounded-[24px] rounded-tl-none border border-natural-border shadow-sm">
                <Loader2 className="animate-spin text-sage-primary opacity-40" size={20} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="fixed bottom-32 left-1/2 -translate-x-1/2 p-3 bg-sage-primary text-white rounded-full shadow-lg hover:bg-sage-primary/90 transition-all z-20 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-4 border border-white/20"
            >
              <div className="w-4 h-4 flex items-center justify-center animate-bounce">
                <Send size={12} className="rotate-90" />
              </div>
              New Messages Below
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <form onSubmit={handleSend} className="p-6 bg-white border-t border-natural-border">
        <div className="relative flex items-center bg-natural-bg rounded-full p-1 border border-natural-border shadow-inner">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search symptoms or health protocols..."
            className="w-full bg-transparent border-none rounded-full py-4 pl-6 pr-16 text-sm focus:ring-0 transition-all outline-none text-natural-text placeholder:text-sage-muted font-medium"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-3 bg-sage-primary text-white rounded-full hover:bg-sage-primary/90 disabled:opacity-50 transition-all shadow-md active:scale-95"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[9px] text-center text-sage-muted uppercase tracking-[0.2em] mt-4 opacity-70">
          AI Interface • End-to-End Encrypted
        </p>
      </form>
    </div>
  );
}
