import { Component, Input } from '@angular/core';
import { ClassificationService } from './classification.service';
import { DataService } from './data.service';

@Component({
  selector: 'stylo-explorer',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  @Input()
  public set book(url: string) {
    this.data.bookUrl$.next(url);
  }

  @Input()
  public set classification(url: string) {
    this.data.classificationResultUrl$.next(url);
  }

  public currentView = 'explorer';

  constructor(private data: DataService) {}
}
