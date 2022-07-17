import { Component, Input, OnInit } from '@angular/core';

export interface ContentHeaderButton {
  action?: Function,
  text?: string,
  icon?: string,
  color?: string
}

@Component({
  selector: 'app-content-header',
  templateUrl: './content-header.component.html',
  styleUrls: ['./content-header.component.scss']
})
export class ContentHeaderComponent implements OnInit {
  @Input() public buttons: ContentHeaderButton;
  @Input() public title: string;

  constructor() { }

  ngOnInit(): void {
  }

}
