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

@Injectable({ providedIn: 'root' })
export class ScrollService {
  public readonly offset$ = new Subject<{ senderId: number; offset: number }>();
  public readonly scrolledToIndex$ = new Subject<number>();
  public readonly offsetPercentage$ = new Subject<number>();

  constructor() {}
}
