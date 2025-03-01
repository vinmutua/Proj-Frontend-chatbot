import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { SignupData } from '../../interfaces/user.interface';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent implements OnInit {
  signupForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    
    // Monitor form changes
    this.signupForm.valueChanges.pipe(
      debounceTime(300)
    ).subscribe(() => {
      this.logFormState();
    });

    // Monitor status changes
    this.signupForm.statusChanges.pipe(
      debounceTime(300)
    ).subscribe(status => {
      console.log('Form Status Changed:', status);
      console.log('Form Valid:', this.isFormValid());
    });
  }

  private initializeForm(): void {
    this.signupForm = this.fb.group({
      email: ['', [
        Validators.required, 
        Validators.email
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        this.createPasswordStrengthValidator()
      ]],
      confirmPassword: ['', [
        Validators.required
      ]],
      terms: [false, [
        Validators.requiredTrue
      ]]
    }, {
      validators: [this.passwordMatchValidator()]
    });

    // Single subscription for debugging
    this.signupForm.valueChanges.pipe(
      debounceTime(300)
    ).subscribe(() => {
      this.debugValidationState();
    });
  }

  private validateFormState(): void {
    const formState = {
      email: this.signupForm.get('email')?.valid,
      password: this.signupForm.get('password')?.valid,
      confirmPassword: this.signupForm.get('confirmPassword')?.valid,
      terms: this.signupForm.get('terms')?.value,
      passwordsMatch: !this.signupForm.errors?.['passwordMismatch'],
      allValid: this.signupForm.valid
    };

    console.log('Form Validation State:', formState);
  }

  private watchFormChanges(): void {
    this.signupForm.statusChanges.subscribe(status => {
      console.log('Form Status:', status);
      console.log('Form Valid:', this.isFormValid());
      this.debugFormState();
    });
  }

  private debugFormState(): void {
    const state = {
      email: {
        valid: this.signupForm.get('email')?.valid,
        errors: this.signupForm.get('email')?.errors
      },
      password: {
        valid: this.signupForm.get('password')?.valid,
        errors: this.signupForm.get('password')?.errors
      },
      confirmPassword: {
        valid: this.signupForm.get('confirmPassword')?.valid,
        errors: this.signupForm.get('confirmPassword')?.errors
      },
      terms: {
        valid: this.signupForm.get('terms')?.valid,
        value: this.signupForm.get('terms')?.value
      },
      formErrors: this.signupForm.errors,
      isLoading: this.isLoading
    };
    console.log('Form State:', state);
  }

  private logFormState(): void {
    const formState = {
      formValid: this.signupForm.valid,
      controls: {
        email: {
          value: this.signupForm.get('email')?.value,
          valid: this.signupForm.get('email')?.valid,
          errors: this.signupForm.get('email')?.errors,
          touched: this.signupForm.get('email')?.touched
        },
        password: {
          value: this.signupForm.get('password')?.value,
          valid: this.signupForm.get('password')?.valid,
          errors: this.signupForm.get('password')?.errors,
          touched: this.signupForm.get('password')?.touched,
          meetsRequirements: this.checkPasswordRequirements()
        },
        confirmPassword: {
          value: this.signupForm.get('confirmPassword')?.value,
          valid: this.signupForm.get('confirmPassword')?.valid,
          errors: this.signupForm.get('confirmPassword')?.errors,
          matches: this.checkPasswordsMatch()
        },
        terms: {
          value: this.signupForm.get('terms')?.value,
          valid: this.signupForm.get('terms')?.valid
        }
      },
      formErrors: this.signupForm.errors,
      isLoading: this.isLoading
    };
    
    console.log('Form State:', formState);
  }

  private checkPasswordRequirements(): boolean {
    const password = this.signupForm.get('password')?.value;
    if (!password) return false;

    const requirements = {
      hasLowerCase: /[a-z]/.test(password),
      hasUpperCase: /[A-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[@$!%*?&]/.test(password),
      isLongEnough: password.length >= 8
    };

    console.log('Password Requirements Check:', requirements);

    return Object.values(requirements).every(req => req === true);
  }

  private checkPasswordsMatch(): boolean {
    const password = this.signupForm.get('password')?.value;
    const confirmPassword = this.signupForm.get('confirmPassword')?.value;
    const match = password === confirmPassword;
    
    console.log('Passwords Match:', match);
    return match;
  }

  public isFormValid(): boolean {
    return this.signupForm?.valid && !this.isLoading;
  }

  private passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get('password');
      const confirmPassword = control.get('confirmPassword');

      if (!password || !confirmPassword) {
        return null;
      }

      const match = password.value === confirmPassword.value;
      console.log('Password Match Check:', { match, password: password.value, confirm: confirmPassword.value });
      
      return match ? null : { passwordMismatch: true };
    };
  }

  private createPasswordStrengthValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      if (!value) {
        return null;
      }

      const hasUpperCase = /[A-Z]+/.test(value);
      const hasLowerCase = /[a-z]+/.test(value);
      const hasNumeric = /[0-9]+/.test(value);
      const hasSpecialChar = /[@$!%*?&]/.test(value);

      const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar;

      return !passwordValid ? { passwordStrength: true } : null;
    };
  }

  async onSubmit(): Promise<void> {
    console.log('Submit Attempted');
    this.logFormState();

    if (this.signupForm.invalid) {
      console.log('Form Invalid on Submit');
      this.markFormTouched();
      return;
    }

    try {
      this.isLoading = true;
      await this.authService.signup(this.signupForm.value);
      this.successMessage = 'Account created successfully!';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    } catch (error: unknown) {
      this.errorMessage = this.handleError(error);
      console.error('Signup error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private handleError(error: unknown): string {
    if (error instanceof Error) {
      switch (true) {
        case error.message.includes('email-already-in-use'):
          return 'This email is already registered';
        case error.message.includes('invalid-email'):
          return 'Please enter a valid email address';
        case error.message.includes('weak-password'):
          return 'Password must be at least 8 characters with numbers and special characters';
        default:
          return error.message;
      }
    }
    return 'Signup failed. Please try again.';
  }

  private markFormTouched(): void {
    Object.values(this.signupForm.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  async googleSignup(): Promise<void> {
    try {
      this.isLoading = true;
      await this.authService.googleSignIn();
      this.successMessage = 'You have successfully signed up with Google';
      setTimeout(() => {
        this.successMessage = '';
        this.router.navigate(['/dashboard']);
      }, 2000);
    } catch (error: unknown) {
      this.errorMessage = this.handleError(error);
      console.error('Google signup error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  getFieldError(fieldName: string): string {
    const control = this.signupForm.get(fieldName);
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return `${fieldName} is required`;
      if (control.errors['email']) return 'Invalid email format';
      if (control.errors['pattern']) return 'Password does not meet requirements';
      if (control.errors['minlength']) return `Minimum length is ${control.errors['minlength'].requiredLength}`;
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.signupForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }

  private logValidationDetails(): void {
    const password = this.signupForm.get('password')?.value;
    
    const details = {
      passwordRequirements: {
        hasLowerCase: /[a-z]/.test(password),
        hasUpperCase: /[A-Z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecialChar: /[@$!%*?&]/.test(password),
        isLongEnough: password?.length >= 8
      },
      formControls: {
        email: this.signupForm.get('email')?.errors,
        password: this.signupForm.get('password')?.errors,
        confirmPassword: this.signupForm.get('confirmPassword')?.errors,
        terms: this.signupForm.get('terms')?.errors
      },
      formErrors: this.signupForm.errors,
      formValid: this.signupForm.valid,
      formDirty: this.signupForm.dirty,
      formTouched: this.signupForm.touched
    };
  
    console.log('Validation Details:', details);
  }

  private debugFormValidation(): void {
    const state = {
      formValid: this.signupForm.valid,
      formPristine: this.signupForm.pristine,
      formTouched: this.signupForm.touched,
      controls: {
        email: {
          valid: this.signupForm.get('email')?.valid,
          value: this.signupForm.get('email')?.value,
          errors: this.signupForm.get('email')?.errors
        },
        password: {
          valid: this.signupForm.get('password')?.valid,
          value: this.signupForm.get('password')?.value,
          errors: this.signupForm.get('password')?.errors
        },
        confirmPassword: {
          valid: this.signupForm.get('confirmPassword')?.valid,
          value: this.signupForm.get('confirmPassword')?.value,
          errors: this.signupForm.get('confirmPassword')?.errors
        },
        terms: {
          valid: this.signupForm.get('terms')?.valid,
          value: this.signupForm.get('terms')?.value
        }
      },
      formErrors: this.signupForm.errors
    };
    console.log('Form Validation Debug:', state);
  }

  private debugValidationState(): void {
    const email = this.signupForm.get('email');
    const password = this.signupForm.get('password');
    const confirmPassword = this.signupForm.get('confirmPassword');
    const terms = this.signupForm.get('terms');
  
    console.log('Form Validation State:', {
      emailState: {
        value: email?.value,
        valid: email?.valid,
        errors: email?.errors,
        touched: email?.touched
      },
      passwordState: {
        value: password?.value,
        valid: password?.valid,
        errors: password?.errors,
        touched: password?.touched,
        meetsRequirements: this.checkPasswordRequirements()
      },
      confirmPasswordState: {
        value: confirmPassword?.value,
        valid: confirmPassword?.valid,
        errors: confirmPassword?.errors,
        touched: confirmPassword?.touched,
        matches: this.checkPasswordsMatch()
      },
      termsState: {
        value: terms?.value,
        valid: terms?.valid,
        errors: terms?.errors,
        touched: terms?.touched
      },
      formState: {
        valid: this.signupForm.valid,
        dirty: this.signupForm.dirty,
        touched: this.signupForm.touched,
        errors: this.signupForm.errors
      }
    });
  }
}
