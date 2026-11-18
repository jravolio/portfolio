import { Grenze, Grenze_Gotisch } from "next/font/google";

export const display = Grenze_Gotisch({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});

export const text = Grenze({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-text",
  display: "swap",
});
