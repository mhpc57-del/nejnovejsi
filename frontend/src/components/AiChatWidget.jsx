import { useState, useRef, useEffect } from 'react';
import { ChatCircleDots, PaperPlaneRight, X, Robot, User, ArrowClockwise } from '@phosphor-icons/react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const AiChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Load or create session ID
    const stored = localStorage.getItem('craftbolt_chat_session');
    if (stored) {
      setSessionId(stored);
    } else {
      const newId = 'chat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('craftbolt_chat_session', newId);
      setSessionId(newId);
    }
  }, []);

  useEffect(() => {
    if (isOpen && sessionId && messages.length === 0) {
      loadHistory();
    }
  }, [isOpen, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const loadHistory = async () => {
    try {
      const res = await axios.get(`${API}/ai/chat/history/${sessionId}`);
      if (res.data.messages?.length > 0) {
        setMessages(res.data.messages.map(m => ({
          role: m.role,
          content: m.content
        })));
      }
    } catch {
      // No history yet
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await axios.post(`${API}/ai/chat`, {
        message: text,
        session_id: sessionId
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
      if (res.data.session_id) {
        setSessionId(res.data.session_id);
        localStorage.setItem('craftbolt_chat_session', res.data.session_id);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Omlouvám se, momentálně nemohu odpovědět. Zkuste to prosím později nebo nás kontaktujte na info@craftbolt.cz.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    const newId = 'chat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('craftbolt_chat_session', newId);
    setSessionId(newId);
    setMessages([]);
  };

  const sendQuickQuestion = async (text) => {
    if (loading) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const res = await axios.post(`${API}/ai/chat`, { message: text, session_id: sessionId });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
      if (res.data.session_id) {
        setSessionId(res.data.session_id);
        localStorage.setItem('craftbolt_chat_session', res.data.session_id);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Omlouvám se, momentálně nemohu odpovědět. Zkuste to prosím později nebo nás kontaktujte na info@craftbolt.cz.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[9999] w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
          data-testid="ai-chat-toggle"
        >
          <ChatCircleDots weight="fill" className="w-7 h-7" />
          <span className="absolute -top-10 right-0 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            AI Podpora
          </span>
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-[9999] w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ height: '520px' }}
          data-testid="ai-chat-window"
        >
          {/* Header */}
          <div className="bg-gray-900 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <Robot weight="bold" className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">CraftBolt AI</h3>
                <p className="text-zinc-400 text-xs">Online podpora</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleNewChat}
                className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Nová konverzace"
                data-testid="ai-chat-new"
              >
                <ArrowClockwise className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                data-testid="ai-chat-close"
              >
                <X weight="bold" className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50 dark:bg-zinc-950">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Robot weight="fill" className="w-6 h-6 text-orange-500" />
                </div>
                <p className="text-gray-700 font-medium text-sm mb-1">Ahoj! Jsem CraftBolt AI asistent.</p>
                <p className="text-zinc-500 text-xs">Zeptejte se mě na cokoliv ohledně platformy.</p>
                <div className="mt-4 space-y-1.5">
                  {['Jak se zaregistruji?', 'Jaké jsou tarify?', 'Jak funguje poptávka?'].map((q) => (
                    <button
                      key={q}
                      onClick={() => sendQuickQuestion(q)}
                      className="block w-full text-left px-3 py-2 bg-white rounded-lg text-xs text-zinc-600 hover:bg-orange-50 hover:text-orange-600 border border-zinc-200/80 dark:border-zinc-800 transition-colors"
                      data-testid={`ai-quick-${q.substring(0, 10)}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-end gap-1.5 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-gray-200' : 'bg-orange-500'
                  }`}>
                    {msg.role === 'user'
                      ? <User weight="bold" className="w-3.5 h-3.5 text-zinc-600" />
                      : <Robot weight="bold" className="w-3.5 h-3.5 text-white" />
                    }
                  </div>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-orange-500 text-white rounded-br-md'
                      : 'bg-white text-gray-700 border border-zinc-200/80 dark:border-zinc-800 rounded-bl-md shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-end gap-1.5">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Robot weight="bold" className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-white border border-zinc-200/80 dark:border-zinc-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800 bg-white flex-shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Napište dotaz..."
                disabled={loading}
                className="flex-1 px-3.5 py-2.5 bg-stone-50 dark:bg-zinc-950 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-50"
                data-testid="ai-chat-input"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-3.5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="ai-chat-send"
              >
                <PaperPlaneRight weight="bold" className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AiChatWidget;
