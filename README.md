# Mongez React Form

A Powerful React form handler to handle react forms regardless your desired UI.

Mongez React Form is an agnostic UI framework, which means it provides you with utilities to handle form and form components and the UI is on your own.

> There will be separate packages to handle popular UI frameworks such as Material UI and Semantic, but this will another topic in another day.
> This documentation will be in a Typescript syntax for better illustration.

## Table Of Contents

- [Mongez React Form](#mongez-react-form)
  - [Table Of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Form Context](#form-context)
  - [useForm Hook](#useform-hook)
  - [Create a heavy form input](#create-a-heavy-form-input)
  - [The FormInput Object](#the-forminput-object)
    - [The id attribute](#the-id-attribute)
  - [The name attribute](#the-name-attribute)
    - [Controlled Vs Uncontrolled Component](#controlled-vs-uncontrolled-component)
  - [Input Validation](#input-validation)
    - [Display error message](#display-error-message)
  - [Manually validating component](#manually-validating-component)
  - [The onError prop](#the-onerror-prop)
  - [TODO](#todo)

## Installation

`yarn add @mongez/react-form`

Or

`npm i @mongez/react-form`

## Usage

Let's start with our main component, the `Form` component.

```tsx
// LoginPage.tsx
import React from 'react';
import { Form } from '@mongez/react-form';

export default function LoginPage() {
    const performLogin = (e: React.FormEvent) => {
        //
    };

    return (
        <Form onSubmit={performLogin}>
            <input type="email" name="email" placeholder="Email Address" />
            <br />
            <input type="password" name="password" placeholder="Password" />
            <br />
            <button>Login</button>
        </Form>
    )
}
```

So far nothing special happens here, a simple form with two inputs, except that `Form` do some extra functions than the normal `form`.

The first feature here is `Form` **prevents default behavior** that submits the form, the form will be submitted but not no redirection happens.

Now let's get the form inputs values.

```tsx
// LoginPage.tsx
import React from 'react';
import { Form } from '@mongez/react-form';

export default function LoginPage() {
    const performLogin = (e: React.FormEvent) => {
        //
    };

    return (
        <Form collectValuesFromDOM onSubmit={performLogin}>
            <input type="email" name="email" placeholder="Email Address" />
            <br />
            <input type="password" name="password" placeholder="Password" />
            <br />
            <button>Login</button>
        </Form>
    )
}
```

The only thing that is added here is `collectValuesFromDOM` which collects all inputs values from the dom directly if input has `name` attribute.

```tsx
// LoginPage.tsx
import React from 'react';
import { Form, FormInterface } from '@mongez/react-form';

export default function LoginPage() {
    const performLogin = (e: React.FormEvent, form: FormInterface) => {
        console.log(form.values()); // {email: written-value, password: written-value }
    };

    return (
        <Form collectValuesFromDOM onSubmit={performLogin}>
            <input type="email" name="email" placeholder="Email Address" />
            <br />
            <input type="password" name="password" placeholder="Password" />
            <br />
            <button>Login</button>
        </Form>
    )
}
```

In this step, the `onSubmit` accepts two arguments, the event handler which is the default one, and the `Form class` as second argument.

We called `form.values()`, this method collects values from the dom inputs and return an object that has all values, for the time being this works thanks to `collectValuesFromDOM` otherwise it will return an empty object.

## Form Context

You may access the form class from any child component using `FormContext`

```tsx
// LoginPage.tsx
import React from 'react';
import EmailInput from './EmailInput';
import { Form, FormInterface } from '@mongez/react-form';

export default function LoginPage() {
    const performLogin = (e: React.FormEvent, form: FormInterface) => {
        console.log(form.values()); // {email: written-value, password: written-value }
    };

    return (
        <Form collectValuesFromDOM onSubmit={performLogin}>
            <EmailInput name="email" placeholder="Email Address" />
            <br />
            <input type="password" name="password" placeholder="Password" />
            <br />
            <button>Login</button>
        </Form>
    )
}
```

```tsx
// EmailInput.tsx
import React from 'react';
import { FormContext } from '@mongez/react-form';

export default function EmailInput(props) {
    const { form } = React.useContext(FormContext);

    return (
        <input type="email" {...props} />
    )
}
```

> Please note that if there is no `Form` component in the parent tree, then `FormContext` will return **null**.

## useForm Hook

Another way to access form class is to use `useForm` hook.

```tsx
// EmailInput.tsx
import React from 'react';
import { useForm } from '@mongez/react-form';

export default function EmailInput(props) {
    const { form } = useForm();

    return (
        <input type="email" {...props} />
    )
}
```

> Please note that if there is no `Form` component in the parent tree, then `useForm` will return **null**.

## Create a heavy form input

Now let's go more deeper, Let's update our `EmailInput` component using `useFormInput` Hook.

```tsx
// EmailInput.tsx
import React from 'react';
import { useFormInput } from '@mongez/react-form';

export default function EmailInput(props) {
    const { name, id } = useFormInput(props);

  console.log(id, name); // something like el-6BUxp8 email

    return (
        <input type="email" name={name} />
    )
}
```

```tsx
// LoginPage.tsx
import React from 'react';
import EmailInput from './EmailInput';
import { Form, FormInterface } from '@mongez/react-form';

export default function LoginPage() {
    const performLogin = (e: React.FormEvent, form: FormInterface) => {
        //
    };

    return (
        <Form collectValuesFromDOM onSubmit={performLogin}>
            <EmailInput name="email" />
            <br />
            <input type="password" name="password" placeholder="Password" />
            <br />
            <button>Login</button>
        </Form>
    )
}
```

This will automatically register the component to our `Form Class` so we can collect its value from it directly.

## The FormInput Object

Each component uses `useFormInput` hook gets a `RegisteredFormInput` object declared in `formInput` variable.

Let's look at the available props in that object then see why this formInput exists.

```ts
import { RuleResponse } from '@mongez/validator';

type RegisteredFormInput = {
  /**
   * Form input name, it must be unique
   */
  name: string;
  /**
   * Form input id, used as a form input flag determiner
   */
  id: string;
  /**
   * Form input value
   */
  value: any;
  /**
   * Triggered when form is changing disabling / enabling mode
   */
  disable: (isDisabling: boolean) => void;
  /**
   * Triggered when form is changing read only mode
   */
  readOnly: (isReadingOnly: boolean) => void;
  /**
   * Triggered when form is changing a value to the form input
   */
  changeValue: (newValue: any) => void;
  /**
   * Triggered when form input value is changed
   */
  onChange?: (newValue: any) => void;
  /**
   * Triggered when form starts validation
   */
  validate: (newValue?: string) => RuleResponse | null;
  /**
   * Set form input error
   */
  setError: (error: RuleResponse) => void;
  /**
   * Determine whether the form input is valid, this is checked after calling the validate method
   */
  isValid: boolean;
  /**
   * Determine whether form input is disabled
   */
  isDisabled: boolean;
  /**
   * Determine whether form input is in read only state
   */
  isReadOnly: boolean;
  /**
   * Triggered when form resets its values
   */
  reset: () => void;
  /**
   * Form Input Error
   */
  error: RuleResponse | null;
};
```

The main responsibility for the form input is to be registered in Form Class, so form can communicate with this component.

We'll see more details through the rest of the documentation.

### The id attribute

In this example, we used `useFormInput` and return an object that has `name` and `id` props, but why did `id` prop is returned?

`useFormInput` wil generate a unique id for the component if no `id` prop is passed, which will be something like `el-aW313EDq`.

## The name attribute

But why to get the name from `useFormInput` rather than getting it from `props` object directly?

`useFormInput` will manipulate the name if passed to the component props as it allows using `dot.notation` syntax.

> Behind the scenes, this is handled using [toInputName](https://github.com/hassanzohdy/reinforcements#to-input-name) utility in **Mongez Reinforcements**.

```tsx
// LoginPage.tsx
import React from 'react';
import EmailInput from './EmailInput';
import { Form, FormInterface } from '@mongez/react-form';

export default function LoginPage() {
    const performLogin = (e: React.FormEvent, form: FormInterface) => {
        //
    };

    return (
        <Form collectValuesFromDOM onSubmit={performLogin}>
            <EmailInput name="user.email" />
            <br />
            <input type="password" name="password" placeholder="Password" />
            <br />
            <button>Login</button>
        </Form>
    )
}
```

The email input will be changed into `user[name]` which is a more standard name attribute.

### Controlled Vs Uncontrolled Component

`useFormInput` allows you to use both types of components, however, there will other feature that comes with both types, the value validation.

Uncontrolled Component

```tsx
// LoginPage.tsx
import React from 'react';
import EmailInput from './EmailInput';
import { Form, FormInterface } from '@mongez/react-form';

export default function LoginPage() {
    const performLogin = (e: React.FormEvent, form: FormInterface) => {
        //
    };

    return (
        <Form collectValuesFromDOM onSubmit={performLogin}>
            <EmailInput name="email" defaultValue="Initial Email Value" />
            <br />
            <input type="password" name="password" placeholder="Password" />
            <br />
            <button>Login</button>
        </Form>
    )
}
```

Controlled Component

```tsx
// LoginPage.tsx
import React from 'react';
import EmailInput from './EmailInput';
import { Form, FormInterface } from '@mongez/react-form';

export default function LoginPage() {
    const [email, setEmail] = React.useState('');

    const performLogin = (e: React.FormEvent, form: FormInterface) => {
        //
    };

    return (
        <Form collectValuesFromDOM onSubmit={performLogin}>
            <EmailInput name="email" value={email} onChange={e => setEmail(e.target.value)} />
            <br />
            <input type="password" name="password" placeholder="Password" />
            <br />
            <button>Login</button>
        </Form>
    )
}
```

## Input Validation

Let's get to the heavy part, the input validation, yet it is very simple.

```tsx
// EmailInput.tsx
import React from 'react';
import { useFormInput } from '@mongez/react-form';
import { emailRule, requiredRule } from '@mongez/validator';

const rules = [requiredRule, emailRule];

const defaultProps = {
    rules,
    type: "email", // required for emailRule
};

export default function EmailInput(props) {    
    const {name, error, id } = useFormInput(props, defaultProps);

    return (
        <input type="email" name={name} />
    )
}
```

Hold on, what was that?

OK let me tell you what's going on here.

First of all, **Mongez React Form** uses [Mongez Validator](https://github.com/hassanzohdy/mongez-validator) for validation.

Next we defined our rules list, which are required and email rules, this will validate the input value each time the user types anything against these two rules.

Furthermore, we defined a `defaultProps` object which is accepted by `useFormInput` hook, that if there is no `rules` prop passed in the props then it will be taken from `defaultProps`.

But for the previous snippet, nothing much will happen as we didn't pass the `onChange` and `value` props to the input element.

```tsx
// EmailInput.tsx
import React from 'react';
import { useFormInput } from '@mongez/react-form';
import { emailRule, requiredRule } from '@mongez/validator';

const rules = [requiredRule, emailRule];

const defaultProps = {
    rules,
    type: "email", // required for emailRule
};

export default function EmailInput(props) {    
    const {name, error, value, onChange } = useFormInput(props, defaultProps);

    return (
        <input type="email" value={value} onChange={onChange} name={name} />
    )
}
```

So far the only rule that will be applied is `emailRule` as it validates only if the user inputs some text.

Let's tell the validator to check for the input that should have a value.

```tsx
// LoginPage.tsx
import React from 'react';
import EmailInput from './EmailInput';
import { Form, FormInterface } from '@mongez/react-form';

export default function LoginPage() {
    const performLogin = (e: React.FormEvent, form: FormInterface) => {
        //
    };

    return (
        <Form collectValuesFromDOM onSubmit={performLogin}>
            <EmailInput name="email" required />
            <br />
            <input type="password" name="password" placeholder="Password" />
            <br />
            <button>Login</button>
        </Form>
    )
}
```

We passed `required` prop, then the `requiredRule` now will work.

```tsx
// EmailInput.tsx
import React from 'react';
import { useFormInput } from '@mongez/react-form';
import { emailRule, requiredRule } from '@mongez/validator';

const rules = [requiredRule, emailRule];

const defaultProps = {
    rules,
    type: "email", // required for emailRule
};

export default function EmailInput(props) {    
    const {name, error, value, onChange } = useFormInput(props, defaultProps);

    console.log(error); // null for first render

    return (
        <input type="email" value={value} onChange={onChange} name={name} />
    )
}
```

Now when the user types anything, the error key will return A rule Response error, just type anything and see the console.

### Display error message

Now let's display our error message in the dom.

```tsx
// EmailInput.tsx
import React from 'react';
import { useFormInput } from '@mongez/react-form';
import { emailRule, requiredRule } from '@mongez/validator';

const rules = [requiredRule, emailRule];

const defaultProps = {
    rules,
    type: "email", // required for emailRule
};

export default function EmailInput(props) {    
    const {name, error, value, onChange } = useFormInput(props, defaultProps);

    return (
        <>
        <input type="email" value={value} onChange={onChange} name={name} />

        {error && 
            <span>{error.errorMessage}</span>
        }
        </>
    )
}
```

## Manually validating component

You may also validate the component manually instead of using the rules.

```tsx
// EmailInput.tsx
import React from 'react';
import Is from '@mongez/supportive-is';
import { useFormInput } from '@mongez/react-form';

export default function EmailInput(props) {
    const {name, setValue, value, error, setError } = useFormInput(props);

    const onChange = e => {
        const newValue = e.target.value;
        if (! newValue) {
            setError({
                hasError: true,
                errorType: 'required',
                errorMessage: 'This input is required',
            });
        } else if (! Is.email(newValue)) {
            setError({
                hasError: true,
                errorType: 'email',
                errorMessage: 'Invalid Email Address',
            });
        } else {
            setError(null);
        }

        setValue(newValue);
    }

    return (
        <>
        <input type="email" value={value} onChange={onChange} name={name} />

        {error && 
            <span>{error.errorMessage}</span>
        }
        </>
    )
}
```

In our previous example, we got introduced two new methods, `setValue` and `setError`, these methods are used to set the component value and error respectively.

`setError` function accepts `null` for no errors and `RuleResponse` from [Mongez Validator]([https://g](https://github.com/hassanzohdy/mongez-validator)) for displaying an error.

> It's recommended to use rules instead, this will make your code cleaner and easier to maintain.

## The onError prop

Now you may detect if the component catches an error from the its own rules using `onError`

```tsx
// EmailInput.tsx
import React from 'react';
import { emailRule } from "@mongez/validator";
import { useFormInput } from '@mongez/react-form';

const defaultProps = {
  rules: [emailRule],
  type: "email",
};

export default function EmailInput(props) {
    const {name, value, error, onChange } = useFormInput(props);

    return (
        <>
        <input type="email" value={value} onChange={onChange} name={name} />

        {error && 
            <span>{error.errorMessage}</span>
        }
        </>
    )
}
```

```tsx
// LoginPage.tsx
import React from 'react';
import EmailInput from './EmailInput';
import { RuleResponse } from '@mongez/validator';
import { Form, FormInterface, RegisteredFormInput } from '@mongez/react-form';

export default function LoginPage() {
    const performLogin = (e: React.FormEvent, form: FormInterface) => {
        //
    };

    const onError = (error: RuleResponse, formInput: RegisteredFormInput) => {
        console.log(error); // will be triggered only if there is an error
    }

    return (
        <Form collectValuesFromDOM onSubmit={performLogin}>
            <EmailInput name="email" onError={onError} required />
            <br />
            <input type="password" name="password" placeholder="Password" />
            <br />
            <button>Login</button>
        </Form>
    )
}
```


## TODO

- Complete Docs
