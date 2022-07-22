import { toInputName } from "@mongez/reinforcements";
import { FormInputProps, HiddenInputProps } from "../types";

export default function HiddenInput(props: HiddenInputProps & FormInputProps) {
  const { name, value } = props;

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
