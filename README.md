# Mongez React Form

A Powerful React form handler to handle react forms regardless your desired UI.

Mongez React Form is a headless UI framework Form Handler, meaning it provides you with handlers to handle form and form controls and the UI is on your own.

> This documentation will be in Typescript for better illustration.

## Installation

`yarn add @mongez/react-form`

Or

`npm i @mongez/react-form`

## Usage

The package here has two main anchors, `Form` component and `useFormControl` hook.

`Form` component is the wrapper for the entire form, it will handle the form submission and data collection.

`useFormControl` hook is the hook that will be used to register the form control in the form, it is responsible for handling data and validation.

## Example

Let's see a basic example, let's create `TextInput` component

```tsx
// src/components/TextInput.tsx
import { useFormControl, FormControlProps } from "@mongez/react-form";

export default function TextInput(props: FormControlProps) {
  const { value, changeValue } = useFormControl(props);

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => {
        changeValue(e.target.value);
      }}
    />
  );
}
```

Here we defined our `TextInput`, that receives props, then we use `useFormControl` hook to get our form control data and register it in the form, for now we just need to get `value` and `changeValue` from the hook.

Now let's use it in our `App.tsx`

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";

export default function App() {
  return (
    <Form
      onSubmit={{ values } => {
        console.log(values);
      }}
    >
      <TextInput name="firstName" />
      <TextInput name="lastName" />
      <button>Submit</button>
    </Form>
  );
}
```

The only required prop for any `formControl` is the `name`, it does not have to be `unique`.

Now once we click on the submit button, the `onSubmit` callback will be called with the form data, which is an object that contains all form controls values.

## Form Controls

Any component that uses `useFormControl` hook will be considered as a form control, and it will be registered in the form and it will generate a `formControl` instance, which has the following properties:

```ts
type FormControl = {
  /**
   * Form input name, it must be unique
   */
  name: string;
  /**
   * Form control type
   */
  type: string;
  /**
   * default value
   */
  defaultValue?: any;
  /**
   * Check if form control's value is changed
   */
  isDirty: boolean;
  /**
   * Check if form control is touched
   * Touched means that the user has focused on the input
   */
  isTouched: boolean;
  /**
   * Form input id, used as a form input flag determiner
   */
  id: string;
  /**
   * Form input value
   */
  value: any;
  /**
   * Input Initial value
   */
  initialValue: any;
  /**
   * Triggered when form starts validation
   */
  validate: () => Promise<boolean>;
  /**
   * Set form input error
   */
  setError: (error: React.ReactNode) => void;
  /**
   * Determine if current control is visible in the browser
   */
  isVisible: () => boolean;
  /**
   * Determine whether the form input is valid, this is checked after calling the validate method
   */
  isValid: boolean;
  /**
   * Focus on the element
   */
  focus: () => void;
  /**
   * Trigger blur event on the element
   */
  blur: () => void;
  /**
   * Triggered when form resets its values
   */
  reset: () => void;
  /**
   * Form Input Error
   */
  error: React.ReactNode;
  /**
   * Unregister form control
   */
  unregister: () => void;
  /**
   * Props list to this component
   */
  props: any;
  /**
   * Check if the input's value is marked as checked
   */
  checked: boolean;
  /**
   * Set checked value
   */
  setChecked: (checked: boolean) => void;
  /**
   * Initial checked value
   */
  initialChecked: boolean;
  /**
   * Determine if form control is multiple
   */
  multiple?: boolean;
  /**
   * Collect form control value
   */
  collectValue: () => any;
  /**
   * Check if input is collectable
   */
  isCollectable: () => boolean;
  /**
   * Determine if form control is controlled
   */
  isControlled: boolean;
  /**
   * Change form control value and any other related values
   */
  change: (value: any, changeOptions?: FormControlChangeOptions) => void;
  /**
   * Determine if form control is rendered
   */
  rendered: boolean;
  /**
   * Input Ref
   */
  inputRef: any;
  /**
   * Visible element ref
   */
  visibleElementRef: any;
  /**
   * Listen when form control value is changed
   */
  onChange: (callback: (value: FormControlChange) => void) => EventSubscription;
  /**
   * Listen when form control is destroyed
   */
  onDestroy: (callback: () => void) => EventSubscription;
  /**
   * Listen to form control when value is reset
   */
  onReset: (callback: () => void) => EventSubscription;
  /**
   * Disable/Enable form control
   */
  disable: (disable: boolean) => void;
  /**
   * Determine if form control is disabled
   */
  disabled: boolean;
  /**
   * Whether unchecked value should be collected
   *
   * Works only if type is `checkbox` or `radio`
   * @default false
   */
  collectUnchecked?: boolean;
  /**
   * Define the value if control checked state is false, If collectUnchecked is true
   */
  uncheckedValue?: any;
};
```

## Input name

The `name` prop is the only required prop for any form control, it is used to identify the form control in the form, and will be used to get the form control value from the form data.

The input name supports a `dot` notation, which means you can create a nested object using the `dot` notation.

Most of the time you won't need to get the input name as it is being stored internally in the form control hook, but you can get it using `name` property, for example:

```tsx
<Form>
  <TextInput name="user.firstName" />
  <TextInput name="user.lastName" />
</Form>
```

The above example will generate the following form data:

```ts
{
  user: {
    firstName: "John",
    lastName: "Doe"
  }
}
```

> You may use `user[name]` notation instead of `user.name` notation, it will be converted into `user.name` but it is not recommended to use it.

## Input type

Input type is also required when passing props to the form control hook, for example:

```tsx
// src/components/TextInput.tsx
import { useFormControl, FormControlProps } from "@mongez/react-form";

export default function TextInput(props: FormControlProps) {
  const { value, changeValue } = useFormControl(props);

  return (
    <input
      value={value}
      onChange={(e) => {
        changeValue(e.target.value);
      }}
    />
  );
}

TextInput.defaultProps = {
  type: "text",
};
```

The type will be passed to the form control, if not defined it will be set to `text` by default.

## Controlled and Uncontrolled input values

You can pass `value` and `onChange` props to any form control, which means you can control the form control value from outside the form control, for example:

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";

export default function App() {
  const [value, changeValue] = useState("");

  const submitForm = ({ values }) => {
    console.log(values);
  };

  return (
    <Form onSubmit={submitForm}>
      <TextInput
        name="firstName"
        value={value}
        onChange={(value) => {
          changeValue(value);
        }}
      />
      <button>Submit</button>
    </Form>
  );
}
```

