import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  fetchTests, updateTest, fetchSampleTypes, saveSampleTypes, fetchIncludedTests, saveIncludedTests,
} from '../store/testCatalogSlice';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '../components/ui/sheet';

const CATEGORIES = [
  { value: 'test',    label: 'Test' },
  { value: 'profile', label: 'Profile' },
  { value: 'package', label: 'Package' },
  { value: 'outlab',  label: 'Outlab' },
];

const CATEGORY_STYLES = {
  test:    'bg-blue-100 text-blue-700',
  profile: 'bg-purple-100 text-purple-700',
  package: 'bg-amber-100 text-amber-700',
  outlab:  'bg-teal-100 text-teal-700',
};

function categoryLabel(value) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

const EMPTY_FORM = { name: '', testCode: '', category: 'test', mrp: '', b2bRate: '' };

const EMPTY_DETAILS_FORM = {
  slug: '', shortDescription: '', description: '',
  fastingRequired: false, reportTatHours: '', published: false,
  aliases: '', portalCode: '', portalType: '', noOfTestsIncluded: '',
  isHomeCollectible: false, isMultiSampleType: false,
  suitableMale: true, suitableFemale: true,
  sampleReportUrl: '', handbillUrl: '',
};

const EMPTY_SAMPLE_TYPE = { sampleType: '', processingTimeHours: '', lab: '' };
const EMPTY_INCLUDED_TEST = { code: '', name: '', groupName: '' };

