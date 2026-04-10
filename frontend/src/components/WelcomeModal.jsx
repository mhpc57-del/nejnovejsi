import { useState } from 'react';
import { X, Handshake } from '@phosphor-icons/react';

const WelcomeModal = ({ user, token, API }) => {
  const [visible, setVisible] = useState(true);

  if (!visible || !user || user.welcome_seen) return null;

  const handleConfirm = async () => {
    try {
      await fetch(`${API}/users/welcome-seen`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.error('Welcome seen error:', e);
    }
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" data-testid="welcome-modal-overlay">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" data-testid="welcome-modal">
        {/* Orange top bar */}
        <div className="h-1.5 bg-gradient-to-r from-orange-400 to-orange-600" />
        
        <div className="p-7 text-center">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <Handshake weight="fill" className="w-8 h-8 text-orange-500" />
          </div>
          
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4" style={{ fontFamily: 'Outfit' }}>
            Vítejte na CraftBolt
          </h2>
          
          <div className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed space-y-3 text-left">
            <p>
              Vítejte na nové a bezkonkurenční platformě <strong className="text-orange-500">CraftBolt</strong>.
            </p>
            <p>
              Vypadá to, že jste jedni mezi prvními zaregistrovanými uživateli.
            </p>
            <p>
              Pro případné vyhledání zákazníka, řemeslníka nebo služby prosíme o vyčkání několika hodin do dalších registrací nově příchozích uživatelů. Děkujeme za strpení.
            </p>
          </div>
          
          <button
            onClick={handleConfirm}
            className="mt-6 w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors text-sm"
            data-testid="welcome-modal-confirm"
          >
            Rozumím, pokračovat
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
