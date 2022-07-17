import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
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

  @ViewChild(MatSidenav)
  sidenav!: MatSidenav;

  public readOnly = false;

    public customBlocks: CustomBlock[] = [

    ];
    public button: Button = new Button('asd', 'asdasd');
    public label: Label = new Label('asd', 'asdasd');

    public config: NgxBlocklyConfig = {
        toolbox: '<xml id="toolbox" style="display: none">' +
            '<category name="Logic" colour="%{BKY_LOGIC_HUE}">' +
            '<block type="controls_if"></block>' +
            '<block type="controls_repeat_ext"></block>' +
            '<block type="logic_compare"></block>' +
            '<block type="math_number_property"></block>' +
            '<block type="math_number"></block>' +
            '<block type="math_arithmetic"></block>' +
            '<block type="text"></block>' +
            '<block type="text_print"></block>' +
            '<block type="example_block"></block>' +
            '</category>' +
            '</xml>',
        trashcan: true,
        generators: [
            NgxBlocklyGenerator.JAVASCRIPT,
        ],
        defaultBlocks: true,
        move: {
            scrollbars: true,
            wheel: true
        }

        // plugins: {
        //     'toolbox': NgxBlocklyToolbox
        // },

    };

    @ViewChild('blockly') blocklyComponent: NgxBlocklyComponent;

    constructor(private observer: BreakpointObserver, private router: Router) {
        const workspace = new Blockly.WorkspaceSvg(new Blockly.Options({}));
        const toolbox: NgxBlocklyToolbox = new NgxBlocklyToolbox(workspace);
        toolbox.nodes = [
            LOGIC_CATEGORY,
            new Category('bla', '#ff0000', [...this.customBlocks, this.button, this.label]),
            LOOP_CATEGORY,
            MATH_CATEGORY,
            TEXT_CATEGORY,
            LISTS_CATEGORY,
            COLOUR_CATEGORY,
            new Separator(),
            VARIABLES_CATEGORY,
            FUNCTIONS_CATEGORY,
        ];
        this.config.toolbox = toolbox.toXML();
    }

    ngAfterViewInit(): void {
        // Blockly.Variables.createVariable(this.blocklyComponent.workspace, null, 'asdasd');
        // this.blocklyComponent.workspace.createVariable('asdads', null, null);
      this.observer
        .observe(['(max-width: 800px)'])
        .pipe(delay(1), untilDestroyed(this))
        .subscribe((res) => {
          if (res.matches) {
            this.sidenav.mode = 'over';
            this.sidenav.close();
          } else {
            this.sidenav.mode = 'side';
            this.sidenav.open();
          }
        });

      this.router.events
        .pipe(
          untilDestroyed(this),
          filter((e) => e instanceof NavigationEnd)
        )
        .subscribe(() => {
          if (this.sidenav.mode === 'over') {
            this.sidenav.close();
          }
        });
    }

    onCode(code: string) {
        console.log(code);
    }
}
