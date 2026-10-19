import prisma from "../../../lib/prisma";
import { requireUser } from "../../../lib/permissions";
import CheckoutForm from "./CheckoutForm";
import styles from "./checkout.module.scss";

export const metadata = {
  title: "Checkout | Birmingham Food Basket",
  robots: { index: false },
};

export default async function CheckoutPage() {
  const user = await requireUser();
  const [account, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { whatsapp: true },
    }),
    prisma.customerProfile.findUnique({ where: { userId: user.id } }),
  ]);

  const defaults = {
    fullName: profile?.fullName ?? "",
    phone: profile?.phone ?? "",
    whatsapp: account?.whatsapp ?? "",
    address: profile?.address ?? "",
    postcode: profile?.postcode ?? "",
  };

  return (
    <main className={styles.page}>
      <h1>Checkout</h1>
      <CheckoutForm defaults={defaults} />
    </main>
  );
}
