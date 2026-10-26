import { useState } from 'react';
import { useAppDispatch } from '../hooks/redux';
import { createOutsourcePayment } from '../store/outsourceSlice';
import { Button } from './ui/button';

const METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'upi',           label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'other',         label: 'Other' },
];

function today() {
  return new Date().toISOString().split('T')[0];
}

// A payment the business made TO an outsource lab — the opposite of
// AddPaymentModal, which records a patient paying the business.
export default function OutsourcePaymentModal({ lab, onClose, onSaved }) {
  const dispatch = useAppDispatch();
  const [amount, setAmount] = useState(lab.balance > 0 ? String(lab.balance) : '');
  const [paidAt, setPaidAt] = useState(today());
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return setError('Enter a valid amount');
    setSaving(true);
    setError(null);
    const result = await dispatch(createOutsourcePayment({
      labId: lab.outsourceLabId,
      amount: Number(amount),
      paidAt,
      method,
      reference: reference.trim() || null,
      notes: notes.trim() || null,
    }));
    setSaving(false);
    if (createOutsourcePayment.fulfilled.match(result)) {
      onSaved?.();
      onClose();
    } else {
      setError(result.error?.message || 'Failed to record payment.');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-1">Record Payment to Lab</h2>
        <p className="text-sm text-gray-500 mb-4">
          {lab.outsourceLabName} · Balance ₹{lab.balance.toLocaleString('en-IN')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
            <input
              type="number" min="0.01" step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              max={today()}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Reference <span className="text-gray-400 font-normal">(UTR / cheque no., optional)</span></label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Payment'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
