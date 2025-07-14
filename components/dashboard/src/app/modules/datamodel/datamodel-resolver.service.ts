// datamodel-resolver.service.ts
import {Injectable} from "@angular/core";
import {Resolve} from "@angular/router";
import {DatamodelService} from "../../shared/services/datamodel/datamodel.service";
import {map, Observable} from "rxjs";

@Injectable({ providedIn: 'root' })
export class DatamodelResolver implements Resolve<any> {
    constructor( private datamodelService: DatamodelService,) {}

    resolve(): Observable<any> {
        console.log('Resolving data models...');

        return this.datamodelService.listDataModels().pipe(
            map(dataModels => {
                // Example transformation (customize this as needed)
                return dataModels.map(model => ({
                    ...model,
                    displayName: `${model.name} (${model.id})`
                }));
            })
        );
    }
}
