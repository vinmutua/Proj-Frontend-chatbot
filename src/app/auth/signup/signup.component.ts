import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { 
    AuthFormError, 
    ErrorCode, 
    GoogleAuthErrorCode 
} from '../../interfaces/user.interface';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent implements OnInit, OnDestroy {
  signupForm!: FormGroup;
  isLoading = false;
  isGoogleLoading = false;
  errorMessage = '';
  successMessage = '';
  formErrors: AuthFormError = {}; // Add this
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    // Add form value changes subscription
    this.signupForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.onFormValueChanged());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      confirmPassword: ['', Validators.required],
      terms: [false, Validators.requiredTrue]
    }, {
      validators: this.passwordMatchValidator()
    });

    // Log form values changes for debugging
    this.signupForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        console.log('Form value changed:', value);
        this.onFormValueChanged();
      });
  }

  async onSubmit(): Promise<void> {
    if (this.signupForm.invalid || this.isLoading) {
      return;
    }

    try {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const formData = this.signupForm.value;
      console.log('Sending signup data:', formData); // Add this for debugging
      
      await this.authService.traditionalSignup(formData);
      this.successMessage = 'Account created successfully!';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    } catch (error: any) {
      console.error('Signup error details:', error); // Add this for debugging
      this.handleError(error);
    } finally {
      this.isLoading = false;
    }
  }

  async onGoogleSignup(): Promise<void> {
    if (this.isGoogleLoading) return;

    try {
      this.isGoogleLoading = true;
      this.formErrors = {};
      
      await this.authService.googleSignIn();
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.handleError(error);
    } finally {
      this.isGoogleLoading = false;
    }
  }

  private handleError(error: any): void {
    if (error.code === 'EMAIL_EXISTS') {
      this.errorMessage = 'This email is already registered';
    } else if (error.code === 'INVALID_PASSWORD') {
      this.errorMessage = 'Password does not meet requirements';
    } else {
      this.errorMessage = error.message || 'An error occurred during signup';
    }
  }

  private onFormValueChanged(): void {
    if (!this.signupForm) return;

    Object.keys(this.signupForm.controls).forEach(field => {
      const control = this.signupForm.get(field);
      this.formErrors[field as keyof AuthFormError] = '';

      if (control?.invalid && control?.dirty) {
        const messages = this.getValidationMessages(field, control.errors);
        this.formErrors[field as keyof AuthFormError] = messages[0];
      }
    });
  }

  private getValidationMessages(field: string, errors: any): string[] {
    const messages: string[] = [];
    if (!errors) return messages;

    if (errors['required']) messages.push(`${field} is required`);
    if (errors['email']) messages.push('Invalid email address');
    if (errors['minlength']) messages.push('Password must be at least 8 characters');
    if (errors['passwordStrength']) messages.push('Password must include uppercase, lowercase, number and special character');
    if (errors['passwordMismatch']) messages.push('Passwords do not match');

    return messages;
  }

  // Add password strength validator
  private createPasswordStrengthValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const hasUpperCase = /[A-Z]+/.test(value);
      const hasLowerCase = /[a-z]+/.test(value);
      const hasNumeric = /[0-9]+/.test(value);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

      const valid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar;
      return !valid ? { passwordStrength: true } : null;
    };
  }

  // Add password match validator
  private passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get('password');
      const confirmPassword = control.get('confirmPassword');
      return password?.value === confirmPassword?.value ? 
        null : { passwordMismatch: true };
    };
  }
}