This will allow you control the input value from outside the form control, if you notice the `onChange` prop receives a direct value instead of an event object, this is because the form control will handle the event object and pass the value to the `onChange` prop.

You can also pass `defaultValue` prop to any form control, which means you can set the initial value of the form control, for example:

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";

export default function App() {
  const submitForm = ({ values }) => {
    console.log(values);
  };

  return (
    <Form onSubmit={submitForm}>
      <TextInput name="firstName" defaultValue="John" />
      <button>Submit</button>
    </Form>
  );
}
```

> Any form control is `controlled` internally, meaning that you'll always receive a `value` property from the `useFormControl` hook regardless of the input type, and you can change the value using the `changeValue` function.

## Getting event and other options

`onChange` as mentioned, dispatches the value directly, but you can also manage any other data that you receive from the `onChange` prop, for example:

```tsx
// src/components/TextInput.tsx
import { useFormControl, FormControlProps } from "@mongez/react-form";

export default function TextInput(props: FormControlProps) {
  const { value, changeValue } = useFormControl(props);

  return (
    <input
      value={value}
      onChange={(e) => {
        changeValue(e.target.value, {
          event: e,
          otherOption: "some value",
        });
      }}
    />
  );
}
```

The `changeValue` function accepts a second argument which is an object that will be passed to the `onChange` prop, for example:

Now you can receive the event and other options in the `onChange` prop in the second argument, for example:

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";

export default function App() {
  const [value, changeValue] = useState("");

  const submitForm = ({ values }) => {
    console.log(values);
  };

  return (
    <Form onSubmit={submitForm}>
      <TextInput
        name="firstName"
        value={value}
        onChange={(value: string, options) => {
          changeValue(value);
          console.log(options.event); // that property we defined in the TextInput component
        }}
      />
      <button>Submit</button>
    </Form>
  );
}
```

## Checkbox inputs

Any form control labeled with `type` equal to `checkbox` will have a slight difference in the `onChange` prop, for example:

```tsx
// src/components/Checkbox.tsx
import { useFormControl, FormControlProps } from "@mongez/react-form";

export default function Checkbox(props: FormControlProps) {
  const { checked, setChecked } = useFormControl(props);

  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => {
        setChecked(e.target.checked);
      }}
    />
  );
}
```

The `setChecked` function accepts a boolean value, which means you can pass the `checked` property of the event object to the `setChecked` function.

You can now use the `Checkbox` component in the form, for example:

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import Checkbox from "./components/Checkbox";

export default function App() {
  const submitForm = ({ values }) => {
    console.log(values);
  };

  return (
    <Form onSubmit={submitForm}>
      <Checkbox defaultChecked={true} name="rememberMe" />
      <button>Submit</button>
    </Form>
  );
}
```

Now if we want to control the check state, we can pass the `checked` and `onChange` props to the `Checkbox` component, for example:

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import Checkbox from "./components/Checkbox";

export default function App() {
  const [checked, setChecked] = useState(false);

  const submitForm = ({ values }) => {
    console.log(values);
  };

  return (
    <Form onSubmit={submitForm}>
      <Checkbox
        checked={checked}
        onChange={(checked) => {
          setChecked(checked);
        }}
        name="rememberMe"
      />
      <button>Submit</button>
    </Form>
  );
}
```

Here, the `checked` state is sent as the first argument, if you want to get the value, extract it from the second argument, for example:

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import Checkbox from "./components/Checkbox";

export default function App() {
  const [checked, setChecked] = useState(false);

  const submitForm = ({ values }) => {
    console.log(values);
  };

  return (
    <Form onSubmit={submitForm}>
      <Checkbox
        checked={checked}
        onChange={(checked, { value }) => {
          setChecked(checked);
          console.log(value); // 1
        }}
        name="rememberMe"
      />
      <button>Submit</button>
    </Form>
  );
}
```

You can of course assign the value if the component is checked, for example:

```tsx
// src/components/Checkbox.tsx
import { useFormControl, FormControlProps } from "@mongez/react-form";

export default function Checkbox(props: FormControlProps) {
  const { checked, setChecked } = useFormControl(props);

  return (
    <input
      type="checkbox"
      checked={value}
      onChange={(e) => {
        setChecked(e.target.checked);
      }}
    />
  );
}

Checkbox.defaultProps = {
  defaultValue: 1,
};
```

You can also set the `unchecked` value as well by passing it to `useFormControl` in the second argument object.

```tsx
// src/components/Checkbox.tsx
import { useFormControl, FormControlProps } from "@mongez/react-form";

export default function Checkbox(props: FormControlProps) {
  const { checked, setChecked } = useFormControl(props, {
    uncheckedValue: 0,
  });

  return (
    <input
      type="checkbox"
      checked={value}
      onChange={(e) => {
        setChecked(e.target.checked);
      }}
    />
  );
}

Checkbox.defaultProps = {
  defaultValue: 1,
};
```

## Form Control Id

Each form control must have a `unique` id, if there is no id passed in the props list, the form control hook will generate a unique id and return it, for example:

```tsx
// src/components/TextInput.tsx
import { useFormControl, FormControlProps } from "@mongez/react-form";

export default function TextInput(props: FormControlProps) {
  const { value, changeValue, id } = useFormControl(props);

  return (
    <input
      type="text"
      value={value}
      id={id}
      onChange={(e) => {
        changeValue(e.target.value);
      }}
    />
  );
}
```

## Input Ref

Passing `inputRef` to the input that we're working on is important for handling the input focus, blur and so on

```tsx
// src/components/TextInput.tsx
import { useFormControl, FormControlProps } from "@mongez/react-form";
import { useEffect } from "react";

export default function TextInput(props: FormControlProps) {
  const { value, changeValue, id, inputRef, formControl } =
    useFormControl(props);

  useEffect(() => {
    setTimeout(() => {
      // focus the input after 1 second
      // this requires the inputRef to be passed to the input
      formControl.focus();
    }, 1000);
  }, []);

  return (
    <input
      type="text"
      value={value}
      id={id}
      ref={inputRef}
      onChange={(e) => {
        changeValue(e.target.value);
      }}
    />
  );
}
```

You can also perform `blur` as well:

```tsx
// src/components/TextInput.tsx
import { useFormControl, FormControlProps } from "@mongez/react-form";
import { useEffect } from "react";

