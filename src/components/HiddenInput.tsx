import React from "react";
import { useFormInput } from "../hooks";
import { toInputName } from "@mongez/reinforcements";
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
          key={singleValue}
          name={toInputName(name)}
          value={String(singleValue)}
        />
      ))}
    </>
  );
}
