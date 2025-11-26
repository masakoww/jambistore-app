'use client';

import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useWebsite } from '@/lib/websiteContext';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function FloatingButtons() {
  const { language } = useWebsite();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text:
        language === 'id'
          ? 'Hi! Ada yang bisa kami bantu? Silakan tanyakan tentang produk, metode pembayaran, atau kendala yang kamu alami.'
          : "Hi! How can I help you today? Feel free to ask about our products, payment methods, or any issues you're experiencing.",
      sender: 'bot',
      timestamp: new Date(),
    }
  ]);

  const discordInviteLink = 'https://discord.gg/KrWnqnbW6f'; // Replace with your Discord invite link

  const handleSendMessage = () => {
    if (message.trim()) {
      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        text: message,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      setMessage('');

      // Bot response after short delay
      setTimeout(() => {
        const botResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text:
            language === 'id'
              ? 'Terima kasih sudah menghubungi kami! Untuk respon lebih cepat dan terhubung dengan komunitas, silakan join server Discord kami.'
              : 'Thanks for reaching out! For faster support and to connect with our community, please join our Discord server where our team can assist you immediately.',
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botResponse]);

        // Add Discord invite button message after another delay
        setTimeout(() => {
          const discordInvite: ChatMessage = {
            id: (Date.now() + 2).toString(),
            text: "discord_invite",
            sender: 'bot',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, discordInvite]);
        }, 800);
      }, 600);
    }
  };

  return (
    <>

      {/* Chatbot Button */}
      <div className="fixed bottom-6 right-32 z-50">

        {!isChatOpen ? (
          <button
            onClick={() => setIsChatOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        ) : (
          <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-80 sm:w-96 overflow-hidden">
            {/* Chat Header */}
            <div className="bg-purple-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">

                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    {language === 'id' ? 'Chat Bantuan' : 'Support Chat'}
                  </h3>
                  <p className="text-xs text-purple-200">
                    {language === 'id' ? 'Kami siap membantu' : "We're online"}
                  </p>
                </div>

              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="h-80 overflow-y-auto p-4 space-y-4 bg-black">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.sender === 'bot' && (
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`rounded-2xl p-3 max-w-[80%] ${
                    msg.sender === 'user'
                      ? 'bg-purple-600 rounded-tr-none'
                      : 'bg-white/5 border border-white/10 rounded-tl-none'
                  }`}>
                    {msg.text === 'discord_invite' ? (
                      <a
                        href={discordInviteLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                        </svg>
                        <span className="font-semibold">
                          {language === 'id' ? 'Gabung ke Discord' : 'Join Discord Server'}
                        </span>
                      </a>
                    ) : (
                      <p className="text-gray-300 text-sm">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-gray-900 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={
                    language === 'id'
                      ? 'Tulis pesan kamu...'
                      : 'Type your message...'
                  }
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-xl transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}