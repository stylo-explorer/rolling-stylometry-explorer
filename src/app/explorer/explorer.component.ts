import { Component, Input, OnInit } from '@angular/core';
import { ClassificationService } from '../classification.service';

@Component({
  selector: 'app-explorer',
  templateUrl: './explorer.component.html',
  styleUrls: ['./explorer.component.scss'],
  providers: [ClassificationService],
})
export class ExplorerComponent implements OnInit {
  constructor() {}
  @Input() public showGithub = true;

  ngOnInit(): void {}
}