export default function TestCatalogPage() {
  const dispatch = useAppDispatch();
  const { data: tests, loading } = useAppSelector((s) => s.testCatalog);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [publishTest, setPublishTest] = useState(null);
  const [detailsForm, setDetailsForm] = useState(EMPTY_DETAILS_FORM);
  const [sampleTypes, setSampleTypes] = useState([]);
  const [includedTests, setIncludedTests] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsSaving, setDetailsSaving] = useState(false);

  useEffect(() => { dispatch(fetchTests()); }, [dispatch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tests.filter((t) => {
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.test_code?.toLowerCase().includes(q);
    });
  }, [tests, search, categoryFilter]);

  function startEdit(test) {
    setEditingId(test.id);
    setEditForm({
      name: test.name,
      testCode: test.test_code ?? '',
      category: test.category,
      mrp: test.mrp ?? '',
      b2bRate: test.b2b_rate ?? '',
    });
  }

  async function saveEdit(id) {
    await dispatch(updateTest({
      id,
      name: editForm.name.trim(),
      testCode: editForm.testCode.trim() || null,
      category: editForm.category,
      mrp: editForm.mrp ? parseFloat(editForm.mrp) : null,
      b2bRate: editForm.b2bRate ? parseFloat(editForm.b2bRate) : null,
    }));
    setEditingId(null);
  }

  function toggleActive(test) {
    dispatch(updateTest({ id: test.id, active: !test.active }));
  }

  async function openPublishDetails(test) {
    setPublishTest(test);
    const suitableGender = test.suitable_gender ?? null;
    setDetailsForm({
      slug: test.slug ?? '',
      shortDescription: test.short_description ?? '',
      description: test.description ?? '',
      fastingRequired: !!test.fasting_required,
      reportTatHours: test.report_tat_hours ?? '',
      published: !!test.published,
      aliases: (test.aliases ?? []).join(', '),
      portalCode: test.portal_code ?? '',
      portalType: test.portal_type ?? '',
      noOfTestsIncluded: test.no_of_tests_included ?? '',
      isHomeCollectible: !!test.is_home_collectible,
      isMultiSampleType: !!test.is_multi_sample_type,
      // No portal data yet (suitableGender null) defaults to "both" rather
      // than unchecking everyone out of a row that's never been scraped.
      suitableMale: suitableGender ? suitableGender.includes('MALE') : true,
      suitableFemale: suitableGender ? suitableGender.includes('FEMALE') : true,
      sampleReportUrl: test.sample_report_url ?? '',
      handbillUrl: test.handbill_url ?? '',
    });
    setSampleTypes([]);
    setIncludedTests([]);
    setDetailsLoading(true);
    try {
      const [sampleTypeRows, includedTestRows] = await Promise.all([
        dispatch(fetchSampleTypes(test.id)).unwrap(),
        dispatch(fetchIncludedTests(test.id)).unwrap(),
      ]);
      setSampleTypes(sampleTypeRows.map((s) => ({
        sampleType: s.sample_type,
        processingTimeHours: s.processing_time_hours ?? '',
        lab: s.lab ?? '',
      })));
      setIncludedTests(includedTestRows.map((t) => ({
        code: t.code ?? '',
        name: t.name,
        groupName: t.group_name ?? '',
      })));
    } finally {
      setDetailsLoading(false);
    }
  }

  function closePublishDetails() {
    setPublishTest(null);
  }

  function updateSampleTypeRow(index, field, value) {
    setSampleTypes((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addSampleTypeRow() {
    setSampleTypes((rows) => [...rows, EMPTY_SAMPLE_TYPE]);
  }

  function removeSampleTypeRow(index) {
    setSampleTypes((rows) => rows.filter((_, i) => i !== index));
  }

  function updateIncludedTestRow(index, field, value) {
    setIncludedTests((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addIncludedTestRow() {
    setIncludedTests((rows) => [...rows, EMPTY_INCLUDED_TEST]);
  }

  function removeIncludedTestRow(index) {
    setIncludedTests((rows) => rows.filter((_, i) => i !== index));
  }

  async function savePublishDetails() {
    if (!publishTest) return;
    setDetailsSaving(true);
    try {
      const suitableGender = [
        ...(detailsForm.suitableMale ? ['MALE'] : []),
        ...(detailsForm.suitableFemale ? ['FEMALE'] : []),
      ];
      const aliases = detailsForm.aliases
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      await dispatch(updateTest({
        id: publishTest.id,
        slug: detailsForm.slug.trim() || null,
        shortDescription: detailsForm.shortDescription.trim() || null,
        description: detailsForm.description.trim() || null,
        fastingRequired: detailsForm.fastingRequired,
        reportTatHours: detailsForm.reportTatHours ? parseFloat(detailsForm.reportTatHours) : null,
        published: detailsForm.published,
        aliases: aliases.length > 0 ? aliases : null,
        portalCode: detailsForm.portalCode.trim() || null,
        portalType: detailsForm.portalType.trim() || null,
        noOfTestsIncluded: detailsForm.noOfTestsIncluded ? parseInt(detailsForm.noOfTestsIncluded, 10) : null,
        isHomeCollectible: detailsForm.isHomeCollectible,
        isMultiSampleType: detailsForm.isMultiSampleType,
        suitableGender: suitableGender.length > 0 ? suitableGender : null,
        sampleReportUrl: detailsForm.sampleReportUrl.trim() || null,
        handbillUrl: detailsForm.handbillUrl.trim() || null,
      })).unwrap();

      await dispatch(saveSampleTypes({
        id: publishTest.id,
        sampleTypes: sampleTypes
          .filter((s) => s.sampleType.trim())
          .map((s) => ({
            sampleType: s.sampleType.trim(),
            processingTimeHours: s.processingTimeHours ? parseFloat(s.processingTimeHours) : null,
            lab: s.lab.trim() || null,
          })),
      })).unwrap();

      await dispatch(saveIncludedTests({
        id: publishTest.id,
        includedTests: includedTests
          .filter((t) => t.name.trim())
          .map((t) => ({
            code: t.code.trim() || null,
            name: t.name.trim(),
            groupName: t.groupName.trim() || null,
          })),
      })).unwrap();

      closePublishDetails();
    } finally {
      setDetailsSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Test Catalog</h1>
        <Link to="/test-catalog/cost-overrides" className="text-sm text-blue-600 hover:underline">Special / Weekend Rates</Link>
      </div>
      <p className="text-sm text-gray-500 mb-5 max-w-2xl">
        MRP and B2B rate are reference prices only — the price actually billed for an order is agreed on the call and entered per order.
        Tests are seeded from the price-list spreadsheet; edit or deactivate them here. When the processing lab runs a temporary promo on
        specific days, use "Special / Weekend Rates" instead of editing the B2B rate directly.
      </p>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or code…"
          className="border rounded px-3 py-1.5 text-sm w-64"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <span className="text-xs text-gray-400">{filtered.length} of {tests.length}</span>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">No tests match.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto max-h-[65vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">MRP</th>
                <th className="px-4 py-2 font-medium">B2B Rate</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className={`border-b last:border-0 ${!t.active ? 'opacity-50' : ''}`}>
                  {editingId === t.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          value={editForm.testCode}
                          onChange={(e) => setEditForm((f) => ({ ...f, testCode: e.target.value }))}
                          className="w-24 border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                          className="border rounded px-2 py-1"
                        >
                          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number" min="0" step="0.01"
                          value={editForm.mrp}
                          onChange={(e) => setEditForm((f) => ({ ...f, mrp: e.target.value }))}
                          className="w-24 border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number" min="0" step="0.01"
                          value={editForm.b2bRate}
                          onChange={(e) => setEditForm((f) => ({ ...f, b2bRate: e.target.value }))}
                          className="w-24 border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2 text-gray-400">{t.active ? 'Active' : 'Inactive'}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <Button variant="link" size="xs" onClick={() => saveEdit(t.id)} className="text-green-600 mr-1">Save</Button>
                        <Button variant="link" size="xs" onClick={() => setEditingId(null)} className="text-gray-400">Cancel</Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{t.test_code ?? '—'}</td>
                      <td className="px-4 py-2 font-medium">{t.name}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${CATEGORY_STYLES[t.category] ?? 'bg-gray-100 text-gray-600'}`}>
                          {categoryLabel(t.category)}
                        </span>
                      </td>
                      <td className="px-4 py-2">{t.mrp != null ? `₹${t.mrp}` : '—'}</td>
                      <td className="px-4 py-2">{t.b2b_rate != null ? `₹${t.b2b_rate}` : '—'}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${t.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {t.active ? 'Active' : 'Inactive'}
                        </span>
                        {t.published && (
                          <span className="ml-1 text-xs px-2 py-0.5 rounded font-medium bg-blue-100 text-blue-700">
                            Published
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <Button variant="link" size="xs" onClick={() => startEdit(t)} className="text-gray-500 mr-1">Edit</Button>
                        <Button variant="link" size="xs" onClick={() => openPublishDetails(t)} className="text-blue-600 mr-1">
                          {t.published ? 'Edit details' : 'Publish details'}
                        </Button>
                        <Button variant="link" size="xs" onClick={() => toggleActive(t)} className="text-gray-500">
                          {t.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!publishTest} onOpenChange={(open) => { if (!open) closePublishDetails(); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Publish details — {publishTest?.name}</SheetTitle>
            <SheetDescription>
              These fields control what appears on the public customer-portal test detail page.
              A test only shows up there once "Published" is checked.
            </SheetDescription>
          </SheetHeader>

          {detailsLoading ? (
            <p className="text-sm text-gray-500 px-4">Loading…</p>
          ) : (
            <div className="flex flex-col gap-4 px-4">
              <label className="flex flex-col gap-1 text-sm">
                Slug
                <Input
                  value={detailsForm.slug}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="auto-generated from name if left blank"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Short description
                <Input
                  value={detailsForm.shortDescription}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, shortDescription: e.target.value }))}
                  maxLength={500}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Description
                <textarea
                  value={detailsForm.description}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="border rounded-lg px-2.5 py-1.5 text-sm"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Aliases (comma-separated, from portal search terms)
                <Input
                  value={detailsForm.aliases}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, aliases: e.target.value }))}
                  placeholder="AAROGYAM D, D PLUS, PREVENTIVE HEALTH CHECKUP…"
                />
              </label>

              <div className="flex gap-2">
                <label className="flex flex-col gap-1 text-sm flex-1">
                  Portal code
                  <Input
                    value={detailsForm.portalCode}
                    onChange={(e) => setDetailsForm((f) => ({ ...f, portalCode: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm flex-1">
                  Portal type
                  <Input
                    value={detailsForm.portalType}
                    onChange={(e) => setDetailsForm((f) => ({ ...f, portalType: e.target.value }))}
                    placeholder="PRIMARY / SECONDARY"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-sm">
                No. of tests included
                <Input
                  type="number" min="0"
                  value={detailsForm.noOfTestsIncluded}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, noOfTestsIncluded: e.target.value }))}
                  className="w-32"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Report TAT (hours)
                <Input
                  type="number" min="0" step="0.1"
                  value={detailsForm.reportTatHours}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, reportTatHours: e.target.value }))}
                  className="w-32"
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={detailsForm.fastingRequired}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, fastingRequired: e.target.checked }))}
                />
                Fasting required
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={detailsForm.isHomeCollectible}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, isHomeCollectible: e.target.checked }))}
                />
                Home collectible
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={detailsForm.isMultiSampleType}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, isMultiSampleType: e.target.checked }))}
                />
                Multiple sample types
              </label>

              <div className="flex flex-col gap-1 text-sm">
                Suitable for
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={detailsForm.suitableMale}
                      onChange={(e) => setDetailsForm((f) => ({ ...f, suitableMale: e.target.checked }))}
                    />
                    Male
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={detailsForm.suitableFemale}
                      onChange={(e) => setDetailsForm((f) => ({ ...f, suitableFemale: e.target.checked }))}
                    />
                    Female
                  </label>
                </div>
              </div>

              <label className="flex flex-col gap-1 text-sm">
                Sample report URL
                <Input
                  value={detailsForm.sampleReportUrl}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, sampleReportUrl: e.target.value }))}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Handbill URL
                <Input
                  value={detailsForm.handbillUrl}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, handbillUrl: e.target.value }))}
                />
              </label>

              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={detailsForm.published}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, published: e.target.checked }))}
                />
                Published (visible on customer-portal)
              </label>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Sample types</span>
                  <Button variant="link" size="xs" onClick={addSampleTypeRow}>+ Add sample type</Button>
                </div>
                {sampleTypes.length === 0 ? (
                  <p className="text-xs text-gray-400">No sample types added.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {sampleTypes.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          placeholder="Sample type (e.g. Blood)"
                          value={s.sampleType}
                          onChange={(e) => updateSampleTypeRow(i, 'sampleType', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="number" min="0" step="0.1"
                          placeholder="TAT hrs"
                          value={s.processingTimeHours}
                          onChange={(e) => updateSampleTypeRow(i, 'processingTimeHours', e.target.value)}
                          className="w-24"
                        />
                        <Input
                          placeholder="Lab"
                          value={s.lab}
                          onChange={(e) => updateSampleTypeRow(i, 'lab', e.target.value)}
                          className="w-28"
                        />
                        <Button variant="link" size="xs" onClick={() => removeSampleTypeRow(i)} className="text-red-500">✕</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Included tests ({includedTests.length})</span>
                  <Button variant="link" size="xs" onClick={addIncludedTestRow}>+ Add test</Button>
                </div>
                {includedTests.length === 0 ? (
                  <p className="text-xs text-gray-400">No included tests added — plain tests can leave this empty.</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                    {includedTests.map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          placeholder="Name (e.g. CHLORIDE)"
                          value={t.name}
                          onChange={(e) => updateIncludedTestRow(i, 'name', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Code"
                          value={t.code}
                          onChange={(e) => updateIncludedTestRow(i, 'code', e.target.value)}
                          className="w-20"
                        />
                        <Input
                          placeholder="Group"
                          value={t.groupName}
                          onChange={(e) => updateIncludedTestRow(i, 'groupName', e.target.value)}
                          className="w-28"
                        />
                        <Button variant="link" size="xs" onClick={() => removeIncludedTestRow(i)} className="text-red-500">✕</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <SheetFooter>
            <Button onClick={savePublishDetails} disabled={detailsLoading || detailsSaving}>
              {detailsSaving ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="ghost" onClick={closePublishDetails}>Cancel</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
