# Change Log

## V3.0.0 (25 Aug 2024)

- Introduced new hook [useRadioInput](./README.md#useRadioInput)
- extracted validation translation objects to separate objects (needs to be imported manually)
- Enhanced `useFormControl` performance, reduced unnecessary re-renders
- Added `isInvalid` prop to `useFormControl` hook return output
- Allowed validation rules to be all executed or fails on first error
- New `errorsList` object is returned from `useFormControl` hook to return each rule with its rule name and error message
- Form component now can accept [defaultValue Object](./README.md#formDefaultValue) to initialize value for form fields
- New Structure for [validation rules](./README.md#validation-rules) to be more readable and maintainable
- Validation rules now can be synced and `async` functions

## V2.1.0 (05 Nov 2023)

- Added `isDirty` to form control.
- Added `isTouched` to form control.

## V2.0.0 (05 Mar 2023)

- Refactored code
- Replaced `useFormInput` with `useFormControl`
- Changed `onSubmit` callback options.
- Added `useSubmitButton` hook.
- Validation rules are now internally added in the package.
- Added `English` `Arabic` `French` `Italian` and `Spanish` translations.

## V1.5.25 (13 Nov 2022)

- Feat: when `validating` trigger callbacks returns `false` then the form will be marked as invalid and won't be submitted.

## V1.5.20 (06 Nov 2022)

- Added `formControl.element` to get the form control element.
- Added `formControl.isChecked` to check if the form control is checked or not.
- Added `formControl.blur` to blur the form control.
- Added `formControl.isHidden` to check if the form control is hidden or not.

## V 1.5.12 (17 Aug 2022)

- Added `checkIfIsValid` method to form interface

## V 1.5.11 (17 Aug 2022)

- Fixed form `validControls` and `invalidControls` validation events trigger.

## V 1.5.3 (12 July 2022)

- Fixed form control reset value.

## V 1.5.2 (12 July 2022)

- Fixed form submission.

## V 1.5.1 (12 July 2022)

- Fixed exclude props.

## V 1.5.0 (12 July 2022)

- Added Active Forms.
- Fixed some bugs.

## V 1.4.0 (09 July 2022)

- Added `validate` prop to form control.
- Added `errors` prop to form control.

## V 1.3.0 (03 July 2022)

- Added Form Control Events.

## V 1.2.4 (18 Jun 2022)

- Fixed form input registering.

## V 1.2.3 (18 Jun 2022)

- Fixed `disable` method.

## V 1.2.2 (17 Jun 2022)

- Fixed `each` method.

## V 1.2.1 (15 Jun 2022)

- `validate` and `validateVisible` methods return the validated form controls.

## V 1.2.0 (15 Jun 2022)

- Fixed `validate` method to allow calling it without any parameters.
- Added validateVisible method

## V 1.1.0 (16 May 2022)

- Added `change` form event.
- Added Dirty Form Controls.
- Added useFormEvent Hook

## V 1.0.11 (04 Mar 2022)

- Fixed Bugs

## V 1.0.7 (26 Jan 2022)

- Fixed Filtering form controls in `each` method.
