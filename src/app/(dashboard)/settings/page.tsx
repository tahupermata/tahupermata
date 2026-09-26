import { getCompanySettingsAction } from '@/app/actions/company-actions';
import { CompanySettingsView } from '@/components/settings/company-settings-view';
import { requireAuthAny } from '@/lib/auth';

export default async function SettingsPage() {
  await requireAuthAny(['rbac:manage', 'settings:manage']);
  const settings = await getCompanySettingsAction();

  return <CompanySettingsView initialSettings={settings as any} />;
}
