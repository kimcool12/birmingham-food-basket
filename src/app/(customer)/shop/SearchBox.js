"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./shop.module.scss";

export default function SearchBox({ initial }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initial);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const text = value.trim();
      if (text) params.set("q", text);
      else params.delete("q");
      params.delete("page");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={styles.search} role="search">
      <label htmlFor="shop-search" className={styles.srOnly}>
        Search products
      </label>
      <input
        id="shop-search"
        type="search"
        placeholder="Search products"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </div>
  );
}
