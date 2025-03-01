import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent implements OnInit {
  // Form-related properties
  signupForm!: FormGroup;
  isLoading = false;
  
  // Google-related properties
  isGoogleLoading = false;
  
  // Shared properties
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  // ==================
  // Form-related methods
  // ==================
  
  private initializeForm(): void {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        this.createPasswordStrengthValidator()
      ]],
      confirmPassword: ['', [Validators.required]],
      terms: [false, [Validators.requiredTrue]]
    }, {
      validators: [this.passwordMatchValidator()]
    });
  }

  public isFormValid(): boolean {
    return this.signupForm?.valid && !this.isLoading;
  }

  private passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get('password');
      const confirmPassword = control.get('confirmPassword');

      if (!password || !confirmPassword) return null;
      return password.value === confirmPassword.value ? null : { passwordMismatch: true };
    };
  }

  private createPasswordStrengthValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const hasUpperCase = /[A-Z]+/.test(value);
      const hasLowerCase = /[a-z]+/.test(value);
      const hasNumeric = /[0-9]+/.test(value);
      const hasSpecialChar = /[@$!%*?&]/.test(value);

      return hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar ? null : { passwordStrength: true };
    };
  }

  async onSubmit(): Promise<void> {
    if (this.signupForm.invalid || this.isGoogleLoading) {
      Object.values(this.signupForm.controls).forEach(control => control.markAsTouched());
      return;
    }

    try {
      this.isLoading = true;
      this.disableGoogleSignup(true);

      await this.authService.signup(this.signupForm.value);
      this.successMessage = 'Account created successfully!';
      setTimeout(() => this.router.navigate(['/login']), 2000);
    } catch (error: unknown) {
      this.errorMessage = this.handleFormError(error);
    } finally {
      this.isLoading = false;
      this.disableGoogleSignup(false);
    }
  }

  private handleFormError(error: unknown): string {
    if (error instanceof Error) {
      switch (true) {
        case error.message.includes('email-already-in-use'):
          return 'This email is already registered';
        case error.message.includes('invalid-email'):
          return 'Please enter a valid email address';
        case error.message.includes('weak-password'):
          return 'Password must be at least 8 characters with numbers and special characters';
        case error.message.includes('network-error'):
          return 'Network error. Please check your connection';
        default:
          return error.message;
      }
    }
    return 'Signup failed. Please try again.';
  }

  // Form validation helpers
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

  // ==================
  // Google-related methods
  // ==================

  async googleSignup(): Promise<void> {
    try {
      this.isGoogleLoading = true;
      this.signupForm.disable();  // Disables all form controls

      await this.authService.googleSignIn();
      this.successMessage = 'Successfully signed up with Google!';
      setTimeout(() => {
        this.successMessage = '';
        this.router.navigate(['/dashboard']);
      }, 2000);
    } catch (error: unknown) {
      this.errorMessage = this.handleGoogleError(error);
    } finally {
      this.isGoogleLoading = false;
      this.signupForm.enable();  // Re-enables all form controls
    }
  }

  private handleGoogleError(error: unknown): string {
    if (error instanceof Error) {
      switch (true) {
        case error.message.includes('popup-closed-by-user'):
          return 'Google sign-in was cancelled';
        case error.message.includes('account-exists'):
          return 'An account already exists with this email';
        case error.message.includes('popup-blocked'):
          return 'Popup was blocked by browser. Please allow popups for this site';
        default:
          return 'Google sign-up failed. Please try again';
      }
    }
    return 'Google Sign-up failed. Please try again';
  }

  // ==================
  // Utility methods
  // ==================

  private disableGoogleSignup(disable: boolean): void {
    const googleButton = document.querySelector('[data-google-signup]');
    if (googleButton instanceof HTMLButtonElement) {
      googleButton.disabled = disable;
    }
  }
}
