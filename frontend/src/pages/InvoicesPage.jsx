import React, { useState, useEffect } from 'react';
import { useAuth, API } from '../App';
import axios from 'axios';
import { FileText, Download, ArrowLeft } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

const InvoicesPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await axios.get(`${API}/invoices/my`, { headers: { Authorization: `Bearer ${token}` } });
        setInvoices(res.data);
      } catch (error) {
        console.error('Error fetching invoices:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [token]);

  const handleDownload = async (invoiceId, format) => {
    try {
      const res = await axios.get(`${API}/invoices/${invoiceId}/${format}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const invoice = invoices.find(i => i.id === invoiceId);
      link.download = format === 'pdf' ? `${invoice?.invoice_number}.pdf` : `${invoice?.invoice_number}.isdoc.xml`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Nepodařilo se stáhnout fakturu');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" data-testid="back-btn">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Moje faktury</h1>
            <p className="text-sm text-gray-500">Přehled všech faktur za předplatné CraftBolt</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Zatím nemáte žádné faktury</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Číslo</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Datum</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Popis</th>
                  <th className="text-right p-4 text-xs font-medium text-gray-500 uppercase">Částka</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Stav</th>
                  <th className="text-right p-4 text-xs font-medium text-gray-500 uppercase">Stáhnout</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50" data-testid={`invoice-row-${inv.id}`}>
                    <td className="p-4 text-sm font-medium text-gray-900">{inv.invoice_number}</td>
                    <td className="p-4 text-sm text-gray-500">{new Date(inv.issue_date).toLocaleDateString('cs-CZ')}</td>
                    <td className="p-4 text-sm text-gray-600">{inv.items?.[0]?.description || inv.plan_name}</td>
                    <td className="p-4 text-sm font-semibold text-gray-900 text-right">{inv.total?.toLocaleString('cs-CZ')} Kč</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${inv.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {inv.payment_status === 'paid' ? 'Uhrazeno' : 'Čeká'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => handleDownload(inv.id, 'pdf')}
                          className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors" data-testid={`download-pdf-${inv.id}`}>
                          PDF
                        </button>
                        <button onClick={() => handleDownload(inv.id, 'xml')}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors" data-testid={`download-xml-${inv.id}`}>
                          XML
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicesPage;
