export interface IWidget {
    _id?: string
    tenantID: string
    name: string
    description: string
    status: WidgetStatus
    code: string
    workspace: string
    createdAt: number
    updatedAt: number
}

export enum WidgetStatus {
    INACTIVE = 'INACTIVE',
    ACTIVE = 'ACTIVE',
}
