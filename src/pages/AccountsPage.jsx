import { useSearchParams } from 'react-router-dom';
import PaymentsPage from './PaymentsPage';
import SettlementsPage from './SettlementsPage';
import ExpensesPage from './ExpensesPage';
import BillingAdjustmentsPage from './BillingAdjustmentsPage';
import ReportsPage from './ReportsPage';
import { Button } from '../components/ui/button';

const TABS = [
  { key: 'payments',    label: 'Payments',    Component: PaymentsPage },
  { key: 'settlements', label: 'Settlements', Component: SettlementsPage },
  { key: 'expenses',    label: 'Expenses',    Component: ExpensesPage },
  { key: 'billing',     label: 'Billing Adjustments', Component: BillingAdjustmentsPage },
  { key: 'reports',     label: 'Reports',     Component: ReportsPage },
];

const DEFAULT_TAB = 'settlements';

export default function AccountsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');
  const tab = TABS.some((t) => t.key === requested) ? requested : DEFAULT_TAB;
  const Active = TABS.find((t) => t.key === tab).Component;

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Accounts</h1>

      <div className="flex gap-1 mb-5">
        {TABS.map((t) => (
          <Button
            key={t.key}
            type="button"
            variant={tab === t.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchParams({ tab: t.key })}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <Active />
    </div>
  );
}