export default function TextInput(props: FormControlProps) {
  const { value, changeValue, id, inputRef, formControl } =
    useFormControl(props);

  useEffect(() => {
    setTimeout(() => {
      // focus the input after 1 second
      // this requires the inputRef to be passed to the input
      formControl.focus();

      setTimeout(() => {
        // blur the input after focusing on it with 1 second
        formControl.blur();
      }, 1000);
    }, 1000);
  }, []);

  return (
    <input
      type="text"
      value={value}
      id={id}
      ref={inputRef}
      onChange={(e) => {
        changeValue(e.target.value);
      }}
    />
  );
}
```

## Disabled Prop

Form control also preserves the `disabled` prop and return it directly, for example:

```tsx
// src/components/TextInput.tsx
import { useFormControl, FormControlProps } from "@mongez/react-form";

export default function TextInput(props: FormControlProps) {
  const { value, changeValue, id, disabled } = useFormControl(props);

  return (
    <input
      type="text"
      value={value}
      id={id}
      disabled={disabled}
      onChange={(e) => {
        changeValue(e.target.value);
      }}
    />
  );
}
```

If you want to change the state of `disable` state, you can use `disable` and `enable` methods, for example:

```tsx
// src/components/TextInput.tsx
import { useFormControl, FormControlProps } from "@mongez/react-form";

export default function TextInput(props: FormControlProps) {
  const { value, changeValue, id, disabled, disable, formControl } =
    useFormControl(props);

  useEffect(() => {
    setTimeout(() => {
      // disable the input after 1 second
      disable();
      // or using the formControl
      formControl.disable();
    }, 1000);
  }, []);

  return (
    <input
      type="text"
      value={value}
      id={id}
      disabled={disabled}
      onChange={(e) => {
        changeValue(e.target.value);
      }}
    />
  );
}
```

## Is Touched

> Added in v2.1.0

Is touched in terms of form control concept means that the user has focused on the input.

You can check if the form control is touched or not using `formControl.isTouched` property, for example:

```tsx
// src/components/TextInput.tsx
import { useFormControl, FormControlProps } from "@mongez/react-form";

export default function TextInput(props: FormControlProps) {
  const { value, changeValue, id, disabled, disable, formControl } =
    useFormControl(props);

  useEffect(() => {
    setTimeout(() => {
      // check if the input is touched
      if (formControl.isTouched) {
        // do something
      }
    }, 1000);
  }, []);

  return (
    <input
      type="text"
      value={value}
      id={id}
      disabled={disabled}
      onChange={(e) => {
        changeValue(e.target.value);
      }}
    />
  );
}
```

## Is Dirty

> Added in v2.1.0

Is dirty in terms of form control concept means that the form control value is changed.

You can check if the form control is dirty or not using `formControl.isDirty` property, for example:

```tsx
// src/components/TextInput.tsx
import { useFormControl, FormControlProps } from "@mongez/react-form";

export default function TextInput(props: FormControlProps) {
  const { value, changeValue, id, disabled, disable, formControl } =
    useFormControl(props);

  useEffect(() => {
    setTimeout(() => {
      // check if the input is dirty
      if (formControl.isDirty) {
        // do something
      }
    }, 1000);
  }, []);

  return (
    <input
      type="text"
      value={value}
      id={id}
      disabled={disabled}
      onChange={(e) => {
        changeValue(e.target.value);
      }}
    />
  );
}
```

## Getting other props

Apart from the previous props, any other prop will be sent to the input will be returned as `otherProps`, for example:

```tsx
// src/components/Checkbox.tsx
import { useFormControl, FormControlProps } from "@mongez/react-form";

export default function Checkbox(props: FormControlProps) {
  const { checked, setChecked, otherProps } = useFormControl(props);

  return (
    <input
      type="checkbox"
      checked={value}
      onChange={(e) => {
        setChecked(e.target.checked);
      }}
      {...otherProps}
    />
  );
}
```

## Input Validation

Now let's move to the validation part, we can split it into two parts, using `rules` or using manual validation.

### Using rules

First off, let's define the rules list that `could` be used for `TextInput` component, for example:

```tsx
// src/components/TextInput.tsx
import { Form, requiredRule } from "@mongez/react-form";

export default function TextInput(props: FormControlProps) {
  const { value, changeValue } = useFormControl(props);

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => {
        changeValue(e.target.value);
      }}
    />
  );
}

TextInput.defaultProps = {
  rules: [requiredRule],
};
```

Here we defined the default `rules` that could run against the value change, now if we want to use it, we just have to pass `required` prop to the `TextInput` component, for example:

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";

export default function App() {
  const submitForm = ({ values }) => {
    console.log(values);
  };

  return (
    <Form onSubmit={submitForm}>
    >
      <TextInput name="name" required />
      <button>Submit</button>
    </Form>
  );
}
```

Now if we submitted the form, it won't go to `onSubmit` method, because the `name` input is required, and it's empty.

#### Displaying the error

If the rule is `not valid`, then it will return the error message, so we can display it in the UI, for example:

```tsx
// src/components/TextInput.tsx
import { Form, requiredRule } from "@mongez/react-form";

export default function TextInput(props: FormControlProps) {
  const { value, changeValue, error } = useFormControl(props);

  return (
    <>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          changeValue(e.target.value);
        }}
      />
      {error && (
        <span
          style={{
            color: "red",
          }}
        >
          {error}
        </span>
      )}
    </>
  );
}

TextInput.defaultProps = {
  rules: [requiredRule],
};
```

