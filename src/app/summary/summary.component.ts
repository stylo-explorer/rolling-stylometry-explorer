import { Component, OnInit } from '@angular/core';
import {
  AuthorNameRelation,
  ClassificationService,
} from '../classification.service';

@Component({
  selector: 'app-summary',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss'],
})
export class SummaryComponent implements OnInit {
  constructor(public classification: ClassificationService) {}
  public authorNames(authors: AuthorNameRelation[]): string {
    let authorsOverview = '';
    for (const author of authors) {
      authorsOverview =
        authorsOverview + author.fullName + ' (' + author.shortName + ')\n';
    }
    return authorsOverview.trim();
  }
  ngOnInit(): void {}
}
