import React from "react";

export default function useInputValue<T>(initialValue: T) {
  const [value, setValue] = React.useState<T>(initialValue);

  const valueChecker: (e: any) => void = (e: any): void => {
    if (!e) {
      setValue("" as any);
    } else if (e.value !== undefined) {
      setValue(e.value);
    } else if (e.target && e.target.value !== undefined) {
      setValue(e.target.value);
    } else if (e.id !== undefined) {
      setValue(e.id);
    } else if (e.text !== undefined) {
      setValue(e.text);
    } else {
      setValue(e);
    }
  };

  const returnedState: [T, (e: any) => void] = [value, valueChecker];

  return returnedState;
}