The error will appear based on current locale code from [Mongez Localization](https://github.com/hassanzohdy/mongez-localization)

For now translation supports Six languages, `English`, `Arabic`, `French`, `Spanish`, `Italian` and `Germany` with locale codes `en`, `ar`, `fr`, `es`, `it` and `de` respectively.

## Rules list

Here are the available rules that you can use:

- `requiredRule`: Check if the value is not empty.
  - `null`, `undefined`, `''` and `[]` are considered empty.
  - Requires `required` prop to be present.
  - Translation Key: `validation.required`.
- `minLengthRule`: Check if the value's length is greater than or equal to the `minLength` prop.
  - Requires `minLength` prop to be present.
  - Translation Key: `validation.minLength`, receives `:length` as a placeholder.
  - `minLength` prop will be preserved from being passed to `otherProps`.
  - Works with strings and arrays.
- `maxLengthRule`: Check if the value's length is less than or equal to the `maxLength` prop.
  - Requires `maxLength` prop to be present.
  - Translation Key: `validation.maxLength`, receives `:length` as a placeholder.
  - `maxLength` prop will be preserved from being passed to `otherProps`.
  - Works with strings and arrays.
- `lengthRule`: Check if the value's length is equal to the `length` prop.
  - Requires `length` prop to be present.
  - Translation Key: `validation.length`, receives `:length` as a placeholder.
  - `length` prop will be preserved from being passed to `otherProps`.
  - Works with strings and arrays.
- `minRule`: Check if the value is greater than or equal to the `min` prop.
  - Requires `min` prop to be present.
  - Translation Key: `validation.min`, receives `:min` as a placeholder.
  - `min` prop will be preserved from being passed to `otherProps`.
  - Works with numbers.
- `maxRule`: Check if the value is less than or equal to the `max` prop.
  - Requires `max` prop to be present.
  - Translation Key: `validation.max`, receives `:max` as a placeholder.
  - `max` prop will be preserved from being passed to `otherProps`.
  - Works with numbers.
- `emailRule`: Check if the value is a valid email.
  - Translation Key: `validation.email`.
  - Requires `type` prop to be `email`.
- `numberRule`: Check if the value is a valid number.
  - Translation Key: `validation.number`.
  - Requires `type` prop to be `number`.
- `floatRule`: Check if the value is a valid float number.
  - Translation Key: `validation.float`.
  - Requires `type` prop to be `float`.
- `integerRule`: Check if the value is a valid integer number.
  - Translation Key: `validation.integer`.
  - Requires `type` prop to be `integer`.
- `patternRule`: Check if the value matches the `pattern` prop.
  - Requires `pattern` prop to be present.
  - Translation Key: `validation.pattern`, receives `:pattern` as a placeholder.
  - `pattern` prop will be preserved from being passed to `otherProps`.
- `alphabetRule`: Check if the value is a valid alphabet.
  - Translation Key: `validation.alphabet`.
  - Requires `type` prop to be `alphabet`.
- `matchRule`: Check if the value matches the value of the input with the name of the `match` prop.
  - Requires `match` prop to be present.
  - Translation Key: `validation.match`, receives `:matchingInput` as a placeholder.
  - `match` prop will be preserved from being passed to `otherProps`.

Example of usage for each rule:

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";

export default function App() {
  const submitForm = ({ values }) => {
    console.log(values);
  };

  return (
    <Form onSubmit={submitForm}>
    >
      <TextInput name="name" required />
      <TextInput name="email" type="email" required />
      <TextInput name="age" type="number" required />
      <TextInput name="salary" type="float" required />
      <TextInput name="phone" type="integer" required />
      <TextInput name="password" type="password" required />
      <TextInput name="confirmPassword" type="password" required match="password" />
      <TextInput name="website" type="url" required />
      <TextInput name="address" type="text" required minLength={10} maxLength={100} />
      <TextInput name="zipCode" type="text" required length={5} />
      <TextInput name="phone" type="text" required pattern={/^01[0-2|5]{1}[0-9]{8}$/} />
      <TextInput name="name" required alphabet />
      <button>Submit</button>
    </Form>
  );
}
```

```tsx
// src/components/TextInput.tsx
import {
  Form,
  requiredRule,
  minLengthRule,
  maxLengthRule,
  lengthRule,
  emailRule,
  numberRule,
  floatRule,
  integerRule,
  patternRule,
  alphabetRule,
  matchRule,
} from "@mongez/react-form";

export default function TextInput(props: FormControlProps) {
  const { value, changeValue, error } = useFormControl(props);

  return (
    <>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          changeValue(e.target.value);
        }}
      />
      {error && (
        <span
          style={{
            color: "red",
          }}
        >
          {error}
        </span>
      )}
    </>
  );
}

TextInput.defaultProps = {
  rules: [
    requiredRule,
    minLengthRule,
    maxLengthRule,
    lengthRule,
    emailRule,
    numberRule,
    floatRule,
    integerRule,
    patternRule,
    alphabetRule,
    matchRule,
  ],
};
```

> This is just a demo, please make a component for each type separately, for example `EmailInput`, `NumberInput`, `FloatInput`, `IntegerInput`, `PasswordInput`, `UrlInput`, `AlphabetInput` and so on.

### Create custom rule

You can of course create a custom rule to use it among your inputs, for example:

```tsx
// src/validation/phoneNumber.ts
import { groupedTranslations } from "@mongez/localization";

export const phoneNumberRule = ({ value, type }) => {
  if (!value || type !== 'phoneNumber') return;

  const regex = /^01[0-2|5]{1}[0-9]{8}$/;

  if (!regex.test(value)) {
    return trans('validation.phoneNumber');
  }
}

// don't forget to add the rule name
phoneNumberRule.rule = 'phoneNumber';

// now add the translation
groupedTranslations('validation', {
  phoneNumber: {
    en: 'Phone number is invalid',
    ar: 'رقم الهاتف غير صحيح'
    fr: 'Le numéro de téléphone est invalide',
    es: 'El número de teléfono no es válido',
    it: 'Il numero di telefono non è valido',
    de: 'Die Telefonnummer ist ungültig'
  }
});
```

Now you can use it in your `TextInput` component

```tsx
// src/components/TextInput.tsx
import { Form, requiredRule } from "@mongez/react-form";
import { phoneNumberRule } from "../validation/phoneNumber";

export default function TextInput(props: FormControlProps) {
  const { value, changeValue, type, error } = useFormControl(props);

  return (
    <>
      <input
        type={type}
        value={value}
        onChange={(e) => {
          changeValue(e.target.value);
        }}
      />
      {error && (
        <span
          style={{
            color: "red",
          }}
        >
          {error}
        </span>
      )}
    </>
  );
}

TextInput.defaultProps = {
  rules: [requiredRule, phoneNumberRule],
};
```

And that's it!

Now for usage, you can use it like this:

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";

export default function App() {
  const submitForm = ({ values }) => {
    console.log(values);
  };

  return (
    <Form onSubmit={submitForm}>
      <TextInput name="name" required />
      <TextInput name="phone" type="phoneNumber" required />
      <button>Submit</button>
    </Form>
  );
}
```

