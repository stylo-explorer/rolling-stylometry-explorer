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
  public readonly book$: Observable<string>;
  public readonly bookUrl$ = new ReplaySubject<string>(1);
  public readonly classificationResultUrl$ = new ReplaySubject<string>(1);
  public readonly title$: Observable<string>;
  public readonly year$: Observable<string>;
  public readonly authorData$: Observable<AuthorNameRelation[]>;
  public readonly rawClassificationData$: Observable<InputData>;
  public readonly availableClassfications$: Observable<
    ClassificationSettingsAndResults[]
  >;
  constructor(http: HttpClient) {
    this.book$ = this.bookUrl$.pipe(
      switchMap((url) =>
        http.get(url, {
          responseType: 'text',
        })
      ),
      shareReplay()
    );
    this.rawClassificationData$ = this.classificationResultUrl$.pipe(
      switchMap((url) => http.get(url) as Observable<InputData>),
      shareReplay()
    );
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
