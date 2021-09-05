import { HttpClient } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { ScrollService } from './book/scroll.service';
import { ClassificationService, InputData } from './classification.service';
import { DataService } from './data.service';

@Component({
  selector: 'app-stylo-explorer',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [DataService, ScrollService],
})
export class AppComponent {
  private _inputUrls: boolean | 'true' | 'false' = true;
  private _book: string;
  private _classification: string;

  @Input()
  public set book(url: string) {
    this._book = url;
    this.refreshBook();
  }

  @Input()
  public set classification(url: string) {
    this._classification = url;
    this.refreshClassification();
  }

  @Input()
  public set inputUrls(inputUrls: boolean | 'true' | 'false') {
    this._inputUrls = inputUrls;
    this.refreshBook();
    this.refreshClassification();
  }

  public currentView = 'explorer';

  constructor(private data: DataService, private http: HttpClient) {}

  private refreshBook() {
    if (this._inputUrls && this._inputUrls !== 'false') {
      this.http
        .get(this._book, {
          responseType: 'text',
        })
        .subscribe({
          next: (data) => {
            this.data.book$.next(data);
          },
        });
    } else {
      this.data.book$.next(this._book);
    }
  }

  private refreshClassification() {
    if (this._inputUrls && this._inputUrls !== 'false') {
      this.http.get(this._classification).subscribe({
        next: (data) =>
          this.data.rawClassificationData$.next(data as InputData),
      });
    } else {
      this.data.rawClassificationData$.next(
        JSON.parse(this._classification) as InputData
      );
    }
  }
}