Sometimes you may need a certain prop to be present as well, but this is needed only for validation, so we can added to `preservedProps` array to prevent it from being added to `otherProps` object

```tsx
// src/rules/min.ts
import { trans } from "@mongez/localization";

export const minRule = ({ value, min, errorKeys }: any) => {
  if (Number(value) < Number(min)) {
    return trans("validation.min", { name: errorKeys.name, length: min });
  }
};

// prevent the min prop from being added to otherProps
minRule.preserveProps = ["min"];
// don't forget to add the rule name
minRule.rule = "min";
```

### Single Component Validation

Sometimes, you may need to apply a certain validation only on a certain component call, this where you can use `validate` prop for that purpose.

```tsx
// src/App.tsx
import TextInput from "./components/TextInput";
import { useState } from "react";

export default function App() {
  const validateUsername = ({ value }) => {
    if (!value) return; // skip the validation if the value is empty

    const usernameRegex = /^[a-zA-Z0-9]+$/;

    if (!usernameRegex.test(value)) {
      return "Username must be alphanumeric";
    }
  };

  const submitForm = ({ values }) => {
    console.log(values);
  };

  return (
    <Form onSubmit={submitForm}>
      <TextInput name="name" required />
      <TextInput name="username" validate={validateUsername} />
      <button>Submit</button>
    </Form>
  );
}
```

You can also `async` the validation.

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";
import { useState } from "react";
import { checkUsername } from "./api";

export default function App() {
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const validateUsername = ({ value }) => {
    if (!value) return; // skip the validation if the value is empty

    // check for username from api
    setIsCheckingUsername(true);

    try {
      await checkUsername(value);
    } catch (error) {
      return error.message;
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const submitForm = ({ values }) => {
    console.log(values);
  };

  return (
    <Form onSubmit={submitForm}>
      <TextInput name="name" required />
      <TextInput name="username" validate={validateUsername} />
      <button>Submit</button>
    </Form>
  );
}
```

This will stop any other validator from being called until the `validateUsername` function is resolved.

#### Customizing the error message

There are multiple ways to override the error message:

1. Overriding the translation errors.
2. Changing the error keys per component call.
3. Override rule error per component call.

##### Overriding the translation errors

You can override the translation errors from the translation list using `groupedTranslations` method from [Mongez Localization](https://github.com/hassanzohdy/mongez-localization), here is the current error messages list.

```tsx
// src/locales.ts
import { groupedTranslations } from "@mongez/localization";

export const validationTranslation = {
  required: {
    en: "This input is required",
    ar: "هذا الحقل مطلوب",
    fr: "Ce champ est requis",
    es: "Este campo es obligatorio",
    it: "Questo campo è obbligatorio",
    de: "Dieses Feld ist erforderlich",
  },
  invalidEmailAddress: {
    en: "Invalid Email Address",
    ar: "بريد الكتروني خاطئ",
    fr: "Adresse e-mail invalide",
    es: "Dirección de correo electrónico no válida",
    it: "Indirizzo email non valido",
    de: "Ungültige E-Mail-Adresse",
  },
  url: {
    en: "Invalid URL",
    ar: "رابط غير صحيح",
    fr: "URL invalide",
    es: "URL no válida",
    it: "URL non valido",
    de: "Ungültige URL",
  },
  min: {
    en: "Value can not be lower than :min",
    ar: "القيمة يجب أن لا تقل عن :min",
    fr: "La valeur ne peut pas être inférieure à :min",
    es: "El valor no puede ser inferior a :min",
    it: "Il valore non può essere inferiore a :min",
    de: "Der Wert darf nicht kleiner sein als :min",
  },
  max: {
    en: "Value can not be greater than :max",
    ar: "القيمة يجب أن لا تزيد عن :max",
    fr: "La valeur ne peut pas être supérieure à :max",
    es: "El valor no puede ser superior a :max",
    it: "Il valore non può essere superiore a :max",
    de: "Der Wert darf nicht größer sein als :max",
  },
  matchElement: {
    en: "This input is not matching with :matchingInput",
    ar: "هذا الحقل غير متطابق مع :matchingInput",
    fr: "Ce champ ne correspond pas à :matchingInput",
    es: "Este campo no coincide con :matchingInput",
    it: "Questo campo non corrisponde a :matchingInput",
    de: "Dieses Feld stimmt nicht mit :matchingInput überein",
  },
  length: {
    en: "This input should have :length characters",
    ar: "حروف الحقل يجب ان تساوي :length",
    fr: "Ce champ doit avoir :length caractères",
    es: "Este campo debe tener :length caracteres",
    it: "Questo campo deve avere :length caratteri",
    de: "Dieses Feld sollte :length Zeichen haben",
  },
  minLength: {
    en: "This input can not be less than :length characters",
    ar: "هذا الحقل يجب ألا يقل عن :length حرف",
    fr: "Ce champ ne peut pas être inférieur à :length caractères",
    es: "Este campo no puede ser inferior a :length caracteres",
    it: "Questo campo non può essere inferiore a :length caratteri",
    de: "Dieses Feld darf nicht weniger als :length Zeichen haben",
  },
  maxLength: {
    en: "This input can not be greater than :length characters",
    ar: "هذا الحقل يجب ألا يزيد عن :length حرف",
    fr: "Ce champ ne peut pas être supérieur à :length caractères",
    es: "Este campo no puede ser superior a :length caracteres",
    it: "Questo campo non può essere superiore a :length caratteri",
    de: "Dieses Feld darf nicht mehr als :length Zeichen haben",
  },
  pattern: {
    en: "This input is not matching with the :pattern",
    ar: "هذا الحقل غير مطابق :pattern",
    fr: "Ce champ ne correspond pas au :pattern",
    es: "Este campo no coincide con el :pattern",
    it: "Questo campo non corrisponde al :pattern",
    de: "Dieses Feld stimmt nicht mit dem :pattern überein",
  },
  number: {
    en: "This input accepts only numbers",
    ar: "هذا الحقل لا يقبل غير أرقام فقط",
    fr: "Ce champ ne peut contenir que des chiffres",
    es: "Este campo solo acepta números",
    it: "Questo campo accetta solo numeri",
    de: "Dieses Feld akzeptiert nur Zahlen",
  },
  integer: {
    en: "This input accepts only integer digits",
    ar: "هذا الحقل لا يقبل غير أرقام صحيحة",
    fr: "Ce champ ne peut contenir que des chiffres entiers",
    es: "Este campo solo acepta dígitos enteros",
    it: "Questo campo accetta solo cifre intere",
    de: "Dieses Feld akzeptiert nur ganze Zahlen",
  },
  float: {
    en: "This input accepts only integer or float digits",
    ar: "هذا الحقل لا يقبل غير أرقام صحيحة او عشرية",
    fr: "Ce champ ne peut contenir que des chiffres entiers ou décimaux",
    es: "Este campo solo acepta dígitos enteros o decimales",
    it: "Questo campo accetta solo cifre intere o decimali",
    de: "Dieses Feld akzeptiert nur ganze oder Dezimalzahlen",
  },
  alphabet: {
    en: "This input accepts only alphabets",
    ar: "هذا الحقل لا يقبل غير أحرف فقط",
    fr: "Ce champ ne peut contenir que des lettres",
    es: "Este campo solo acepta letras",
    it: "Questo campo accetta solo lettere",
    de: "Dieses Feld akzeptiert nur Buchstaben",
  },
};

groupedTranslations("validation", validationTranslation);
```

#### Changing the error keys per component call

This coulld be useful for some rules such as the`match` rule to override the error key with the matching input name.

```tsx
// srcc/App.tsx
import { Form } from "@mongez/form";
import { TextInput } from "@mongez/form";

export default function App() {
  return (
    <Form>
      <TextInput name="password" type="password" required minLength={8} />
      <TextInput
        name="confirmPassword"
        match="password"
        type="password"
        errorKeys={{
          matchingInput: "Passowrd Input",
        }}
      />
    </Form>
  );
}
```

If the passowrd input does not match the confirm password input, the error message will be:

`This input is not matching with Passowrd Input`

If you installed [Localization React](https://github.com/hassanzohdy/mongez-react-localization) package, yoou can get benefit from passing `jsx` element instead of just plain text.

```tsx
// srcc/App.tsx
import { Form } from "@mongez/form";
import { TextInput } from "@mongez/form";

export default function App() {
  return (
    <Form>
      <TextInput name="password" type="password" required minLength={8} />
      <TextInput
        name="confirmPassword"
        match="password"
        type="password"
        errorKeys={{
          matchingInput: <span className="text-danger">Passowrd Input</span>,
        }}
      />
    </Form>
  );
}
```

#### Changing the error message per component call

You can also change the entire error message, forr example when working withe `pattern` rule, you can pass the `pattern` prop as a `RegExp` object, and then pass the `errorMessages` prop to override the error message.

```tsx
// srcc/App.tsx
import { Form } from "@mongez/form";
import { TextInput } from "@mongez/form";

export default function App() {
  return (
    <Form>
      <TextInput
        name="username"
        placeholder="Username must accept only letters and numbers"
        pattern={/^[a-zA-Z0-9]+$/}}
        errorMessages={{
          pattern: "Username must accept only letters and numbers"
        }}
      />
    </Form>
  );
}
```

It's recommended to use [trans](https://github.com/hassanzohdy/mongez-localization#translating-keywords) function if you're web application has multiple languages.

```tsx
// srcc/App.tsx
import { Form } from "@mongez/form";
import { trans } from "@mongez/localization";
import { TextInput } from "@mongez/form";

export default function App() {
  return (
    <Form>
      <TextInput
        name="username"
        placeholder="Username must accept only letters and numbers"
        pattern={/^[a-zA-Z0-9]+$/}}
        errorMessages={{
          pattern: trans('usernamePatternError')
        }}
      />
    </Form>
  );
}
```

## Form Submission

The `onSubmit`prop is the only required prop for `Form` component, also, it will not be called until all form controls are **valid**.

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";
import { useState } from "react";

export default function App() {
  const submitForm = ({ values }) => {
    console.log(values);
  };

  return (
    <Form onSubmit={submitForm}>
      <TextInput name="name" required />
      <TextInput name="username" />
      <button>Submit</button>
    </Form>
  );
}
```

