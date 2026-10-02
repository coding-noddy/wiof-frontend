import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

/**
 * Shared on-brand search input for list pages. Emits the (debounced) query
 * via `queryChange`; clearing (✕ button, Esc, or `clear()` from the parent
 * via a template ref) emits '' immediately.
 */
@Component({
  selector: 'app-search-box',
  templateUrl: './search-box.component.html',
  styleUrls: ['./search-box.component.scss']
})
export class SearchBoxComponent implements OnInit, OnDestroy {
  @Input() placeholder = 'Search';
  @Input() ariaLabel = 'Search';
  @Output() queryChange = new EventEmitter<string>();

  value = '';
  private input$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.input$
      .pipe(debounceTime(150), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((q) => this.queryChange.emit(q));
  }

  onInput(value: string): void {
    this.value = value;
    this.input$.next(value);
  }

  clear(): void {
    this.value = '';
    this.input$.next('');
    this.queryChange.emit('');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
