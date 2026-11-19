import { useState } from 'react';
import { Bot, Send, Sparkles, X } from 'lucide-react';
import { askChatbot } from '../services/api';

export default function AIChatbotModal({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am your Circular Economy AI Assistant. Ask me anything about industrial waste classification, recycling techniques, rule-based matching, or transport cost estimation.',
      sdgImpact: 'SDG 9 & SDG 12',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userQuery }]);
    setLoading(true);

    try {
      const response = await askChatbot(userQuery);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: response.reply,
          sdgImpact: response.sdgImpact,
        },
      ]);
    } catch {
      // Local fallback
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Our rule-based matching engine links waste providers with raw material seekers by comparing category compatibility (35%), keyword alignment (25%), quantity fit (20%), and regional transport proximity (15%).',
          sdgImpact: 'SDG 9: Industry & Innovation',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot-backdrop" style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      width: '380px',
      maxWidth: '90vw',
      height: '520px',
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      boxShadow: '0 12px 36px rgba(0,0,0,0.22)',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #d8eedc',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        backgroundColor: '#1a5a46',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={20} color="#7ccaa2" />
          <div>
            <strong style={{ fontSize: '0.95rem' }}>Circular AI Assistant</strong>
            <div style={{ fontSize: '0.75rem', color: '#d8eedc' }}>Industrial Waste Advisory</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backgroundColor: '#f8faf8',
      }}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              backgroundColor: msg.sender === 'user' ? '#1a5a46' : '#ffffff',
              color: msg.sender === 'user' ? '#ffffff' : '#2d3748',
              padding: '10px 14px',
              borderRadius: '12px',
              border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
              fontSize: '0.875rem',
              lineHeight: 1.45,
            }}
          >
            {msg.text}
            {msg.sdgImpact && (
              <div style={{
                marginTop: '6px',
                paddingTop: '6px',
                borderTop: '1px dashed #e2e8f0',
                fontSize: '0.72rem',
                color: '#34a86b',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <Sparkles size={12} /> {msg.sdgImpact}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', fontSize: '0.8rem', color: '#718096' }}>
            Consulting industrial waste knowledge base...
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{
        padding: '12px',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        display: 'flex',
        gap: '8px',
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about scrap, matching, or logistics..."
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '0.85rem',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          className="btn btn-primary-custom"
          style={{ padding: '8px 14px', borderRadius: '8px' }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