If the form is not submitted **programatically**, you can gett `event` object from the `onSubmit` callback

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";

export default function App() {
  const submitForm = ({ values, event }) => {
    const formElement = event.target;
  };

  return (
    <Form onSubmit={submitForm}>
      <TextInput name="name" required />
      <TextInput name="username" />
      <button>Submit</button>
    </Form>
  );
}
```

> Don't use `event.preventDefault()` in the `onSubmit` callback, it will be called automatically.

### Getting form values

You can get the form values from the `onSubmit` callback using the `values` property.

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";

export default function App() {
  const submitForm = ({ values }) => {
    console.log(values);
  };

  return (
    <Form onSubmit={submitForm}>
      <TextInput name="name" required />
      <TextInput name="username" />
      <button>Submit</button>
    </Form>
  );
}
```

However, if you want to get it as `FormData`, use `formData` property instead.

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";
import createAccount from "./services/createAccount";

export default function App() {
  const submitForm = ({ formData }) => {
    createAccount(formData).then((response) => {
      //...
    });
  };

  return (
    <Form onSubmit={submitForm}>
      <TextInput name="name" required />
      <TextInput name="username" />
      <button>Submit</button>
    </Form>
  );
}
```

This is useful if you're working with `multipart/form-data` requests and want to send some files.

### Ignoring Empty Values

By default, the form will collect all form controls with its values regardlress of their values, but if you want to ignore empty values, you can pass `ignoreEmptyValues` prop to the `Form` component.

Without using `ignoreEmptyValues` prop:

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";

export default function App() {
  const submitForm = ({ values }) => {
    // if the username input is empty, it will be included in the values object with an empty string
    console.log(values); // { name: "John Doe", username: "" }
  };

  return (
    <Form onSubmit={submitForm}>
      <TextInput name="name" required />
      <TextInput name="username" />
      <button>Submit</button>
    </Form>
  );
}
```

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";

export default function App() {
  const submitForm = ({ values }) => {
    // if the username input is empty, it will not be included in the values object
    console.log(values); // { name: "John Doe" }
  };

  return (
    <Form onSubmit={submitForm} ignoreEmptyValues>
      <TextInput name="name" required />
      <TextInput name="username" />
      <button>Submit</button>
    </Form>
  );
}
```

### Getting form instance

The last thing that you may receive from the `onSubmit` callback is the `form` instance, which is an object that implements `FormInterface`.

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";

export default function App() {
  const submitForm = ({ form }) => {
    console.log(form);
  };

  return (
    <Form onSubmit={submitForm}>
      <TextInput name="name" required />
      <TextInput name="username" />
      <button>Submit</button>
    </Form>
  );
}
```

