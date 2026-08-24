import { AbstractControl, ValidatorFn, ValidationErrors } from '@angular/forms';

/**
 * Validator that rejects empty strings or strings containing only whitespace characters.
 * Returns `{ whitespaceOnly: true }` error or null.
 */
export function noWhitespaceOnlyValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { whitespaceOnly: true };
  }
  return null;
}

/**
 * Validator factory that validates minimum array length for multi-select controls.
 * Returns `{ minArrayLength: { min, actual } }` error or null.
 */
export function minArrayLength(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    const actual = Array.isArray(value) ? value.length : 0;
    if (actual < min) {
      return { minArrayLength: { min, actual } };
    }
    return null;
  };
}

/**
 * Validator factory that validates maximum array length for multi-select controls.
 * Returns `{ maxArrayLength: { max, actual } }` error or null.
 */
export function maxArrayLength(max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    const actual = Array.isArray(value) ? value.length : 0;
    if (actual > max) {
      return { maxArrayLength: { max, actual } };
    }
    return null;
  };
}
