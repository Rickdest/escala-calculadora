import { MessageCircle } from 'lucide-react';

const WHATSAPP_URL = 'https://wa.me/5511930291287?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20Precify';

export function WhatsAppFab() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-20 right-4 z-40 md:hidden w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg shadow-green-500/30 transition-all duration-200 active:scale-95"
      aria-label="Suporte via WhatsApp"
    >
      <MessageCircle className="w-6 h-6" />
    </a>
  );
}
