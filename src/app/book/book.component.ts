import {
  Component,
  OnInit,
  HostListener,
  ElementRef,
  ViewChild,
  OnDestroy,
  AfterViewInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  ClassificationService,
  ClassifiedTextSegment,
} from '../classification.service';
import { ScrollService } from './scroll.service';
import { Subscription } from 'rxjs';
import { debounceTime, throttleTime } from 'rxjs/operators';

@Component({
  selector: 'app-book',
  templateUrl: './book.component.html',
  styleUrls: ['./book.component.scss'],
})
export class BookComponent implements AfterViewInit, OnDestroy {
  private scrollSubscriber = new Subscription();
  constructor(
    public classification: ClassificationService,
    private scroll: ScrollService,
    private el: ElementRef<HTMLElement>
  ) {}

  @ViewChild('bookContent', {
    static: true,
  })
  private bookContentEl: ElementRef<HTMLDivElement>;

  public ngAfterViewInit(): void {
    this.classification.textSegments$.subscribe(() =>
      setTimeout(() => this.resize())
    );

    this.scrollSubscriber.add(
      this.scroll.scrollTop$.subscribe((top) => {
        this.el.nativeElement.scrollTop = top;
      })
    );
    this.scrollSubscriber.add(
      this.scroll.scrollTopSync$.pipe(throttleTime(100)).subscribe((top) => {
        if (this.el.nativeElement.scrollTop !== top) {
          this.el.nativeElement.scrollTop = top;
        }
      })
    );
  }

  public ngOnDestroy(): void {
    this.scrollSubscriber.unsubscribe();
  }

  public trackByStart(_: number, segment: ClassifiedTextSegment) {
    return segment.start;
  }
  public trackByAuthor(_: number, match: ClassifiedTextSegment['matches'][0]) {
    return match.author;
  }

  @HostListener('window:resize')
  public resize() {
    this.scroll.bookContainerHeight$.next(
      this.bookContentEl.nativeElement.clientHeight
    );
    this.scroll.bookViewportHeight$.next(this.el.nativeElement.clientHeight);
  }

  @HostListener('scroll')
  public handleScroll() {
    this.scroll.scrollTopSync$.next(this.el.nativeElement.scrollTop);
    this.scroll.centerOverride$.next(
      this.el.nativeElement.scrollTop / this.scroll.bookContainerHeight$.value
    );
  }

  public scoreAuthors(segment: ClassifiedTextSegment): string {
    let buffer = '';
    for (const match of segment.matches) {
      buffer = buffer + match.author + ' ' + match.score.toFixed(5) + '\n';
    }

    return buffer;
  }
}
