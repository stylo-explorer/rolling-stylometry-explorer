import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';
import {
  AuthorNameRelation,
  ClassificationSettingsAndResults,
  InputData,
} from './classification.service';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  public readonly book$ = new ReplaySubject<string>(1);
  public readonly title$: Observable<string>;
  public readonly year$: Observable<string>;
  public readonly authorData$: Observable<AuthorNameRelation[]>;
  public readonly rawClassificationData$ = new ReplaySubject<InputData>(1);
  public readonly availableClassfications$: Observable<
    ClassificationSettingsAndResults[]
  >;
  constructor(http: HttpClient) {
    this.rawClassificationData$.subscribe(console.log);
    this.title$ = this.rawClassificationData$.pipe(map((data) => data.title));
    this.year$ = this.rawClassificationData$.pipe(map((data) => data.year));
    this.authorData$ = this.rawClassificationData$.pipe(
      map((result) => result.authorNames)
    );
    this.availableClassfications$ = this.rawClassificationData$.pipe(
      map((data) => data.results)
    );
  }
}
