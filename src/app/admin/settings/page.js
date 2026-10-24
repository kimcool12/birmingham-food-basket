import prisma from '../../../lib/prisma';
import { requireAdmin } from '../../../lib/permissions';
import { SETTING_DEFAULTS, getSettings } from '../../../lib/settings';
import SettingsForm from './SettingsForm';
import styles from './settings.module.scss';

export const metadata = { title: 'Settings | Admin' };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const current = await getSettings(prisma);

  // Boxes that hold the standard wording are shown empty, so it is clear they use the default.
  const defaults = {
    hero_heading: current.hero_heading === SETTING_DEFAULTS.hero_heading ? '' : current.hero_heading,
    hero_text: current.hero_text === SETTING_DEFAULTS.hero_text ? '' : current.hero_text,
    delivery_info: current.delivery_info,
    contact_whatsapp: current.contact_whatsapp,
  };

  return (
    <main className={styles.page}>
      <h1>Settings</h1>
      <p className={styles.intro}>
        Change the words on your home page without touching any code. Changes appear straight away
        and are recorded in the audit log.
      </p>
      <section className={styles.card} aria-labelledby="site">
        <h2 id="site">Home page</h2>
        <SettingsForm defaults={defaults} standard={SETTING_DEFAULTS} />
      </section>
    </main>
  );
}
