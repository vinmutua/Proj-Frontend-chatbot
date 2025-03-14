import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { AuthFormError } from '../../interfaces/user.interface';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  returnUrl: string = '/';
  formErrors: AuthFormError = {};
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';

    this.loginForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.onFormValueChanged());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      remember: [false]
    });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid || this.isLoading) {
      return;
    }

    try {
      this.isLoading = true;
      this.clearMessages();

      await this.authService.traditionalLogin(this.loginForm.value);
      this.successMessage = 'Login successful!';
      setTimeout(() => {
        this.router.navigate([this.returnUrl]);
      }, 1000);
    } catch (error: any) {
      this.handleError(error);
    } finally {
      this.isLoading = false;
    }
  }

  private handleError(error: any): void {
    if (error.code === 'INVALID_CREDENTIALS') {
      this.errorMessage = 'Invalid email or password';
    } else if (error.code === 'EMAIL_NOT_VERIFIED') {
      this.errorMessage = 'Please verify your email before logging in';
    } else {
      this.errorMessage = error.message || 'An error occurred during login';
    }
  }

  private onFormValueChanged(): void {
    if (!this.loginForm) return;

    Object.keys(this.loginForm.controls).forEach(field => {
      const control = this.loginForm.get(field);
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

    return messages;
  }
}
