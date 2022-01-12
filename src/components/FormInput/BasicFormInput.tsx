import React from "react";
import { FormInputProps } from "../../types";
import useFormInput from "../../hooks/useFormInput";

export default function BasicFormInput(props: FormInputProps) {
  const { error, otherProps, id, name, value, classes, onChange } =
    useFormInput(props);

  return (
    <>
      <div className={classes?.root}>
        <input
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          className={classes?.input}
          {...otherProps}
        />

        {error && <div>{error.errorMessage}</div>}
      </div>
    </>
  );
}
