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
  - [Validating onBlur instead of onChange](#validating-onblur-instead-of-onchange)
  - [Manually validate the form](#manually-validate-the-form)
  - [Validating only certain inputs](#validating-only-certain-inputs)
  - [Manually registering form control](#manually-registering-form-control)
  - [Manually submitting form](#manually-submitting-form)
  - [Reset Form](#reset-form)
  - [Disable Form elements](#disable-form-elements)
  - [Mark form elements as readOnly](#mark-form-elements-as-readonly)
  - [Form Serializers](#form-serializers)
    - [Getting all form values](#getting-all-form-values)
    - [Getting form values as query string](#getting-form-values-as-query-string)
    - [Getting form values as JSON](#getting-form-values-as-json)
  - [Getting form control](#getting-form-control)
  - [Getting form controls list](#getting-form-controls-list)
  - [Control Modes And Control Types](#control-modes-and-control-types)
  - [Defining form control mode and control type](#defining-form-control-mode-and-control-type)
  - [Getting controls based on its control type](#getting-controls-based-on-its-control-type)
  - [Executing operation on form controls](#executing-operation-on-form-controls)
  - [More Form Hooks](#more-form-hooks)
    - [Use input value hook](#use-input-value-hook)
    - [Use Id Hook](#use-id-hook)
    - [Use Name Hook](#use-name-hook)
  - [Form Events](#form-events)
  - [Change Log](#change-log)
  - [TODO](#todo)

## Installation

`yarn add @mongez/react-form`

Or

`npm i @mongez/react-form`

## Usage

For form validation messages, do not forget to import your locale validation object into Mongez Localization.

```ts
import { enTranslation } from '@mongez/validator';
import { extend } from '@mongez/localization';

extend('en', enTranslation);
```

Please check [Validation Messages Section](https://github.com/hassanzohdy/mongez-validator#validation-messages) which contains all available locales and current available rules list.

Now, Let's start with our main component, the `Form` component.

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

Each component uses `useFormInput` hook gets a `FormControl` object declared in `formInput` variable.

Let's look at the available props in that object then see why this formInput exists.

```ts
import { RuleResponse } from '@mongez/validator';

type FormControl = {
  /**
   * Form input name, it must be unique
   */
  name: string;
  /**
   * Form control mode
   */
  control: ControlMode;
  /**
   * Form control type
   */
  type: ControlType;
  /**
   * Form input id, used as a form input flag determiner
   */
  id?: string;
  /**
   * Form input value
   */
  value?: any;
  /**
   * Triggered when form is changing disabling / enabling mode
   */
  disable?: (isDisabling: boolean) => void;
  /**
   * Triggered when form is changing read only mode
   */
  readOnly?: (isReadingOnly: boolean) => void;
  /**
   * Triggered when form is changing a value to the form input
   */
  changeValue?: (newValue: any) => void;
  /**
   * Triggered when form input value is changed
   */
  onChange?: (newValue: any) => void;
  /**
   * Triggered when form starts validation
   */
  validate?: (newValue?: string) => RuleResponse | null;
  /**
   * Set form input error
   */
  setError?: (error: RuleResponse) => void;
  /**
   * Determine whether the form input is valid, this is checked after calling the validate method
   */
  isValid?: boolean;
  /**
   * Determine whether form input is disabled
   */
  isDisabled?: boolean;
  /**
   * Determine whether form input is in read only state
   */
  isReadOnly?: boolean;
  /**
   * Triggered when form resets its values
   */
  reset?: () => void;
  /**
   * Form Input Error
   */
  error?: RuleResponse | null;
  /**
   * Props list to this component
   */
  props?: any;
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
    const {name, error,  id } = useFormInput(props);
    
    console.log(error);

    return (
        <input type="email" name={name} />
    )
}

EmailInput.defaultProps = defaultProps;
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
    const {name, error, value, onChange } = useFormInput(props);

    return (
        <input type="email" value={value} onChange={onChange} name={name} />
    )
}

EmailInput.defaultProps = defaultProps;
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
    const {name, error, value, onChange } = useFormInput(props);

    console.log(error); // null for first render

    return (
        <input type="email" value={value} onChange={onChange} name={name} />
    )
}

EmailInput.defaultProps = defaultProps;
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
    const {name, error, value, onChange } = useFormInput(props);

    return (
        <>
        <input type="email" value={value} onChange={onChange} name={name} />

        {error && 
            <span>{error.errorMessage}</span>
        }
        </>
    )
}

EmailInput.defaultProps = defaultProps;
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

EmailInput.defaultProps = defaultProps;
```

```tsx
// LoginPage.tsx
import React from 'react';
import EmailInput from './EmailInput';
import { RuleResponse } from '@mongez/validator';
import { Form, FormInterface, FormControl } from '@mongez/react-form';

export default function LoginPage() {
    const performLogin = (e: React.FormEvent, form: FormInterface) => {
        //
    };

    const onError = (error: RuleResponse, formInput: FormControl) => {
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

## Validating onBlur instead of onChange

By default, the validation occurs on `onChange` prop, but you may set it on `onBlur` event instead using `validateOn` prop.

```tsx
// LoginPage.tsx
import React from 'react';
import EmailInput from './EmailInput';
import { RuleResponse } from '@mongez/validator';
import { Form, FormInterface, FormControl } from '@mongez/react-form';

export default function LoginPage() {
    const performLogin = (e: React.FormEvent, form: FormInterface) => {
        //
    };

    const onError = (error: RuleResponse, formInput: FormControl) => {
        console.log(error); // will be triggered only if there is an error
    }

    return (
        <Form collectValuesFromDOM onSubmit={performLogin}>
            <EmailInput validateOn="blur" name="email" onError={onError} required />
            <br />
            <input type="password" name="password" placeholder="Password" />
            <br />
            <button>Login</button>
        </Form>
    )
}
```

> Accepted values: `change` | `blur`, default is `change`

## Manually validate the form

We can also trigger form validation using `form.validate()` method.

```tsx
// LoginPage.tsx
import React from 'react';
import EmailInput from './EmailInput';
import { RuleResponse } from '@mongez/validator';
import { Form, FormInterface, FormControl } from '@mongez/react-form';

export default function LoginPage() {
    const form = React.useRef();

    React.useEffect(() => {
        setTimeout(() => {
            form.current.validate();
        }, 2000);
    }, []);

    const performLogin = (e: React.FormEvent, form: FormInterface) => {
        //
    };

    return (
        <Form ref={form} collectValuesFromDOM onSubmit={performLogin}>
            <EmailInput validateOn="blur" name="email" required />
            <br />
            <input type="password" name="password" placeholder="Password" />
            <br />
            <button>Login</button>
        </Form>
    )
}
```

The previous example will trigger form validation after two seconds from component rendering.

## Validating only certain inputs

In some situations we need to validate only certain inputs, for example when working with form wizards or steppers, just pass an array of names to `form.validate`.

> Please note this won't work with native DOM inputs as it must be registered in the form as form control.

```tsx
// LoginPage.tsx
import React from 'react';
import EmailInput from './EmailInput';
import { RuleResponse } from '@mongez/validator';
import { Form, FormInterface, FormControl } from '@mongez/react-form';

export default function LoginPage() {
    const form = React.useRef();

    const performLogin = (e: React.FormEvent, form: FormInterface) => {
        //
    };

    const validateEmail = () => {
        form.current.validate(['email']);
    }

    return (
        <Form ref={form} collectValuesFromDOM onSubmit={performLogin}>
            <EmailInput validateOn="blur" name="email" required />
            <br />
            <input type="password" name="password" placeholder="Password" />
            <br />
            <button>Login</button>
            <button type="button" onCLick={validateEmail}>Validate Email Only </button>
        </Form>
    )
}
```

## Manually registering form control

We used `useFormInput` for handling many cases along with registering to the form, in some cases we might only need to register our component to the form without any additional helpers such as name dot notation or auto generating id if not passed.

```tsx
// PasswordInput.tsx

import React from 'react';
import { emailRule } from "@mongez/validator";
import { useForm } from '@mongez/react-form';

export default function PasswordInput({defaultValue, value, onChange, ...otherProps}) {
    const [internalValue, setValue] = React.useState(value || defaultValue);
    const formContext = useForm();

    React.useEffect(() => {
        const { form } = formContext;

        form.register({
            name: props.name,
            value: internalValue,
            id: props.id,
            control: 'input',
            changeValue: newValue => {
                setValue(newValue)
            },
            reset: () => {
                setValue('')
            },

        });
    }, []);

    return (
        <>
        <input type="password" value={value} onChange={onChange} name={name} />

        {error && 
            <span>{error.errorMessage}</span>
        }
        </>
    )
}
```

## Manually submitting form

Form can be submitted as well directly using `form.submit` method.

```tsx
// LoginPage.tsx
import React from 'react';
import EmailInput from './EmailInput';
import { RuleResponse } from '@mongez/validator';
import { Form, FormInterface, FormControl } from '@mongez/react-form';

export default function LoginPage() {
    const form = React.useRef();

    const performLogin = (e: React.FormEvent, form: FormInterface) => {
        // triggered from the useEffect hook        
    };

    React.useEffect(() => {
        setTimeout(() => {
            form.current.submit();
        }, 2000);
    }, []);

    return (
        <Form ref={form} onSubmit={performLogin}>
            <EmailInput validateOn="blur" name="email" required />
            <br />
            <input type="password" name="password" placeholder="Password" />
            <br />
            <button>Login</button>
        </Form>
    )
}
```

## Reset Form

To reset the form values, states, and changes, alongside with all registered form controls, we can use `form.reset()` method.

`form.reset(formControlNames: string[]): FormControl[]`

```tsx
// LoginPage.tsx
import React from 'react';
import EmailInput from './EmailInput';
import { RuleResponse } from '@mongez/validator';
import { Form, FormInterface, FormControl } from '@mongez/react-form';

export default function LoginPage() {
    const form = React.useRef();
    const performLogin = (e: React.FormEvent, form: FormInterface) => {
        //
    };

    const resetForm = () => {
        form.current.reset();
    }

    return (
        <Form ref={form} collectValuesFromDOM onSubmit={performLogin}>
            <EmailInput validateOn="blur" name="email" required />
            <br />
            <input type="password" name="password" placeholder="Password" />
            <br />
            <button>Login</button>
            <button type="button" onClick={resetForm}>Reset<button>
        </Form>
    )
}
```

Or event better, You may also use `ResetFormButton` component for shortage.

```tsx
// LoginPage.tsx
import React from 'react';
import EmailInput from './EmailInput';
import { RuleResponse } from '@mongez/validator';
import { Form, ResetFormButton, FormInterface, FormControl } from '@mongez/react-form';

export default function LoginPage() {
    const form = React.useRef();
    const performLogin = (e: React.FormEvent, form: FormInterface) => {
        //
    };

    return (
        <Form ref={form} collectValuesFromDOM onSubmit={performLogin}>
            <EmailInput validateOn="blur" name="email" required />
            <br />
            <input type="password" name="password" placeholder="Password" />
            <br />
            <button>Login</button>
            <ResetFormButton>Reset<ResetFormButton>
        </Form>
    )
}
```

You may also set what inputs to be reset only by passing the input name to **reset** method.

```tsx
const resetForm = () => {
    form.current.reset(['email', 'username']);
}
```

If using `ResetFormButton` component then pass it as an array `resetOnly`

```tsx

<ResetFormButton resetOnly={['email', 'username']}>Reset<ResetFormButton>
```

## Disable Form elements

We can also disable all registered form inputs to be disabled.

`form.disable(isDisabled: boolean, formControlNames: string[] = []): void`

```tsx
// LoginPage.tsx
import React from 'react';
import EmailInput from './EmailInput';
import { RuleResponse } from '@mongez/validator';
import { Form, FormInterface, FormControl } from '@mongez/react-form';
import { login } from './../services/auth';

export default function LoginPage() {
    const performLogin = (e: React.FormEvent, form: FormInterface) => {
        //
        form.disable(); // disable
        // send ajax request
        login(form.values()).then(response => {

        }).catch(error => {
            console.log(error.response.data.error);
            form.disable(false);
        });
    };

    return (
        <Form ref={form} collectValuesFromDOM onSubmit={performLogin}>
            <EmailInput validateOn="blur" name="email" required />
            <br />
            <input type="password" name="password" placeholder="Password" />
            <br />
            <button>Login</button>
        </Form>
    )
}
```

You may also use `form.enable` as an alias to `form.disable(false)`.

## Mark form elements as readOnly

This can be achieved using `form.readOnly()` method/

`form.readOnly(isReadOnly: boolean = true, formControlNames: string[] = []): void`

```tsx
// LoginPage.tsx
import React from 'react';
import EmailInput from './EmailInput';
import { RuleResponse } from '@mongez/validator';
import { Form, FormInterface, FormControl } from '@mongez/react-form';
import { login } from './../services/auth';

export default function LoginPage() {
    const performLogin = (e: React.FormEvent, form: FormInterface) => {
        //
        form.readOnly(); // all inputs are considered to be readOnly now
        // send ajax request
        login(form.values()).then(response => {

        }).catch(error => {
            console.log(error.response.data.error);
            form.readOnly(false);
        });
    };

    return (
        <Form ref={form} collectValuesFromDOM onSubmit={performLogin}>
            <EmailInput validateOn="blur" name="email" required />
            <br />
            <input type="password" name="password" placeholder="Password" />
            <br />
            <button>Login</button>
        </Form>
    )
}
```

## Form Serializers

Another powered feature is that you can get form control values in variant ways using form serializers methods.

- [form.values()](#getting-all-form-values) Getting all values as object.
- [form.toJSON()](#getting-form-values-as-json) Getting all values as JSON.
- [form.toQueryString()](#getting-form-values-as-query-string) Getting all values as query string.

### Getting all form values

We can get all form values either from registered form controls or from the dom directly using `form.values()`, it returns an object, the key is the form control name and the value is its corresponding value.

`form.values(formControlNames: string[] = []): object`

```ts
const formValues = form.values();
// or 
const formValues = form.toObject();
```

> Please keep in mind that if `collectValuesFromDOM` prop is enabled, then the DOM input values will be merged with values coming from registered form controls.

`form.toObject()` is an alias to `form.values()`

### Getting form values as query string

This method returns a string in a query string format using [query-string package](https://www.npmjs.com/package/query-string).

`form.toQueryString(formControlNames: string[] = []): string`

```ts
const formValues: string = form.toQueryString();
```

Serializing Only certain form controls

```ts
const formValues: string = form.toQueryString(['email', 'password']);
```

> `form.toString()` is an alias to this method.

### Getting form values as JSON

This can be done using `toJSON` method.

`form.toJSON(formControlNames: string[] = []): string`

```ts
const formValues: string = form.toJSON();
```

To get only json string to certain form controls, pass an array of form controls to the method.

```ts
const formValues: string = form.toJSON(['email', 'password']);
```

## Getting form control

You may get a direct access to any registered form control either by form control name or by its id.

`form.control(value: string, searchIn: "name" | "id" | "control" = "name"): FormControl | null`

```js
// getting the input by the name
const usernameInput: FormControl = form.control('username');

// or getting it by the id
const passwordInput: FormControl = form.control('password-id', 'id');
```

If there is no matching value for that control, `null` will be returned instead.

## Getting form controls list

We can get all registered form controls using `form.controls()`

```ts
const formControls = form.controls();
```

You may also getting controls for the given names only

```ts
const formControls = form.controls(['email', 'password']);
```

## Control Modes And Control Types

Each form control has two main attributes, `control` and `type`.

All inputs regardless its type or shape is considered to be a `input` control.
All button regardless its type is considered to be a `button` control.

```ts
type ControlMode = 'input' | 'button';
```

The input attribute value is a more specific, it can be one of the following types.

```ts
type ControlType =
  | "text"
  | "email"
  | "checkbox"
  | "radio"
  | "number"
  | "password"
  | "hidden"
  | "date"
  | "time"
  | "dateTime"
  | "color"
  | "range"
  | "search"
  | "tel"
  | "url"
  | "week"
  | "select"
  | "autocomplete"
  | "file"
  | "image"
  | "button"
  | "reset"
  | "submit";
```

When registering new form, the `control` key must be provided and `input` key as well.

## Defining form control mode and control type

Each registered form control has a `control`, by default it is `input`, you may assign the form control type yourself by setting `control` attribute in form control object.

> `useFormInput` hook is registering the control type as `input`, you may override it by passing `control` key in the passed props.

```tsx
// PasswordInput.tsx

import React from 'react';
import { emailRule } from "@mongez/validator";
import { useForm } from '@mongez/react-form';

export default function PasswordInput({defaultValue, value, onChange, ...otherProps}) {
    const [internalValue, setValue] = React.useState(value || defaultValue);
    const formContext = useForm();

    React.useEffect(() => {
        const { form } = formContext;

        form.register({
            name: props.name,
            value: internalValue,
            id: props.id,
            control: 'input',
            type: 'password',
            changeValue: newValue => {
                setValue(newValue)
            },
            reset: () => {
                setValue('')
            },

        });
    }, []);

    return (
        <>
        <input type="password" value={value} onChange={onChange} name={name} />

        {error && 
            <span>{error.errorMessage}</span>
        }
        </>
    )
}
```

This can be useful to filter controls based on their types.

## Getting controls based on its control type

To list all controls based on its type, use `controlsOf` method.

```ts
const inputControls = form.controlsOf('input');
```

To get only `email` inputs, pass second argument as the input type

```ts
const emailControls = form.controlsOf('input', 'email');
```

You may also use another shorthand method `form.inputs(type: ControlType): FormControl[]`

```ts
const inputControls = form.inputs();
const emailControls = form.inputs('email');
```

Same as well with buttons

```ts
const buttons = form.buttons();
const submitButtons = form.buttons('submit');
```

## Executing operation on form controls

We saw that we can get our controls all or part of list using `form.controls`, we can also perform an operation on controls directly using `each` method.

`form.each(callback: (formControl: FormControl) => void, formControlNames: string[]): FormControl[]`

```ts
form.each(formControl => {
    formControl.reset();
})

```

You may also do it on certain inputs by passing array of control names as second argument.

```ts
form.each(formControl => {
    formControl.reset();
}, ['email', 'password']);
```

## More Form Hooks

Another useful hooks that can be used independently in your project.

- [useInputValue Hook](#use-input-value-hook)
- [useId Hook](#use-id-hook)
- [useName Hook](#use-name-hook)

### Use input value hook

This hook is very simple, interacts as a `React.useState` hook but with a twist, it automatically detects the input value and update the state directly.

`useInputValue<T>(initial): [value: T, setValue: React.SetStateAction<T>]`

Before

```tsx
import React from 'react';

export default function MyComponent() {
    const [value, setValue] = React.useState('');

    const onChange = e => {
        setValue(e.target.value);
    }

    return (
        <input onChange={onChange} value={value} />
    )
}
```

After

```tsx
import React from 'react';
import { useInputValue } from '@mongez/react-form';

export default function MyComponent() {
    const [value, setValue] = useInputValue('');

    return (
        <input onChange={setValue} value={value} />
    )
}
```

It can work with almost any `onChange` event either in the native input elements or components from UI Frameworks like Material UI, Semantic UI, Ant Design and so on.

### Use Id Hook

The `useId` hook allows you to get a generated valid html id if the `id` prop is not passed.

```tsx
import React from 'react';
import { useId } from '@mongez/react-form';

export default function MyComponent(props) {
    const id = useId(props);

    return (
        <input {...props} id={id} />
    )
}

<MyComponent /> // <input id="id-fw4Ar23" />
<MyComponent id="password-id" /> // <input id="password-id" />
```

### Use Name Hook

The `useName` hook allows you to get convert a `dot.notation` name syntax to more standard name.

```tsx
import React from 'react';
import { useName } from '@mongez/react-form';

export default function MyComponent(props) {
    const name = useName(props);

    return (
        <input {...props} name={name} />
    )
}

<MyComponent id="name" /> // <input name="name" />
<MyComponent id="name.first" /> // <input name="name[first]" />
```

## Form Events

The form is shipped with multiple events types that can be listened to from.

```tsx
// LoginPage.tsx
import React from 'react';
import { EventSubscription } from '@mongez/events';
import EmailInput from './EmailInput';
import { RuleResponse } from '@mongez/validator';
import { Form, FormInterface, FormControl } from '@mongez/react-form';

export default function LoginPage() {
    const form = React.useRef();
    React.useEffect(() => {
        if (! form || ! form.current) return;

        const subscription: EventSubscription = form.current.on('validating', () => {
            // do something before form start validating on form submission
        });

        return () => subscription.unsubscribe();
    }, []);

    const performLogin = (e: React.FormEvent, form: FormInterface) => {
        //
    };

    return (
        <Form ref={form} collectValuesFromDOM onSubmit={performLogin}>
            <EmailInput validateOn="blur" name="email" required />
            <br />
            <input type="password" name="password" placeholder="Password" />
            <br />
            <button>Login</button>
        </Form>
    )
}
```

Here is the available list events

1- `validating`: Triggered before form validation.

```ts
form.on('validating', (formControlNames: string[], form) => {
    // do something
});
```

2- `validation`: Triggered after form validation, the first argument is the form controls that have been validated.

> Please note that this event is triggered after calling `onError` if passed to the **Form** component.

```ts
form.on('validation', (validatedInputs: FormControl[], form) => {
    // do something
});
```

3- `disabling`: Triggered before disabling/enabling form using `form.disable()`

```ts
form.on('disabling', (isDisabled: boolean, oldDisabledState: boolean, formControlNames: string[]) => {
    // do something
});
```

4- `disable`: Triggered after disabling/enabling form using `form.disable()`

```ts
form.on('disable', (isDisabled: boolean, oldDisabledState: boolean, formControls: FormControl[]) => {
    // do something
});
```

5- `resetting`: Triggered before resetting form using `form.reset()`

> If the **reset** method is called without any arguments, then `formControlNames` will be an empty array.

```ts
form.on('resetting', (formControlNames: string[], form) => {
    // do something
});
```

6- `reset`: Triggered after resetting form using `form.reset()`

> If the **reset** method is called without any arguments, then `formControls` will be the entire registered form controls.

```ts
form.on('resetting', (formControls: FormControl[], form) => {
    // do something
});
```

7- `submitting`: Triggered before form submission using either on normal form submission or using `form.submit()` method.

> Please note that `submitting` event is triggered before `validating` event.

```ts
form.on('submitting', (e: React.FormEvent, form) => {
    // do something
});
```

7- `submit`: Triggered after form submission using either on normal form submission or using `form.submit()` method.

> Please note that `submit` event is triggered only if form is valid otherwise it won't be triggered.
> The `submit` event is triggered after calling `onSubmit` either it is set or not.

```ts
form.on('submit', (e: React.FormEvent, form) => {
    // do something
});
```

8- `registering`: Triggered before registering form input to the form.

```ts
form.on('registering', (formInput: FormControl, form) => {
    // do something
});
```

9- `register`: Triggered after registering form input to the form.

```ts
form.on('register', (formInput: FormControl, form) => {
    // do something
});
```

10- `unregistering`: Triggered before removing form input from the form.

```ts
form.on('unregistering', (formInput: FormControl, form) => {
    // do something
});
```

10- `unregister`: Triggered after removing form input from the form.

```ts
form.on('unregister', (formInput: FormControl, form) => {
    // do something
});
```

11- `serializing`: Triggered before form serializing.

> Please note that it will be triggered twice if serializing is `toQueryString` or `toJSON`.

The `type` argument can be: `object` | `queryString` | `json`.

```ts
form.on('serializing', (type, formControlNames: string[], form) => {
    // do something
});
```

12- `serialize`: Triggered after form serializing.

> Please note that it will be triggered twice if serializing is `toQueryString` or `toJSON`.

The `type` argument can be: `object` | `queryString` | `json`.

```ts
form.on('serialize', (type, values, formControlNames: string[], form) => {
    // do something
});
```

## Change Log

- 1.0.11 (4 Mar 2022)
  - Fixed Bugs
- 1.0.7 (26 Jan 2022)
  - Fixed Filtering form controls in `each` method.
  - Added **component** prop to `ResetFormButton`.
  - Updated `ResetFormButton` props types.

## TODO

- Separate form dom elements `toObject` serializer as configuration.
- Separate form `toQueryString` serializer as configuration.
