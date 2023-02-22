import { toInputName } from "@mongez/reinforcements";
import React from "react";
import useFormInput from "../hooks/useFormInput";
import { FormInputProps, HiddenInputProps } from "../types";

export default function HiddenInput(props: HiddenInputProps & FormInputProps) {
  const { name, value, id } = useFormInput(props);

  if (!name) return null;

  if (!Array.isArray(value)) {
    return (
      <input
        type="hidden"
        id={id}
        name={toInputName(name)}
        value={value || ""}
      />
    );
  }

  return (
    <>
      {value.map((singleValue: any, index: number) => (
        <input
          type="hidden"
          id={id ? `${id}-${index}` : undefined}
          key={String(singleValue)}
          name={toInputName(name)}
          value={String(singleValue)}
        />
      ))}
    </>
  );
}
