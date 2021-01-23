import {
  CdkVirtualScrollViewport,
  VirtualScrollStrategy,
  VIRTUAL_SCROLL_STRATEGY,
} from '@angular/cdk/scrolling';
import { Directive, forwardRef, Input } from '@angular/core';
import { Observable, Subject } from 'rxjs';

class BookScrollingStrategy implements VirtualScrollStrategy {
  public scrolledIndexChange = new Subject<number>();;

  public set segmentSizes(segmentSizes: number[]) {
    this._segmentSizes = segmentSizes;
    this.refreshTotalHeight();
    this.updateRenderedRange();
  }
  public get segmentSizes(): number[] {
      return this._segmentSizes ||[];
  }

  private viewport: CdkVirtualScrollViewport | null = null;
  private _segmentSizes: number[];

  public attach(viewport: CdkVirtualScrollViewport): void {
    this.viewport = viewport;
    this.refreshTotalHeight();
    this.updateRenderedRange();
  }

  public detach(): void {
    this.viewport = null;
  }
  public onContentScrolled(): void {
    if (this.viewport) {
        this.updateRenderedRange();
    }
  }
  public onDataLengthChanged(): void {
    this.updateRenderedRange();
  }
  public onContentRendered(): void {
    //throw new Error('Method not implemented.');
  }
  public onRenderedOffsetChanged(): void {
    //throw new Error('Method not implemented.');
  }
  public scrollToIndex(index: number, behavior: ScrollBehavior): void {
      if(this.viewport){
    
    this.viewport.scrollToOffset(this.getOffsetForIndex(index), behavior);}
  }

  private refreshTotalHeight() {
      if(this.viewport){
    this.viewport.setTotalContentSize(
      this.segmentSizes.reduce((sum, segmentHeight) => sum + segmentHeight, 0)
    );}
  }

  private updateRenderedRange(): void {
      if(this.viewport){
          const viewportSize = this.viewport.getViewportSize();
          const offset = this.viewport.measureScrollOffset();
          const {start, end} = this.viewport.getRenderedRange();
          const newRange = {start, end};
          const dataLength = this.viewport.getDataLength();
          const firstVisibleIndex = this.getIndexForOffset(offset);
          const startBuffer = offset - this.getOffsetForIndex(start);
          if (startBuffer < 3 && start !== 0) {
            newRange.start = Math.max(0, this.getIndexForOffset(offset - 6) - 1);
            newRange.end = Math.min(
                dataLength,
                this.getIndexForOffset(offset + viewportSize + 3) + 1,
            );
        } else {
            const endBuffer = this.getOffsetForIndex(end) - offset - viewportSize;
     
            if (endBuffer < 3 && end !== dataLength) {
                newRange.start = Math.max(0, this.getIndexForOffset(offset - 3) - 1);
                newRange.end = Math.min(
                    dataLength,
                    this.getIndexForOffset(offset + viewportSize + 6) +1,
                );
            }
        }
     
        this.viewport.setRenderedRange(newRange);
        this.viewport.setRenderedContentOffset(this.getOffsetForIndex(newRange.start));
        this.scrolledIndexChange.next(firstVisibleIndex);
      }
  }

  private getIndexForOffset(offset: number) {
      let sum = 0;
      let i = 0;
      while(sum < offset && i < this.segmentSizes.length) {
          sum += this.segmentSizes[i];
        i++;
      }
      return Math.max(0, i-1);
  }

  private getOffsetForIndex(index: number) {
    return this.segmentSizes.slice(0, index).reduce((sum, segmentHeight) => sum + segmentHeight, 0);
  }
}

export function _bookVirtualScrollStrategyFactory(
  fixedSizeDir: BookScrollingViewportDirective
) {
  return fixedSizeDir.scrollStrategy;
}

@Directive({
  selector: 'cdk-virtual-scroll-viewport[segmentSizes]',
  providers: [
    {
      provide: VIRTUAL_SCROLL_STRATEGY,
      useFactory: _bookVirtualScrollStrategyFactory,
      deps: [forwardRef(() => BookScrollingViewportDirective)],
    },
  ],
})
export class BookScrollingViewportDirective {
  public scrollStrategy = new BookScrollingStrategy();
  @Input('segmentSizes')
  public set segmentSizes(segmentSizes: number[]) {
    this.scrollStrategy.segmentSizes = segmentSizes;
  }
}
