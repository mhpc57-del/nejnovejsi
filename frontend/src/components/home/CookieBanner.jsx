import React from 'react';
import { motion } from 'framer-motion';

export const CookieBanner = ({ onAccept }) => (
  <motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ duration: 0.3 }}
    className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 dark:bg-zinc-950/95 backdrop-blur-xl text-white py-4 px-6 md:px-12 z-50 border-t border-zinc-800">
    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-sm text-zinc-400 text-center sm:text-left">
        Tento web používá cookies nezbytné pro fungování služby.
        <a href="#" className="text-orange-400 hover:text-orange-300 ml-1">Více informací</a>
      </p>
      <div className="flex gap-3">
        <button onClick={onAccept} className="px-4 py-2 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors" data-testid="cookies-necessary-btn">
          Pouze nezbytné
        </button>
        <button onClick={onAccept} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium text-white transition-colors" data-testid="cookies-accept-btn">
          Přijmout vše
        </button>
      </div>
    </div>
  </motion.div>
);
