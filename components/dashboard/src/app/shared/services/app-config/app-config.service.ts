import { Injectable, Inject } from '@angular/core'
import { defaultsDeep } from 'lodash'

export interface IAppConfigInterface {
    APP_API_URL: string,
    APP_LOGIN_URL: string,
    APP_REGISTER_URL: string,
}

const defaultConfig: IAppConfigInterface = {
    APP_API_URL: 'http://localhost:8080',
    APP_LOGIN_URL: '/login',
    APP_REGISTER_URL: '/register',
}

@Injectable()
export class AppConfigService {
    private readonly config: IAppConfigInterface

    constructor(@Inject('app.config') appConfig: IAppConfigInterface) {
        this.config = defaultsDeep(appConfig, defaultConfig)
    }

    public get(key: string): string {
        return this.config[key]
    }
}
