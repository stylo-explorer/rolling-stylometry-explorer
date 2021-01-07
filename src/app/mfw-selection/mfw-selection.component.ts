import { Component, Input, OnInit, Output } from '@angular/core';
import { ClassificationService } from '../classification.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { UrlHandlingStrategy } from '@angular/router';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-mfw-selection',
  templateUrl: './mfw-selection.component.html',
  styleUrls: ['./mfw-selection.component.scss'],
})
export class MfwSelectionComponent {
  public readonly colors$: Observable<[string, string][]>;
  @Input() public showGithub = true;
  constructor(public classification: ClassificationService) {
    this.colors$ = this.classification.colors$.pipe(
      map((colors) => {
        const authors = colors.keys();
        return [...authors].map((author) => [
          author,
          this.classification.toRgb(colors.get(author) || { r: 0, b: 0, g: 0 }),
        ]);
      })
    );
  }

  formatLabel(value: number) {
    if (value >= 100) {
      return Math.round(value / 100) / 10 + 'k';
    }

    return value;
  }
}
