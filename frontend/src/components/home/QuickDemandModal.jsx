import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X } from '@phosphor-icons/react';

export const QuickDemandModal = ({ quickForm, setQuickForm, quickLoading, quickSuccess, quickError, onSubmit, onClose, onReset }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={() => !quickLoading && onClose()}>
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}
      className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800" onClick={e => e.stopPropagation()} data-testid="quick-demand-modal">
      {quickSuccess ? (
        <div className="p-8 text-center">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-5">
            <Check weight="bold" className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2" style={{ fontFamily: 'Outfit' }}>Poptávka odeslána!</h2>
          <p className="text-sm text-zinc-500 mb-1">Vaše rychlá poptávka byla úspěšně přijata.</p>
          <p className="text-sm text-zinc-500 mb-6">Jakmile dodavatel zareaguje, budeme vás informovat emailem a SMS.</p>
          <div className="flex gap-3">
            <button onClick={onReset}
              className="flex-1 py-3 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm">
              Zavřít
            </button>
            <Link to="/registrace" className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-center text-sm">
              Dokončit registraci
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-white" style={{ fontFamily: 'Outfit' }}>Rychlá poptávka</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Bez registrace — stačí základní údaje</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            {quickError && <div className="p-3 bg-red-500/5 border border-red-200 dark:border-red-900/30 rounded-lg text-red-600 text-sm">{quickError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Jméno *</label>
                <input type="text" value={quickForm.first_name} onChange={e => setQuickForm(p => ({...p, first_name: e.target.value}))}
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white dark:bg-zinc-900 text-sm" placeholder="Jan" data-testid="quick-first-name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Příjmení *</label>
                <input type="text" value={quickForm.last_name} onChange={e => setQuickForm(p => ({...p, last_name: e.target.value}))}
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white dark:bg-zinc-900 text-sm" placeholder="Novák" data-testid="quick-last-name" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Email *</label>
              <input type="email" value={quickForm.email} onChange={e => setQuickForm(p => ({...p, email: e.target.value}))}
                className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white dark:bg-zinc-900 text-sm" placeholder="jan@email.cz" data-testid="quick-email" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Telefon *</label>
              <input type="tel" value={quickForm.phone} onChange={e => setQuickForm(p => ({...p, phone: e.target.value}))}
                className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white dark:bg-zinc-900 text-sm" placeholder="+420" data-testid="quick-phone" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Stručný popis poptávky</label>
              <textarea value={quickForm.description} onChange={e => setQuickForm(p => ({...p, description: e.target.value}))} rows={3}
                className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white dark:bg-zinc-900 text-sm resize-none" placeholder="Popište, co potřebujete..." data-testid="quick-description" />
            </div>
            <button onClick={onSubmit} disabled={quickLoading}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2" data-testid="quick-submit-btn">
              {quickLoading ? 'Odesílám...' : 'Odeslat poptávku'}
            </button>
            <p className="text-[11px] text-zinc-400 text-center">Odesláním souhlasíte se zpracováním osobních údajů.</p>
          </div>
        </>
      )}
    </motion.div>
  </div>
);
