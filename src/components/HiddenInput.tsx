import { toInputName } from "@mongez/reinforcements";
import React from "react";
import useFormInput from "../hooks/useFormInput";
import { FormInputProps, HiddenInputProps } from "../types";

export default function HiddenInput(props: HiddenInputProps & FormInputProps) {
  const { name, value } = useFormInput(props);

  if (!name) return null;

  if (!Array.isArray(value)) {
    return <input type="hidden" name={toInputName(name)} value={value || ""} />;
  }

  return (
    <>
      {value.map((singleValue: any) => (
        <input
          type="hidden"
          key={String(singleValue)}
          name={toInputName(name)}
          value={String(singleValue)}
        />
      ))}
    </>
  );
}
