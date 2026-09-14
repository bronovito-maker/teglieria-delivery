"use client";

import GooglePlaceAutocomplete from "@/components/shared/GooglePlaceAutocomplete";

interface Props {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

export default function AdminAddressInput({ value, onChange, required, className }: Props) {
  return (
    <GooglePlaceAutocomplete
      value={value}
      onChange={onChange}
      required={required}
      className={`admin-address-autocomplete ${className ?? ""}`.trim()}
    />
  );
}
