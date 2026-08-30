import { Component, OnInit } from '@angular/core';
import { MeGQL, MeQuery } from '../../shared/graphql/generated';

@Component({
    standalone: false,
    selector: 'app-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
    me: MeQuery['me'] | null = null;
    loading = true;

    constructor(private meGQL: MeGQL) {}

    ngOnInit(): void {
        this.meGQL.fetch({ fetchPolicy: 'network-only' }).subscribe({
            next: (res) => {
                this.me = res.data?.me ?? null;
                this.loading = false;
            },
            error: () => {
                this.loading = false;
            },
        });
    }
}
