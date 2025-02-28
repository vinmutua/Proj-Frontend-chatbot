import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginData } from '../../interfaces/user.interface';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  
  private initForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      remember: [false]
    });
  }

  async googleLogin(): Promise<void> {
    try {
      this.isLoading = true;
      await this.authService.googleSignIn();  // Changed from googleLogin to googleSignIn
      this.successMessage = 'Successfully logged in with Google!';
      setTimeout(() => {
        this.successMessage = '';
        this.router.navigate(['/dashboard']);
      }, 2000);
    } catch (error: unknown) {
      this.errorMessage = error instanceof Error ? 
        error.message : 'Google sign-in failed. Please try again.';
      console.error('Google login error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      return;
    }

    try {
      this.isLoading = true;
      const { email, password } = this.loginForm.value;
      await this.authService.login(email, password);
      this.successMessage = 'Login successful! Redirecting...';
      setTimeout(() => {
        this.successMessage = '';
        this.router.navigate(['/dashboard']);
      }, 2000);
    } catch (error: unknown) {
      this.errorMessage = error instanceof Error ? 
        error.message : 'Login failed. Please try again.';
      console.error('Login error:', error);
    } finally {
      this.isLoading = false;
    }
  }
}
