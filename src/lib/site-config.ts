export const SITE_CONFIG = {
  name: "La Teglieria",
  url: "https://www.lateglieria.it",
  email: "ordini@lateglieria.it",
  address: {
    street: "Via Inghilterra, 68",
    city: "Livorno",
    province: "LI",
    postalCode: "57128",
    countryCode: "IT",
  },
  hours: {
    open: "16:00",
    close: "23:59",
    display: "16:00 - 24:00",
    lastDeliveryDisplay: "Ultime consegne: entro le 22:00",
  },
  phone: process.env.NEXT_PUBLIC_STORE_PHONE ?? "",
  social: {
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "",
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL ?? "",
  },
  googleReviewUrl:
    process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL ??
    "https://g.page/r/CW1blgo1a4szECE/review",
} as const;

export function toPhoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
