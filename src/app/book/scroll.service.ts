import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  merge,
  Observable,
  Subject,
} from 'rxjs';
import { throttleTime, map, skipUntil } from 'rxjs/operators';

type Range = [number, number];

@Injectable({
  providedIn: 'root',
})
export class ScrollService {
  public readonly bookViewportHeight$ = new BehaviorSubject(0);
  public readonly bookContainerHeight$ = new BehaviorSubject(0);
  public readonly center$ = new BehaviorSubject(0);
  public readonly centerOverride$ = new BehaviorSubject(0);

  public readonly scrollTop$: Observable<number>;
  public readonly range$: Observable<Range>;
  public readonly rangePercentage$: Observable<Range>;
  public readonly scrollTopSync$ = new BehaviorSubject(0);

  constructor() {
    this.range$ = combineLatest([
      this.bookViewportHeight$,
      this.bookContainerHeight$,
      this.center$,
    ]).pipe(
      map(([viewportHeight, bookContainerHeight, center]) =>
        this.calculateRangeFromCenter(
          viewportHeight,
          bookContainerHeight,
          center
        )
      )
    );

    const overrideRange$ = combineLatest([
      this.bookViewportHeight$,
      this.bookContainerHeight$,
      this.centerOverride$.pipe(throttleTime(100)),
    ]).pipe(
      map(([viewportHeight, bookContainerHeight, center]) =>
        this.calculateRangeFromCenter(
          viewportHeight,
          bookContainerHeight,
          center
        )
      )
    );

    this.rangePercentage$ = combineLatest([
      merge(overrideRange$, this.range$),
      this.bookContainerHeight$,
    ]).pipe(
      map(([range, bookHeight]) => [
        range[0] / bookHeight,
        range[1] / bookHeight,
      ])
    );

    this.scrollTop$ = this.range$.pipe(
      map((range) => range[0]),
      skipUntil(this.center$)
    );
  }

  // Calculates where to jump if you click on the minimap
  private calculateRangeFromCenter(
    viewportHeight: number,
    bookContainerHeight: number,
    center: number
  ): Range {
    const centerY = bookContainerHeight * center;
    const startY = Math.max(0, Math.floor(centerY - viewportHeight / 2));
    const endY = Math.min(
      bookContainerHeight,
      Math.ceil(centerY + viewportHeight / 2)
    );
    return [startY, endY];
  }
}
