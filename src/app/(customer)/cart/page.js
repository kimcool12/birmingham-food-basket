import CartView from "../../../components/cart/CartView";

export const metadata = {
  title: "Your Cart | Birmingham Food Basket",
  robots: { index: false },
};

export default function CartPage() {
  return (
    <main
      style={{
        maxWidth: "64rem",
        margin: "0 auto",
        padding: "1.25rem 1rem 2.5rem",
      }}
    >
      <h1 style={{ margin: "0 0 1rem" }}>Your Cart</h1>
      <CartView />
    </main>
  );
}
