import { Component, ElementRef, HostListener, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-avatar-dropdown',
  templateUrl: './avatar-dropdown.component.html',
  styleUrls: ['./avatar-dropdown.component.scss']
})
export class AvatarDropdownComponent implements OnInit {
  @Input() photoURL: string | null = null;
  @Input() displayName: string = '';

  isOpen = false;
  showFallback = false;

  get fallbackLetter(): string {
    if (!this.displayName || this.displayName.trim().length === 0) {
      return 'U';
    }
    return this.displayName.trim().charAt(0).toUpperCase();
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {}

  onImageError(): void {
    this.showFallback = true;
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  closeDropdown(): void {
    this.isOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen) {
      this.closeDropdown();
    }
  }

  navigateTo(route: string): void {
    this.closeDropdown();
    this.router.navigate([route]);
  }

  logout(): void {
    this.closeDropdown();
    this.authService.logout();
  }
}
