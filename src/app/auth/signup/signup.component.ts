import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { SignupData } from '../../interfaces/user.interface';
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
  }

  private initializeForm(): void {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/)
      ]],
      confirmPassword: ['', Validators.required],
      terms: [false, Validators.requiredTrue]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (!password || !confirmPassword) {
      return null;
    }
    
    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  async onSubmit(): Promise<void> {
    if (this.signupForm.invalid) {
      return;
    }

    try {
      this.isLoading = true;
      await this.authService.signup(this.signupForm.value);
      this.router.navigate(['/login']);
    } catch (error: unknown) {
      this.errorMessage = error instanceof Error ? 
        error.message : 'Signup failed. Please try again.';
      console.error('Signup error:', error);
    } finally {
      this.isLoading = false;
    }
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
      this.errorMessage = error instanceof Error ? 
        error.message : 'Google sign-up failed. Please try again.';
      console.error('Google signup error:', error);
    } finally {
      this.isLoading = false;
    }
  }
}
