import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AuthService } from '../../services/auth.service';

/**
 * Tracks which features have been dismissed during the current session.
 * Uses a static Set so dismissals persist across component instances within a session.
 */
const dismissedFeatures = new Set<string>();

@Component({
  selector: 'app-sign-in-prompt',
  templateUrl: './sign-in-prompt.component.html',
  styleUrls: ['./sign-in-prompt.component.scss']
})
export class SignInPromptComponent implements OnInit {
  /** Identifies which feature triggered this prompt (used for session-based suppression). */
  @Input() feature: string = '';

  /** Custom message displayed in the prompt (e.g., "Sign in to save this"). */
  @Input() message: string = 'Sign in to access this feature';

  /** Emitted when the user dismisses the prompt. */
  @Output() dismissed = new EventEmitter<void>();

  /** Controls visibility of the prompt. */
  visible = false;

  /** Whether a sign-in operation is in progress. */
  signingIn = false;

  /** Error message if sign-in fails. */
  errorMessage: string | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Only show if this feature hasn't been dismissed during the current session
    this.visible = !dismissedFeatures.has(this.feature);
  }

  /**
   * Dismisses the prompt immediately and suppresses it for the rest of the session.
   */
  dismiss(): void {
    this.visible = false;
    dismissedFeatures.add(this.feature);
    this.dismissed.emit();
  }

  /**
   * Initiates Google sign-in via AuthService.
   */
  async signInWithGoogle(): Promise<void> {
    this.signingIn = true;
    this.errorMessage = null;

    try {
      await this.authService.signInWithGoogle();
      this.visible = false;
    } catch (error) {
      this.errorMessage = 'Sign-in failed. Please try again.';
    } finally {
      this.signingIn = false;
    }
  }

  /**
   * Checks if a given feature has been dismissed (used for testing).
   */
  static isDismissed(feature: string): boolean {
    return dismissedFeatures.has(feature);
  }

  /**
   * Clears all dismissed features (useful for testing).
   */
  static resetDismissals(): void {
    dismissedFeatures.clear();
  }
}
