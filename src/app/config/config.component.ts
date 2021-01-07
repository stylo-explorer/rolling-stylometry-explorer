import { Component, OnInit } from '@angular/core';
import {
  AuthorNameRelation,
  ClassificationService,
} from '../classification.service';
import { DataService } from '../data.service';

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss'],
})
export class ConfigComponent implements OnInit {
  constructor(public data: DataService) {}
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