You can get from the form instance:

- `values()`: returns the entire form values from all registered form controls.
- `value(formControlName: string)` : returns a specific form control value by its name.
- `formData()`: returns the entire form values as `FormData` object.
- `controls()`: returns all registered form controls.
- `control(name: string)`: returns a specific form control by its name.
- `isValid()`: returns `true` if all form controls are valid, otherwise, it returns `false`.
- `submit()`: submits the form programatically.
- `isSubmitting()`: returns `true` if the form is submitting, otherwise, it returns `false`.
- `submitting(submitForm: boolean)`: sets the form submitting state.
- `reset()`: resets the form to its initial state.
- `resetErrors()`: resets all form controls errors.
- `change(name: string, value: any)`: changes a specific form control value.
- `id`: returns the form id.
- `formElement`: returns the form element.

### Set form component

You can set the form component by using `component` prop.

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";

export default function App() {
  const submitForm = ({ values }) => {
    console.log(values);
  };

  return (
    <Form onSubmit={submitForm} component="form">
      <TextInput name="name" required />
      <TextInput name="username" />
      <button>Submit</button>
    </Form>
  );
}
```

> you ccan pass any React component, but it must receive a ref prop and be attached to the internal form element of that component.

### Capturing form errors

If you want to capture all invalid form contrls, use `onError` prop.

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";

export default function App() {
  const submitForm = ({ values }) => {
    console.log(values);
  };

  const onError = (formControls) => {
    const errors = formControls.map((control) => control.error);
    console.log(errors);
  };

  return (
    <Form onSubmit={submitForm} onError={onError}>
      <TextInput name="name" required />
      <TextInput name="username" />
      <button>Submit</button>
    </Form>
  );
}
```

## useForm hook

You can use `useForm` hook to get the form instance and submit the form programatically.

```tsx
// src/InternalComponent.tsx
import { useForm } from "@mongez/react-form";
import TextInput from "./components/TextInput";

export default function InternalComponent() {
  const form = useForm();

  const submitForm = () => {
    form?.submit();
  };

  return <TextInput name="name" onChange={submitForm} required />;
}
```

> You can use `useForm` hook only inside the `Form` component.

If `useForm` is used outside the `Form` component, it will return `null`.

## useSubmitButton hook

Another good hook to use is `useSubmitButton`, this hook basically disables the submit button in certain scenarios

- When the form has been submitted.
- When there are invalid form controls.

Also the buttion is switch to `enabled` state when the form is valid, or form is reset, or form submission is **false**.

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";
import SubmitButton from "./components/SubmitButton";

export default function App() {
  const submitForm = ({ values }) => {
    console.log(values);
  };

  return (
    <Form onSubmit={submitForm}>
      <TextInput name="name" required />
      <TextInput name="username" />
      <SubmitButton>Submit</SubmitButton>
    </Form>
  );
}
```

```tsx
// src/components/SubmitButton.tsx
import { useSubmitButton } from "@mongez/react-form";

export default function SubmitButton({ children }) {
  const { disabled } = useSubmitButton();

  return <button disabled={disabled}>{children}</button>;
}
```

It will be updated automatically.

You can also get notified when the form is being submitted only besides the disabled state, it could be useful to display a loading indicator.

```tsx
// src/components/SubmitButton.tsx
import { useSubmitButton } from "@mongez/react-form";

export default function SubmitButton({ children }) {
  const { disabled, isSubmitting } = useSubmitButton();

  return (
    <button disabled={disabled}>
      {isSubmitting ? "Loading..." : children}
    </button>
  );
}
```

## Change form submitting state

Let's take a scenario, where the form is submitted, an API request is sent to the server, and the form is being submitted, but the server returns an error, in this case we want to change the form submitting state to `false` so the user can submit the form again.

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";
import SubmitButton from "./components/SubmitButton";
import createAccount from "./services/createAccount";

export default function App() {
  const submitForm = ({ values }) => {
    createAccount(values)
      .then((response) => {
        //...
      })
      .catch((error) => {
        form?.submitting(false);
      });
  };

  return (
    <Form onSubmit={submitForm}>
      <TextInput name="name" required />
      <TextInput name="username" />
      <SubmitButton>Submit</SubmitButton>
    </Form>
  );
}
```

This will change the form submitting state to `false` and the submit button will be enabled again.

## Active Forms

All forms are being tracked using the `Active Forms` utilities, which means you can get the current active form from anywhere in the project using `getActiveForm` utility.

```ts
import { getActiveForm } from "@mongez/react-form";

console.log(getActiveForm()); // null by default
```

By default the active form will be null until there is a form is mounted in the DOM, once there is a Form rendered you can get access to that form using the `getActiveForm` function.

```tsx
import { getActiveForm } from "@mongez/react-form";

export default function LoginPage() {
  React.useEffect(() => {
    console.log(getActiveForm()); // will get the Form Component Which implements FormInterface
  }, []);

  return (
    <>
      <LoginFormComponent />
    </>
  );
}
```

Sometimes we may open multiple forms in one page, for example a single page that displays the login form and the register form, we can access any form of them using the `getForm` utility by passing the form id to it.

```tsx
import { getForm, Form } from "@mongez/react-form";

export default function LoginPage() {
  React.useEffect(() => {
    console.log(getForm("login-form")); // will get the login form
    console.log(getForm("register-form")); // will get the register form
  }, []);

  return (
    <>
      <Form id="login-form">...</Form>
      <Form id="register-form">...</Form>
    </>
  );
}
```

## Reset Form

You can reset the form using `reset` method, this will return all form controls values to its initial value.

```tsx
// src/App.tsx
import { Form, getActiveForm } from "@mongez/react-form";
import TextInput from "./components/TextInput";
import SubmitButton from "./components/SubmitButton";

export default function App() {
  const submitForm = ({ values }) => {
    console.log(values);
  };

  const resetForm = () => {
    const form = getActiveForm();

    form?.reset();
  };

  return (
    <Form onSubmit={submitForm}>
      <TextInput name="name" required />
      <TextInput name="username" />
      <SubmitButton>Submit</SubmitButton>
      <button onClick={resetForm}>Reset</button>
    </Form>
  );
}
```

