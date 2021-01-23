import {
  Component,
  OnInit,
  HostListener,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import {
  ClassificationService,
  ClassifiedTextSegment,
} from '../classification.service';
import { combineLatest, ReplaySubject } from 'rxjs';
import { ScrollService } from '../book/scroll.service';
import ResizeObserver from 'resize-observer-polyfill';
import { distinctUntilChanged, tap } from 'rxjs/operators';

@Component({
  selector: 'app-book-preview',
  templateUrl: './book-preview.component.html',
  styleUrls: ['./book-preview.component.scss'],
})
export class BookPreviewComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('canvas')
  private canvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('position')
  private position: ElementRef<HTMLCanvasElement>;
  private height$ = new ReplaySubject<number>(1);
  private width$ = new ReplaySubject<number>(1);
  private charWidth$ = new ReplaySubject<number>(6.5);

  private segmentHeights: number[];
  private renderSegmentHeights: number[];

  public dragging = false;
  private resizeObserver: ResizeObserver;

  constructor(
    private classification: ClassificationService,
    private scrollService: ScrollService,
    private hostEl: ElementRef
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.height$,
      this.width$,
      this.charWidth$,
      this.classification.bookViewportWidth$.pipe(distinctUntilChanged()),
      this.classification.textSegments$,
      this.classification.chapterSegments$,
    ]).subscribe(
      ([
        height,
        width,
        charWidth,
        bookViewportWidth,
        segments,
        chapterSegments,
      ]) =>
        this.updateCanvas(
          height,
          width,
          charWidth,
          bookViewportWidth,
          segments,
          chapterSegments
        )
    );

    combineLatest([
      this.height$,
      this.width$,
      this.scrollService.scrolledToIndex$,
    ]).subscribe(([height, width, firstIndex]) =>
      this.updateRange(firstIndex, width, height)
    );
  }

  ngAfterViewInit() {
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.hostEl.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObserver.disconnect();
  }

  public resize() {
    this.canvas.nativeElement.height = this.hostEl.nativeElement.clientHeight;
    this.canvas.nativeElement.width = this.hostEl.nativeElement.clientWidth;
    this.position.nativeElement.height = this.hostEl.nativeElement.clientHeight;
    this.position.nativeElement.width = this.hostEl.nativeElement.clientWidth;
    this.height$.next(this.canvas.nativeElement.clientHeight);
    this.width$.next(this.canvas.nativeElement.clientWidth);
    this.calculateCharWidth();
  }

  private calculateCharWidth() {
    const spanElement = document.createElement('span');
    spanElement.innerText = 'a';
    spanElement.style.position = 'absolute';
    document.body.appendChild(spanElement);
    this.charWidth$.next(spanElement.getBoundingClientRect().width);
    document.body.removeChild(spanElement);
  }

  private updateCanvas(
    height: number,
    width: number,
    charWidth: number,
    bookViewportWidth: number,
    segments: ClassifiedTextSegment[],
    chapterSegments: number[]
  ) {
    const context = this.canvas.nativeElement.getContext('2d');
    if (context) {
      context.clearRect(0, 0, width, height);
      this.segmentHeights = segments.map((segment) =>
        this.getRenderedHeight(segment, charWidth, bookViewportWidth)
      );
      const segmentHeightsSum = this.segmentHeights.reduce(
        (sum, segmentHeight) => sum + segmentHeight,
        0
      );
      this.renderSegmentHeights = this.segmentHeights.map(
        (originalHeight) => (originalHeight / segmentHeightsSum) * height
      );
      const segmentEnds = this.renderSegmentHeights.reduce(
        (sums, segmentHeight) => {
          if (sums.length === 0) {
            sums.push(segmentHeight);
          } else {
            sums.push(segmentHeight + sums[sums.length - 1]);
          }
          return sums;
        },
        new Array<number>()
      );

      segments.forEach((segment, i) => {
        context.fillStyle = this.classification.toRgb(segment.color);
        if (i !== 0) {
          context.fillRect(
            0,
            segmentEnds[i - 1],
            width,
            this.renderSegmentHeights[i]
          );
        } else {
          context.fillRect(0, 0, width, this.renderSegmentHeights[i]);
        }
      });
      chapterSegments.forEach((position) => {
        const segmentHeight = height / segments.length;
        context.fillStyle = '#000000';
        if (position !== 0) {
          context.fillRect(0, segmentEnds[position - 1], width, segmentHeight);
        } else {
          context.fillRect(0, 0, width, segmentHeight);
        }
      });
    }
  }

  private getRenderedHeight(
    segment: ClassifiedTextSegment,
    charWidth: number,
    viewportWidth: number
  ): number {
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

    return lines;
  }

  private updateRange(firstIndex: number, width: number, height: number) {
    if (!this.renderSegmentHeights) {
      return;
    }
    const topPosition = this.renderSegmentHeights
      .slice(0, firstIndex)
      .reduce((sum, height) => sum + height, 0);
    const context = this.position.nativeElement.getContext('2d');
    if (context) {
      context.clearRect(0, 0, width, height);
      context.fillStyle = 'rgba(0, 0, 0, 0.3)';
      context.fillRect(0, topPosition, width, height * 0.01);
    }
  }

  public scrollTo(event: MouseEvent | TouchEvent) {
    const yPosition = this.isMouseEvent(event)
      ? event.offsetY
      : event.touches[0].clientY;

    this.scrollService.offsetPercentage$.next(
      yPosition / this.canvas.nativeElement.clientHeight
    );
  }

  private isMouseEvent(event: MouseEvent | TouchEvent): event is MouseEvent {
    return !!(event as any).offsetY;
  }

  public dragTo(event: MouseEvent | TouchEvent) {
    if (this.dragging) {
      this.scrollTo(event);
    }
  }
}
