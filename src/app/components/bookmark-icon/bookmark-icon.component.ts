import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';
import { SavedContentService, SaveContentInput } from 'src/app/services/saved-content.service';

@Component({
  selector: 'app-bookmark-icon',
  templateUrl: './bookmark-icon.component.html',
  styleUrls: ['./bookmark-icon.component.scss']
})
export class BookmarkIconComponent implements OnInit, OnDestroy {
  @Input() contentId: string;
  @Input() contentType: 'blog' | 'video';
  @Input() contentTitle: string;
  @Input() contentThumbnail: string;

  /** Whether the content is currently saved (filled state) */
  isSaved = false;

  /** Whether the user is authenticated */
  isAuthenticated = false;

  /** Current user's UID */
  private userId: string | null = null;

  /** Whether a save/unsave operation is in progress */
  isLoading = false;

  /** Whether to show the sign-in prompt for guest users */
  showSignInPrompt = false;

  /** Track whether the sign-in prompt was dismissed this session */
  private promptDismissedThisSession = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private savedContentService: SavedContentService,
    private toastController: ToastController
  ) {}

  ngOnInit(): void {
    // Subscribe to auth state
    const authSub = this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
      this.userId = user?.uid || null;

      // When authenticated, check if content is already saved
      if (this.isAuthenticated && this.userId && this.contentId) {
        this.subscribeToSavedState();
      } else {
        this.isSaved = false;
      }
    });
    this.subscriptions.push(authSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Subscribe to real-time saved state from Firestore.
   */
  private subscribeToSavedState(): void {
    const savedSub = this.savedContentService
      .isContentSaved(this.userId!, this.contentId)
      .subscribe(saved => {
        // Only update if not currently in a loading/optimistic state
        if (!this.isLoading) {
          this.isSaved = saved;
        }
      });
    this.subscriptions.push(savedSub);
  }

  /**
   * Handle bookmark icon click.
   * - Authenticated user: toggle save/unsave with optimistic update
   * - Guest user: show sign-in prompt
   */
  async onBookmarkClick(event: Event): Promise<void> {
    event.stopPropagation();
    event.preventDefault();

    if (!this.isAuthenticated) {
      // Show sign-in prompt for guest users (unless dismissed this session)
      if (!this.promptDismissedThisSession) {
        this.showSignInPrompt = true;
      }
      return;
    }

    if (this.isLoading) {
      return;
    }

    // Optimistic UI update
    const previousState = this.isSaved;
    this.isSaved = !previousState;
    this.isLoading = true;

    try {
      if (previousState) {
        // Was saved → unsave
        await this.savedContentService.unsaveContent(this.userId!, this.contentId);
      } else {
        // Was not saved → save
        const input: SaveContentInput = {
          userId: this.userId!,
          contentId: this.contentId,
          contentType: this.contentType,
          contentTitle: this.contentTitle,
          contentThumbnail: this.contentThumbnail
        };
        await this.savedContentService.saveContent(input);
      }
    } catch (error) {
      // Rollback on error
      this.isSaved = previousState;
      await this.showErrorToast();
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Dismiss the sign-in prompt.
   */
  dismissPrompt(): void {
    this.showSignInPrompt = false;
    this.promptDismissedThisSession = true;
  }

  /**
   * Handle "Continue with Google" from the inline sign-in prompt.
   */
  async signInWithGoogle(): Promise<void> {
    this.showSignInPrompt = false;
    try {
      await this.authService.signInWithGoogle();
    } catch (error) {
      // Auth error is handled by AuthService itself
    }
  }

  /**
   * Show error toast when save/unsave fails.
   */
  private async showErrorToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Could not save content. Please try again.',
      duration: 3000,
      position: 'bottom',
      color: 'danger',
      buttons: [{ text: 'Dismiss', role: 'cancel' }]
    });
    await toast.present();
  }
}
