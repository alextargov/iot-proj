import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  Button,
  Category,
  COLOUR_CATEGORY,
  CustomBlock,
  FUNCTIONS_CATEGORY,
  Label,
  LISTS_CATEGORY,
  LOGIC_CATEGORY,
  LOOP_CATEGORY,
  MATH_CATEGORY,
  NgxBlocklyComponent,
  NgxBlocklyConfig,
  NgxBlocklyGenerator, NgxBlocklyToolbox,
  Separator,
  TEXT_CATEGORY,
  VARIABLES_CATEGORY,
  Blockly
} from 'ngx-blockly';
import { delay, filter } from 'rxjs';

@UntilDestroy()
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'dashboard';

  public readOnly = false;
    constructor(private observer: BreakpointObserver, private router: Router) {
    }

    ngAfterViewInit(): void {
      this.observer
        .observe(['(max-width: 800px)'])
        .pipe(delay(1), untilDestroyed(this))
        .subscribe((res) => {

        });

      this.router.events
        .pipe(
          untilDestroyed(this),
          filter((e) => e instanceof NavigationEnd)
        )
        .subscribe(() => {

        });
    }

    onCode(code: string) {
        console.log(code);
    }
}
