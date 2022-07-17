import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContentHeaderButton } from 'src/app/shared/components/content-header/content-header.component';

@Component({
  selector: 'app-widgets',
  templateUrl: './widgets.component.html',
  styleUrls: ['./widgets.component.scss']
})
export class WidgetsComponent implements OnInit {
  public buttons: ContentHeaderButton[] = [{
    text: 'Create widget',
    icon: 'add',
    action: this.onAddClick.bind(this),
    color: 'primary'
  }]
  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  public onAddClick(): void {
    this.router.navigate(['widgets/create'])
  }

}
