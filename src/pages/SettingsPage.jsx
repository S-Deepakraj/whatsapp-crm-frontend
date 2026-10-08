import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchSettings, saveSettings } from '../store/settingsSlice';
import { Button } from '../components/ui/button';
import WhatsAppConnectCard from '../components/WhatsAppConnectCard';

const TEMPLATE_FIELDS = [
  { key: 'followupTemplate', label: 'Follow-Up Template', hint: 'Sent for general check-ins and reminders.' },
  { key: 'thankyouTemplate', label: 'Thank You Template', hint: 'Sent after a visit to thank the customer.' },
];

// reviewTemplate is no longer edited here (review messages come from the
// fixed, policy-checked campaign templates) but is still round-tripped
// so saving doesn't blank it.
const EMPTY_FORM = { googleReviewUrl: '', followupTemplate: '', reviewTemplate: '', thankyouTemplate: '', reviewAutomationEnabled: true, reviewContactName: '' };

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
        reviewAutomationEnabled: data.reviewAutomationEnabled ?? true,
        reviewContactName: data.reviewContactName ?? '',
      });
    }
  }, [data]);

  function handleChange(e) {
    const { name, type, checked, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
          <p className="text-xs text-gray-400 mt-1">
            Customers reach it through a tracked link in the review request and reminder messages.
          </p>
        </div>

        <div className="border rounded-lg p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Google review requests</p>
            <p className="text-xs text-gray-400">
              Starts when a report is marked delivered. Every eligible customer gets the same messages — sent by you from Reviews → Due now.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="reviewAutomationEnabled"
              checked={form.reviewAutomationEnabled}
              onChange={handleChange}
            />
            Review automation enabled
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact person name</label>
            <input
              name="reviewContactName"
              value={form.reviewContactName}
              onChange={handleChange}
              maxLength={100}
              placeholder="e.g. Deepak"
              className="w-full border rounded px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Used in the check-in: "Hi Ravi, this is <strong>{form.reviewContactName || 'your login name'}</strong> from {data?.businessName || 'your business'}." Left empty, the logged-in user's name is used.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
            <dt>Business name in messages</dt><dd className="text-gray-700">{data?.businessName || '—'}</dd>
            <dt>Check-in</dt><dd className="text-gray-700">2–4 hours after report delivered</dd>
            <dt>Review request</dt><dd className="text-gray-700">12–24 hours after check-in</dd>
            <dt>Reminder</dt><dd className="text-gray-700">3 days later, only if link not clicked</dd>
            <dt>Maximum reminders</dt><dd className="text-gray-700">1</dd>
            <dt>Quiet hours</dt><dd className="text-gray-700">8 PM – 9 AM (moved to 10 AM)</dd>
          </dl>
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
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </Button>
          {saved && <span className="text-sm text-green-600">Saved ✓</span>}
        </div>
      </form>

      <WhatsAppConnectCard />
    </div>
  );
}
