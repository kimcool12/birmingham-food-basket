import prisma from '../../../lib/prisma';
import { requireUser } from '../../../lib/permissions';
import { formatDate } from '../../../lib/order-status';
import ProfileForm from './ProfileForm';
import styles from './profile.module.scss';

export const metadata = {
  title: 'My Profile | Birmingham Food Basket',
  robots: { index: false },
};

export default async function ProfilePage() {
  const user = await requireUser();

  const [account, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, username: true, whatsapp: true, createdAt: true },
    }),
    prisma.customerProfile.findUnique({ where: { userId: user.id } }),
  ]);

  const defaults = {
    fullName: profile?.fullName ?? '',
    phone: profile?.phone ?? '',
    whatsapp: account?.whatsapp ?? '',
    address: profile?.address ?? '',
    postcode: profile?.postcode ?? '',
  };

  return (
    <div className={styles.page}>
      <h1>My Profile</h1>

      <section className={styles.card} aria-labelledby="account">
        <h2 id="account">Account</h2>
        <dl className={styles.facts}>
          <div>
            <dt>Username</dt>
            <dd>@{account.username}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{account.email}</dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>{formatDate(account.createdAt)}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.card} aria-labelledby="details">
        <h2 id="details">Saved delivery information</h2>
        <p className={styles.hint}>
          These details are filled in for you at checkout. You can still change them for any order.
        </p>
        <ProfileForm defaults={defaults} />
      </section>
    </div>
  );
}