## Form Ref

You can also get the form instance using the `ref` prop.

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";
import SubmitButton from "./components/SubmitButton";
import { useRef } from "react";

export default function App() {
  const formRef = useRef();

  const submitForm = ({ values }) => {
    console.log(values);
  };

  const resetForm = () => {
    formRef.current.reset();
  };

  return (
    <Form ref={formRef} onSubmit={submitForm}>
      <TextInput name="name" required />
      <TextInput name="username" />
      <SubmitButton>Submit</SubmitButton>
      <button onClick={resetForm}>Reset</button>
    </Form>
  );
}
```

## Form Events

You can listen to form events using the `on` method, it's basically the one that's used in [useSubmitButton hook](#usesubmitbutton-hook).

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";
import SubmitButton from "./components/SubmitButton";
import { useEffect } from "react";

export default function App() {
  const formRef = useRef();

  const submitForm = ({ values }) => {
    console.log(values);
  };

  useEffect(() => {
    formRef.current.on("submitting", () => {
      console.log("Form is being submitted");
    });

    formRef.current.on("submit", () => {
      console.log("Form is submitted");
    });
  }, []);

  return (
    <Form ref={formRef} onSubmit={submitForm}>
      <TextInput name="name" required />
      <TextInput name="username" />
      <SubmitButton>Submit</SubmitButton>
    </Form>
  );
}
```

Here are the available events:

- `submitting`: will be triggered when the form is being submitted, recives a `Boolean` value to indicate if the form is being submitted or not.
- `submit`: will be triggered when the form is submitted, if form `submitting` is set to false, this event will be fired immediately.
- `resetting`: will be triggered when the form is being reset, recives a `Boolean` value to indicate if the form is being reset or not.
- `reset`: will be triggered when the form is reset.
- `validating`: will be triggered when the form is being validated.
- `invalidControls`: will be triggered when the form has invalid controls, recives an array of invalid controls.
- `validControls`: will be triggered when the form has valid controls, recives an array of valid controls.
- `validation`: will be triggered when the form is validated, recives a `Boolean` value to indicate if the form is valid or not, also recives an array of all controls that have been validated.

## Validate Stepper

Sometimes you may deal with a form that has multiple steps, and you want to validate each step before moving to the next one, you can use `validateVisible` method to do that.

First off, make sure the elements are hidden and `not removed` from the DOM, otherwise, the validation will not work.

Secondly, each input must use the `visibleElementRef` either in the input itself or the wrapper, this way the form will know which inputs are visible and which are not.

```tsx
// src/components/TextInput.tsx
import { Form, useFormControl } from "@mongez/react-form";

export default function TextInput(props: FormControlProps) {
  const { value, changeValue, type, error, visibleElementRef } =
    useFormControl(props);

  return (
    <div ref={visibleElementRef}>
      <input
        type={type}
        value={value}
        onChange={(e) => {
          changeValue(e.target.value);
        }}
      />
      {error && (
        <span
          style={{
            color: "red",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
```

Finally, when the usere clicks on the next button, validate the current step, if it's valid, move to the next step, otherwise, show the errors, but this time instead of using `validate` methid, we will use `validateVisible` method.

```tsx
// src/App.tsx
import { Form } from "@mongez/react-form";
import TextInput from "./components/TextInput";

export default function App() {
  const formRef = useRef();

  const submitForm = ({ values }) => {
    console.log(values);
  };

  const nextStep = async () => {
    const form = formRef.current;

    form.validateVisible().then(() => {
      if (form.isValid) {
        // move to the next step
      }
    });
  };

  return (
    <Form ref={formRef} onSubmit={submitForm}>
      <TextInput name="name" required />
      <TextInput name="username" />
      <button type="button" onClick={nextStep}>
        Next
      </button>
    </Form>
  );
}
```

When the validation is done, the output of the promise returns list of the inputs which have been validated either they are valid or not.

## TODO

- Add silent update

## Change Log

- 2.1.0 (05 Nov 2023)
  - Added `isDirty` to form control.
  - Added `isTouched` to form control.
- 2.0.0 (05 Mar 2023)
  - Refactored code
  - Replaced `useFormInput` with `useFormControl`
  - Changed `onSubmit` callback options.
  - Added `useSubmitButton` hook.
  - Validation rules are now internally added in the package.
  - Added `English` `Arabic` `French` `Italian` and `Spanish` translations.
- 1.5.25 (13 Nov 2022)
  - Feat: when `validating` trigger callbacks returns `false` then the form will be marked as invalid and won't be submitted.
- 1.5.20 (06 Nov 2022)
  - Added `formControl.element` to get the form control element.
  - Added `formControl.isChecked` to check if the form control is checked or not.
  - Added `formControl.blur` to blur the form control.
  - Added `formControl.isHidden` to check if the form control is hidden or not.
- 1.5.12 (17 Aug 2022)
  - Added `checkIfIsValid` method to form interface
- 1.5.11 (17 Aug 2022)
  - Fixed form `validControls` and `invalidControls` validation events trigger.
- 1.5.3 (12 July 2022)
  - Fixed form control reset value.
- 1.5.2 (12 July 2022)
  - Fixed form submission.
- 1.5.1 (12 July 2022)
  - Fixed exclude props.
- 1.5.0 (12 July 2022)
  - Added Active Forms.
  - Fixed some bugs.
- 1.4.0 (09 July 2022)
  - Added `validate` prop to form control.
  - Added `errors` prop to form control.
- 1.3.0 (03 July 2022)
  - Added Form Control Events.
- 1.2.4 (18 Jun 2022)
  - Fixed form input registering.
- 1.2.3 (18 Jun 2022)
  - Fixed `disable` method.
- 1.2.2 (17 Jun 2022)
  - Fixed `each` method.
- 1.2.1 (15 Jun 2022)
  - `validate` and `validateVisible` methods return the validated form controls.
- 1.2.0 (15 Jun 2022)
- Fixed `validate` method to allow calling it without any parameters.
- Added validateVisible method
- 1.1.0 (16 May 2022)
  - Added `change` form event.
  - Added Dirty Form Controls.
  - Added useFormEvent Hook
- 1.0.11 (04 Mar 2022)
  - Fixed Bugs
- 1.0.7 (26 Jan 2022)
  - Fixed Filtering form controls in `each` method.
