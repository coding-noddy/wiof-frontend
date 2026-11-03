import { Directive, ElementRef, HostListener, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Lets a native `<input type="file">` use `formControlName` safely.
 *
 * The admin add/edit pages used `<ion-input type="file">`, which Ionic 8 no
 * longer supports for files. With a plain file input, Angular's default
 * accessor would write the form value into the input, and in edit mode that
 * value is the existing image's name, which browsers refuse to set on a file
 * input (it throws). This accessor reports the chosen file's name to the form
 * on change, exactly like ion-input did, and only ever *clears* the input when
 * the form is reset; the existing image name is kept in the form value, not
 * pushed into the input. The pages read the file itself in their own
 * (change) handlers, as before.
 */
@Directive({
  selector: 'input[type=file][formControlName], input[type=file][formControl]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileInputValueAccessorDirective),
      multi: true
    }
  ]
})
export class FileInputValueAccessorDirective implements ControlValueAccessor {
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private host: ElementRef<HTMLInputElement>) {}

  @HostListener('change')
  handleChange(): void {
    this.onChange(this.host.nativeElement.value);
    this.onTouched();
  }

  @HostListener('blur')
  handleBlur(): void {
    this.onTouched();
  }

  writeValue(value: unknown): void {
    // A file input can only be set to empty by script.
    if (!value) {
      this.host.nativeElement.value = '';
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.host.nativeElement.disabled = isDisabled;
  }
}
