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

  public dragging = false;
  private resizeObserver: ResizeObserver;

  constructor(
    private classification: ClassificationService,
    private scrollService: ScrollService
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.height$,
      this.width$,
      this.classification.textSegments$,
      this.classification.chapterSegments$,
      this.scrollService.bookViewportHeight$,
    ]).subscribe(([height, width, segments, chapterSegments]) =>
      this.updateCanvas(height, width, segments, chapterSegments)
    );
    combineLatest([
      this.height$,
      this.width$,
      this.scrollService.rangePercentage$,
    ]).subscribe(([height, width, range]) =>
      this.updateRange(range[0], range[1], width, height)
    );
  }

  ngAfterViewInit() {
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObserver.disconnect();
  }

  public resize() {
    this.canvas.nativeElement.height = this.canvas.nativeElement.clientHeight;
    this.canvas.nativeElement.width = this.canvas.nativeElement.clientWidth;
    this.position.nativeElement.height = this.position.nativeElement.clientHeight;
    this.position.nativeElement.width = this.position.nativeElement.clientWidth;
    this.height$.next(this.canvas.nativeElement.clientHeight);
    this.width$.next(this.canvas.nativeElement.clientWidth);
  }

  private updateCanvas(
    height: number,
    width: number,
    segments: ClassifiedTextSegment[],
    chapterSegments: number[]
  ) {
    const context = this.canvas.nativeElement.getContext('2d');
    if (context) {
      context.clearRect(0, 0, width, height);
      const segmentHeights = segments.map((segment) =>
        this.getRenderedHeight(segment)
      );
      const segmentHeightsSum = segmentHeights.reduce(
        (sum, segmentHeight) => sum + segmentHeight,
        0
      );
      const renderSegmentHeights = segmentHeights.map(
        (originalHeight) => (originalHeight / segmentHeightsSum) * height
      );
      const segmentEnds = renderSegmentHeights.reduce((sums, segmentHeight) => {
        if (sums.length === 0) {
          sums.push(segmentHeight);
        } else {
          sums.push(segmentHeight + sums[sums.length - 1]);
        }
        return sums;
      }, new Array<number>());

      segments.forEach((segment, i) => {
        context.fillStyle = this.classification.toRgb(segment.color);
        if (i !== 0) {
          context.fillRect(
            0,
            segmentEnds[i - 1],
            width,
            renderSegmentHeights[i]
          );
        } else {
          context.fillRect(0, 0, width, renderSegmentHeights[i]);
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

  private getRenderedHeight(segment: ClassifiedTextSegment): number {
    const el = document.querySelector(`span[id='segment-${segment.start}']`);
    if (el) {
      return (el as HTMLElement).offsetHeight;
    }
    return 1;
  }

  private updateRange(
    start: number,
    end: number,
    width: number,
    height: number
  ) {
    const context = this.position.nativeElement.getContext('2d');
    if (context) {
      context.clearRect(0, 0, width, height);
      context.fillStyle = 'rgba(0, 0, 0, 0.3)';
      context.fillRect(0, start * height, width, (end - start) * height);
    }
  }

  public scrollTo(event: MouseEvent | TouchEvent) {
    if (this.isMouseEvent(event)) {
      this.scrollService.center$.next(
        event.offsetY / this.canvas.nativeElement.height
      );
    } else {
      this.scrollService.center$.next(
        event.touches[0].clientY / this.canvas.nativeElement.height
      );
    }
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
