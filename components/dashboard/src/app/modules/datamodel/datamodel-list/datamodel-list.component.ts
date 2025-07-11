// connect device with the app - like CMP

import { Component, OnInit } from '@angular/core'
import {animate, state, style, transition, trigger} from '@angular/animations';
import {ContentHeaderButton} from "../../../shared/components/content-header/content-header.component";
import {Router} from "@angular/router";

@Component({
    selector: 'app-datamodel-list',
    templateUrl: './datamodel-list.component.html',
    styleUrls: ['./datamodel-list.component.scss'],
    animations: [
        trigger('detailExpand', [
            state('collapsed', style({height: '0px', minHeight: '0'})),
            state('expanded', style({height: '*'})),
            transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
        ]),
    ],
})
export class DatamodelListComponent implements OnInit {
    public dataSource = [{name: "one", description: "one description", createdAt: new Date()}, {name: "two", description: "two description", createdAt: new Date()}];
    public columnsToDisplay = ['name', 'createdAt'];
    public columnsToDisplayWithExpand = [...this.columnsToDisplay, 'expand'];
    public expandedElement: any | null;

    constructor(private router: Router) {
    }

    public buttons: ContentHeaderButton[] = [
        {
            text: 'Create data model',
            icon: 'add',
            action: this.onAddClick.bind(this),
            color: 'primary',
        },
    ]

    public ngOnInit(): void {
    }

    public async onAddClick() {
        try {
            await this.router.navigate(['datamodel/create'])
        } catch (e) {
            console.log(e)
        }
    }

}
