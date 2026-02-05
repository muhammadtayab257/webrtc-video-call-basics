import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  error = signal<string>('');
  loading = signal<boolean>(false);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async onSubmit(): Promise<void> {
    // Validation
    if (!this.username || !this.email || !this.password) {
      this.error.set('Please fill in all fields');
      return;
    }

    if (this.password.length < 6) {
      this.error.set('Password must be at least 6 characters');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      await this.authService.signup({
        username: this.username,
        email: this.email,
        password: this.password
      });
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.error.set(err.message || 'Signup failed');
    } finally {
      this.loading.set(false);
    }
  }
}
