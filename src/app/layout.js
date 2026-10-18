import "@/styles/main.scss";

export const metadata = {
  title: "Birmingham Food Basket | Fresh Local & Organic Produce",
  description: "Fresh local vegetables, fruit baskets, organic produce, and farm groceries delivered across Birmingham.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
