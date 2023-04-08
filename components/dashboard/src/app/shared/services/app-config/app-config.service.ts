import { Injectable, Inject } from '@angular/core';
import { defaultsDeep } from 'lodash';

export interface IAppConfigInterface {
  APP_API_URL: string;
}

const defaultConfig: IAppConfigInterface = {
    APP_API_URL: 'http://localhost:3200',
};

@Injectable()
export class AppConfigService {
    private readonly config: IAppConfigInterface;

    constructor(@Inject('app.config') appConfig: IAppConfigInterface) {
        this.config = defaultsDeep(appConfig, defaultConfig);
    }

    public get(key: string): string {
        return this.config[key];
    }
}
