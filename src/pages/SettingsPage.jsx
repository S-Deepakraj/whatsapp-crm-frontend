import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchSettings, saveSettings } from '../store/settingsSlice';

const TEMPLATE_FIELDS = [
  { key: 'followupTemplate', label: 'Follow-Up Template', hint: 'Sent for general check-ins and reminders.' },
  { key: 'reviewTemplate',   label: 'Review Request Template', hint: 'Your Google Review URL is appended automatically — no need to include it here.' },
  { key: 'thankyouTemplate', label: 'Thank You Template', hint: 'Sent after a visit to thank the customer.' },
];

const EMPTY_FORM = { googleReviewUrl: '', followupTemplate: '', reviewTemplate: '', thankyouTemplate: '' };

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const { data, loading, saving } = useAppSelector((s) => s.settings);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saved, setSaved] = useState(false);

  useEffect(() => { dispatch(fetchSettings()); }, [dispatch]);

  useEffect(() => {
    if (data) {
      setForm({
        googleReviewUrl:  data.googleReviewUrl ?? '',
        followupTemplate: data.followupTemplate ?? '',
        reviewTemplate:   data.reviewTemplate ?? '',
        thankyouTemplate: data.thankyouTemplate ?? '',
      });
    }
  }, [data]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSaved(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const result = await dispatch(saveSettings(form));
    if (saveSettings.fulfilled.match(result)) setSaved(true);
  }

  if (loading && !data) {
    return (
      <div className="p-4 md:p-6 max-w-2xl animate-pulse space-y-3">
        <div className="h-6 bg-gray-100 rounded w-40" />
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-6">
        Customize the WhatsApp messages your team sends. Use{' '}
        <code className="bg-gray-100 px-1 rounded text-xs">{'{{name}}'}</code> and{' '}
        <code className="bg-gray-100 px-1 rounded text-xs">{'{{businessName}}'}</code> as placeholders — they're filled in automatically.
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 md:p-5 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Google Review URL</label>
          <input
            name="googleReviewUrl"
            type="url"
            value={form.googleReviewUrl}
            onChange={handleChange}
            placeholder="https://g.page/r/your-business/review"
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">Appended automatically to the review request message.</p>
        </div>

        {TEMPLATE_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
            <textarea
              name={f.key}
              rows={3}
              value={form[f.key]}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">{f.hint}</p>
          </div>
        ))}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          {saved && <span className="text-sm text-green-600">Saved ✓</span>}
        </div>
      </form>
    </div>
  );
}
