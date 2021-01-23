import { BrowserModule } from '@angular/platform-browser';
import { Injector, NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { BookPreviewComponent } from './book-preview/book-preview.component';
import { BookComponent } from './book/book.component';
import { MfwSelectionComponent } from './mfw-selection/mfw-selection.component';
import { HttpClientModule } from '@angular/common/http';

import { OverlayModule } from '@angular/cdk/overlay';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { ExplorerComponent } from './explorer/explorer.component';
import { ConfigComponent } from './config/config.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { createCustomElement } from '@angular/elements';
import { SummaryComponent } from './summary/summary.component';
import { SideBySideComponent } from './side-by-side/side-by-side.component';
import { MatSelectModule } from '@angular/material/select';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { BookScrollingViewportDirective } from './book/book.scrolling-strategy';
@NgModule({
  declarations: [
    AppComponent,
    BookPreviewComponent,
    BookComponent,
    MfwSelectionComponent,

    ExplorerComponent,
    ConfigComponent,
    SummaryComponent,
    SideBySideComponent,
    BookScrollingViewportDirective,
  ],
  imports: [
    BrowserModule,
    MatSelectModule,
    MatTabsModule,
    MatButtonToggleModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatSlideToggleModule,
    MatSliderModule,
    MatTooltipModule,
    HttpClientModule,
    OverlayModule,
    BrowserAnimationsModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    MatInputModule,
    FormsModule,
    MatMenuModule,
    ScrollingModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(injector: Injector) {
    const myElement = createCustomElement(AppComponent, { injector });
    customElements.define('stylo-explorer', myElement);
  }
}
