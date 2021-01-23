import {
  Component,
  HostListener,
  ElementRef,
  ViewChild,
  OnDestroy,
  AfterViewInit,
} from '@angular/core';
import {
  ClassificationService,
  ClassifiedTextSegment,
} from '../classification.service';
import { ScrollService } from './scroll.service';
import { combineLatest, Observable, Subject, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';

@Component({
  selector: 'app-book',
  templateUrl: './book.component.html',
  styleUrls: ['./book.component.scss'],
})
export class BookComponent implements AfterViewInit, OnDestroy {
  private static instanceCounter = 0;
  private instanceId: number;
  public segmentPositions: Observable<number[]>;
  private scrollSubscriber = new Subscription();

  private renderWidth = new Subject<number>();
  private lineHeight = new Subject<number>();
  private charWidth = new Subject<number>();

  constructor(
    public classification: ClassificationService,
    private scroll: ScrollService,
    private el: ElementRef<HTMLElement>
  ) {}

  @ViewChild('bookContent', {
    static: true,
  })
  private bookContentEl: CdkVirtualScrollViewport;

  public ngAfterViewInit(): void {
    this.instanceId = BookComponent.instanceCounter++;
    this.classification.textSegments$.subscribe((segments) => {
      setTimeout(() => {
        this.resize();
      });
    });
    this.segmentPositions = combineLatest([
      this.classification.textSegments$,
      this.charWidth,
      this.lineHeight,
      this.renderWidth,
    ]).pipe(
      map(([segments, charWidth, lineHeight, renderWidth]) =>
        segments.map((segment) => {
          return this.getRenderedHeight(
            segment,
            charWidth,
            lineHeight,
            renderWidth
          );
        })
      )
    );
    this.scroll.offset$.subscribe(({ offset, senderId }) => {
      if (senderId !== this.instanceId) {
        this.bookContentEl.scrollToOffset(offset);
      }
    });
    this.scroll.offsetPercentage$.subscribe((percentage) => {
      this.bookContentEl.scrollToOffset(
        percentage * Number.parseFloat(this.bookContentEl._totalContentHeight)
      );
    });
  }

  public viewportScroll() {
    this.scroll.offset$.next({
      senderId: this.instanceId,
      offset: this.bookContentEl.measureScrollOffset() || 0,
    });
  }

  public scrolledIndexChange(index) {
    this.scroll.scrolledToIndex$.next(index);
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
    this.classification.bookViewportWidth$.next(
      this.bookContentEl.elementRef.nativeElement.clientWidth
    );
    this.renderWidth.next(
      this.bookContentEl.elementRef.nativeElement.clientWidth
    );

    const spanElement = document.createElement('span');
    spanElement.innerText = 'a';
    spanElement.style.position = 'absolute';
    document.body.appendChild(spanElement);
    this.charWidth.next(spanElement.getBoundingClientRect().width);
    spanElement.innerHTML = 'a<br>b';
    const size1 = spanElement.getBoundingClientRect().height;
    spanElement.innerHTML = 'a<br>b<br>c';
    this.lineHeight.next(spanElement.getBoundingClientRect().height - size1);
    document.body.removeChild(spanElement);
  }

  public scoreAuthors(segment: ClassifiedTextSegment): string {
    let buffer = '';
    for (const match of segment.matches) {
      buffer = buffer + match.author + ' ' + match.score.toFixed(5) + '\n';
    }

    return buffer;
  }

  private getRenderedHeight(
    segment: ClassifiedTextSegment,
    charWidth: number,
    lineHeight: number,
    viewportWidth: number
  ): number {
    if (viewportWidth <= 0) {
      return 1;
    }
    const charsPerLine = Math.floor(viewportWidth / charWidth);
    let text = segment.text;
    let lines = 1;
    while (text.length > charsPerLine) {
      if (text.indexOf('\n') !== -1 && text.indexOf('\n') < charsPerLine) {
        text = text.slice(text.indexOf('\n') + 1);
      } else {
        text = text.slice(charsPerLine); // This can be optimized by skipping multiple newlines
      }
      lines++;
    }

    return lines * lineHeight;
  }
}
