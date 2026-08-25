import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserProfile, UserProfileService } from '../../../services/user-profile.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss']
})
export class UsersPage implements OnInit, OnDestroy {
  users: UserProfile[] = [];
  loading = true;
  hasError = false;
  sortColumn: 'displayName' | 'email' | 'joinedDate' = 'joinedDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  private destroy$ = new Subject<void>();

  constructor(private userProfileService: UserProfileService) {}

  ngOnInit(): void {
    this.userProfileService.getAllProfiles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: users => {
          this.users = this.sortUsers(users);
          this.loading = false;
        },
        error: error => {
          console.warn('Failed to load registered users:', error);
          this.hasError = true;
          this.loading = false;
        }
      });
  }

  sortBy(column: 'displayName' | 'email' | 'joinedDate'): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = column === 'joinedDate' ? 'desc' : 'asc';
    }
    this.users = this.sortUsers(this.users);
  }

  formatJoinedDate(value: UserProfile['joinedDate']): string {
    if (!value) return '—';
    const date = value.toDate ? value.toDate() : new Date(value as any);
    return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private sortUsers(users: UserProfile[]): UserProfile[] {
    return [...users].sort((first, second) => {
      let firstValue: any;
      let secondValue: any;

      if (this.sortColumn === 'joinedDate') {
        firstValue = this.dateValue(first.joinedDate);
        secondValue = this.dateValue(second.joinedDate);
      } else {
        firstValue = (first[this.sortColumn] || '').toLowerCase();
        secondValue = (second[this.sortColumn] || '').toLowerCase();
      }

      const comparison = firstValue < secondValue ? -1 : firstValue > secondValue ? 1 : 0;
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  private dateValue(value: UserProfile['joinedDate']): number {
    if (!value) return 0;
    const date = value.toDate ? value.toDate() : new Date(value as any);
    return date.getTime() || 0;
  }
}
