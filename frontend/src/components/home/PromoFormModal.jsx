import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, X } from '@phosphor-icons/react';
import { API } from '../../App';

export const PromoFormModal = ({ promoForm, setPromoForm, promoLoading, promoUploadingLogo, onSubmit, onClose, onLogoUpload }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={() => !promoLoading && onClose()}>
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}
      className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800" onClick={e => e.stopPropagation()} data-testid="promo-form-modal">
      <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-zinc-900 dark:text-white" style={{ fontFamily: 'Outfit' }}>Reklamní banner</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Vyberte délku zobrazení</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setPromoForm(p => ({...p, duration: 'day'}))}
            className={`p-3 rounded-lg border-2 text-center transition-all ${promoForm.duration === 'day' ? 'border-orange-500 bg-orange-500/5' : 'border-zinc-200 dark:border-zinc-700'}`}
            data-testid="promo-duration-day">
            <span className="block text-lg font-bold text-orange-500">39 Kč</span>
            <span className="text-xs text-zinc-500">1 den</span>
          </button>
          <button onClick={() => setPromoForm(p => ({...p, duration: 'month'}))}
            className={`p-3 rounded-lg border-2 text-center transition-all ${promoForm.duration === 'month' ? 'border-orange-500 bg-orange-500/5' : 'border-zinc-200 dark:border-zinc-700'}`}
            data-testid="promo-duration-month">
            <span className="block text-lg font-bold text-orange-500">990 Kč</span>
            <span className="text-xs text-zinc-500">1 měsíc</span>
          </button>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Název firmy *</label>
          <input type="text" value={promoForm.company_name} onChange={e => setPromoForm(p => ({...p, company_name: e.target.value}))}
            className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white dark:bg-zinc-900 text-sm" placeholder="Název vaší firmy" data-testid="promo-company-name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Stručný popis *</label>
          <textarea value={promoForm.bio} onChange={e => setPromoForm(p => ({...p, bio: e.target.value}))} rows={2}
            className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white dark:bg-zinc-900 text-sm resize-none" placeholder="Co nabízíte..." data-testid="promo-bio" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Telefon *</label>
            <input type="tel" value={promoForm.phone} onChange={e => setPromoForm(p => ({...p, phone: e.target.value}))}
              className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white dark:bg-zinc-900 text-sm" placeholder="+420..." data-testid="promo-phone" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Web</label>
            <input type="text" value={promoForm.website} onChange={e => setPromoForm(p => ({...p, website: e.target.value}))}
              className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white dark:bg-zinc-900 text-sm" placeholder="www.firma.cz" data-testid="promo-website" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Logo</label>
          <div className="flex items-center gap-3">
            {promoForm.logo_url ? (
              <img src={promoForm.logo_url.startsWith('http') ? promoForm.logo_url : `${API.replace('/api', '')}${promoForm.logo_url.startsWith('/api') ? promoForm.logo_url : '/api' + (promoForm.logo_url.startsWith('/') ? '' : '/') + promoForm.logo_url}`} alt="Logo" className="w-14 h-14 rounded-lg object-cover border border-zinc-200" />
            ) : (
              <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-zinc-400" />
              </div>
            )}
            <label className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
              {promoUploadingLogo ? 'Nahrávám...' : 'Nahrát logo'}
              <input type="file" accept="image/*" onChange={onLogoUpload} className="hidden" disabled={promoUploadingLogo} />
            </label>
          </div>
        </div>
        <button onClick={onSubmit} disabled={promoLoading || !promoForm.company_name || !promoForm.bio || !promoForm.phone}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2" data-testid="promo-submit-btn">
          {promoLoading ? 'Přesměrování na platbu...' : `Pokračovat k platbě — ${promoForm.duration === 'month' ? '990' : '39'} Kč`}
        </button>
        <p className="text-[11px] text-zinc-400 text-center">Všechny ceny jsou uvedeny včetně 21% DPH.</p>
      </div>
    </motion.div>
  </div>
);
