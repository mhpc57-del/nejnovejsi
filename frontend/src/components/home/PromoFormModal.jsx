import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, X, Clock } from '@phosphor-icons/react';
import { API } from '../../App';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import axios from 'axios';

const LogoCropper = ({ onCropped, onCancel }) => {
  const [src, setSrc] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 80, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const onSelectFile = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => setSrc(reader.result);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const getCroppedBlob = useCallback(() => {
    return new Promise((resolve) => {
      if (!imgRef.current || !completedCrop) { resolve(null); return; }
      const canvas = document.createElement('canvas');
      const img = imgRef.current;
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;
      const size = 200;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img,
        completedCrop.x * scaleX, completedCrop.y * scaleY,
        completedCrop.width * scaleX, completedCrop.height * scaleY,
        0, 0, size, size
      );
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    });
  }, [completedCrop]);

  const handleUpload = async () => {
    setUploading(true);
    try {
      const blob = await getCroppedBlob();
      if (!blob) return;
      const fd = new FormData();
      fd.append('file', new File([blob], 'logo.jpg', { type: 'image/jpeg' }));
      const res = await axios.post(`${API}/upload/public`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onCropped(res.data.url);
    } catch (e) {
      console.error(e);
    }
    setUploading(false);
  };

  if (!src) {
    return (
      <div>
        <label className="block w-full text-center py-3 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl cursor-pointer hover:border-orange-400 transition-colors">
          <span className="text-sm text-zinc-500">Vyberte logo (bude ořezáno na čtverec)</span>
          <input type="file" accept="image/*" onChange={onSelectFile} className="hidden" />
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">Vyberte výřez loga (čtverec 200×200px):</p>
      <div className="max-h-48 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
        <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={1} circularCrop={false}>
          <img ref={imgRef} src={src} alt="Crop" style={{ maxHeight: 192 }} />
        </ReactCrop>
      </div>
      <div className="flex gap-2">
        <button onClick={handleUpload} disabled={uploading || !completedCrop}
          className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
          {uploading ? 'Nahrávám...' : 'Použít výřez'}
        </button>
        <button onClick={() => { setSrc(null); onCancel(); }}
          className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
          Zrušit
        </button>
      </div>
    </div>
  );
};

const PromoPreviewCard = ({ form }) => {
  const logoUrl = form.logo_url
    ? (form.logo_url.startsWith('http') ? form.logo_url : `${API.replace('/api', '')}${form.logo_url.startsWith('/api') ? form.logo_url : '/api' + (form.logo_url.startsWith('/') ? '' : '/') + form.logo_url}`)
    : null;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-5">
      <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mb-3">Náhled banneru</p>
      <div className="flex items-center gap-3 mb-2">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700" />
        ) : (
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/15 rounded-lg flex items-center justify-center">
            <Briefcase weight="duotone" className="w-6 h-6 text-orange-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-zinc-900 dark:text-white text-sm truncate">{form.company_name || 'Název firmy'}</h4>
          {form.website && <span className="text-xs text-orange-500 truncate block">{form.website}</span>}
        </div>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 mb-1.5">{form.bio || 'Popis vaší firmy...'}</p>
      {form.phone && <p className="text-xs text-zinc-400">{form.phone}</p>}
      <div className="mt-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-medium">Sponzorovaný banner</span>
        <span className="flex items-center gap-1 text-[10px] text-orange-500 font-semibold">
          <Clock weight="bold" className="w-3 h-3" /> {form.duration === 'month' ? '31d' : '24h'}
        </span>
      </div>
    </div>
  );
};

export const PromoFormModal = ({ promoForm, setPromoForm, promoLoading, promoUploadingLogo, onSubmit, onClose, onLogoUpload }) => {
  const [showCropper, setShowCropper] = useState(false);

  const handleCropped = (url) => {
    setPromoForm(p => ({ ...p, logo_url: url }));
    setShowCropper(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={() => !promoLoading && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}
        className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="promo-form-modal">
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
          {/* Duration selector */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setPromoForm(p => ({...p, duration: 'day'}))}
              className={`p-3 rounded-lg border-2 text-center transition-all ${promoForm.duration === 'day' ? 'border-orange-500 bg-orange-500/5' : 'border-zinc-200 dark:border-zinc-700'}`}
              data-testid="promo-duration-day">
              <span className="block text-lg font-bold text-orange-500">39 Kč</span>
              <span className="text-xs text-zinc-500">1 den (24h)</span>
            </button>
            <button onClick={() => setPromoForm(p => ({...p, duration: 'month'}))}
              className={`p-3 rounded-lg border-2 text-center transition-all ${promoForm.duration === 'month' ? 'border-orange-500 bg-orange-500/5' : 'border-zinc-200 dark:border-zinc-700'}`}
              data-testid="promo-duration-month">
              <span className="block text-lg font-bold text-orange-500">990 Kč</span>
              <span className="text-xs text-zinc-500">1 měsíc (31 dní)</span>
            </button>
          </div>

          {/* Form fields */}
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

          {/* Logo with crop */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Logo (bude ořezáno na 200×200px)</label>
            {showCropper ? (
              <LogoCropper onCropped={handleCropped} onCancel={() => setShowCropper(false)} />
            ) : (
              <div className="flex items-center gap-3">
                {promoForm.logo_url ? (
                  <img src={promoForm.logo_url.startsWith('http') ? promoForm.logo_url : `${API.replace('/api', '')}${promoForm.logo_url.startsWith('/api') ? promoForm.logo_url : '/api' + (promoForm.logo_url.startsWith('/') ? '' : '/') + promoForm.logo_url}`} alt="Logo" className="w-14 h-14 rounded-lg object-cover border border-zinc-200" />
                ) : (
                  <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-zinc-400" />
                  </div>
                )}
                <button type="button" onClick={() => setShowCropper(true)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                  {promoForm.logo_url ? 'Změnit logo' : 'Nahrát logo'}
                </button>
              </div>
            )}
          </div>

          {/* Live preview */}
          {promoForm.company_name && (
            <PromoPreviewCard form={promoForm} />
          )}

          <button onClick={onSubmit} disabled={promoLoading || !promoForm.company_name || !promoForm.bio || !promoForm.phone}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2" data-testid="promo-submit-btn">
            {promoLoading ? 'Přesměrování na platbu...' : `Pokračovat k platbě — ${promoForm.duration === 'month' ? '990' : '39'} Kč`}
          </button>
          <p className="text-[11px] text-zinc-400 text-center">Všechny ceny jsou uvedeny včetně 21% DPH.</p>
        </div>
      </motion.div>
    </div>
  );
};
