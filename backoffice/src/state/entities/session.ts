import {
    observable, action, computed, reaction,
} from 'mobx'
import { axios, base64 } from "../../utils/misc";
import { AxiosInstance } from "axios";

export default class StateSession {
    configuration = null
    api: AxiosInstance | null = null

    constructor(configurationState: any) {
        configurationState.then(async (configuration: any) => {
            this.configuration = configuration

            // Create API client
            this.api = axios.create({
                // @ts-ignore
                baseURL: `${this.configuration.endpoint.host}`,
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' },
                responseType: 'json',
            })

            // @ts-ignore
            this.updateToken(window.localStorage.getItem('token'))

            this.check()

            window.setInterval(this.check, 1000 * 60 * 60) // Check and renew token every hour
        })

        reaction(() => configurationState.online, () => {
            this.online = configurationState.online
        }, { fireImmediately: true })
    }

    @observable loading = true;

    @observable token = null;

    // Online until proven otherwise
    @observable online = true;

    @computed get connected() {
        return !!this.token
    }

    // Not implemented (not needed for test)
    @action.bound async check() {
    }

    @action.bound updateToken(token: any) {
        if (token) {
            window.localStorage.setItem('token', token)
        } else {
            window.localStorage.removeItem('token')
        }

        this.loading = false

        // @ts-ignore
        this.token = token

        if (this.api)
            this.api.defaults.headers.common.Authorization = `Bearer ${token}`;
    }

    @action.bound async connect({ login, password }: { login: string, password: string }) {
        return await this?.api.post('login', { login, password })
    }

    @observable locale = null
}
