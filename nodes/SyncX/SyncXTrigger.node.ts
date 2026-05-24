import {
	IDataObject,
	IHookFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	NodeOperationError,
} from 'n8n-workflow';
declare module 'n8n-workflow' {
	interface RequestHelperFunctions {
		httpRequestWithAuthentication(
			credentialsType: string,
			requestOptions: IHttpRequestOptions,
		): Promise<IDataObject>;
	}
}


// ── SyncX API response shapes ─────────────────────────────────────────────────

interface SyncXSheet {
	id: string | number;
	sheetName: string;
}

interface SyncXPipeline {
	id: string | number;
	title: string;
}

interface SyncXStage {
	id: string | number;
	stageTitle: string;
}

// ─────────────────────────────────────────────────────────────────────────────

export class SyncXTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SyncX Trigger',
		name: 'syncXTrigger',
		icon: 'file:syncx.svg',
		group: ['trigger'],
		version: 1,
		description: 'Triggers when a lead stage is updated in SyncX',
		defaults: {
			name: 'SyncX Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'syncXApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		triggerPanel: {
			header: '',
			executionsHelp: {
				inactive:
					'Activate the workflow to register the webhook with SyncX. Once active, SyncX will send data here whenever a lead stage changes.',
				active:
					'The workflow is active. SyncX is sending data to n8n whenever a lead stage matches your filters.',
			},
			activationHint:
				'Activate this workflow to register the webhook with SyncX. You must activate the workflow before SyncX can send events here.',
		},
		properties: [
			{
				displayName: 'Trigger Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Lead Stage Updated',
						value: 'leadStageUpdated',
						description: 'Fires when a lead moves to a new pipeline stage',
					},
				],
				default: 'leadStageUpdated',
			},
			{
				displayName: 'Smartsheet Name or ID',
				name: 'sheetId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getSmartsheets' },
				required: true,
				default: '',
				description: 'The smartsheet list to watch for stage changes. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Pipeline Name or ID',
				name: 'pipelineId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getPipelines' },
				required: true,
				default: '',
				description: 'The pipeline to watch. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Stage Names or IDs',
				name: 'stages',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getPipelineStages',
					loadOptionsDependsOn: ['pipelineId'],
				},
				required: true,
				default: [],
				description: 'Which stage transitions should trigger this workflow — reloads when Pipeline changes. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	};

	methods = {
		loadOptions: {
			async getSmartsheets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('syncXApi');
				const response = await this.helpers.httpRequestWithAuthentication('syncXApi', {
					method: 'GET',
					url: `${credentials.domain}/api/leads/getSheets`,
				});
				return (response.data as SyncXSheet[]).map((sheet) => ({
					name: sheet.sheetName,
					value: sheet.id,
				}));
			},

			async getPipelines(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('syncXApi');
				const response = await this.helpers.httpRequestWithAuthentication('syncXApi', {
					method: 'GET',
					url: `${credentials.domain}/api/pipeline/getPipelines`,
				});
				return (response.data as SyncXPipeline[]).map((pipeline) => ({
					name: pipeline.title,
					value: pipeline.id,
				}));
			},

			async getPipelineStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('syncXApi');
				const pipelineId = this.getCurrentNodeParameter('pipelineId') as string;
				if (!pipelineId) return [];
				const response = await this.helpers.httpRequestWithAuthentication('syncXApi', {
					method: 'GET',
					url: `${credentials.domain}/api/pipeline/getPipeline`,
					qs: { pipelineId },
				});
				return ((response.data as { stages: SyncXStage[] }).stages).map((stage) => ({
					name: stage.stageTitle,
					value: stage.id,
				}));
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				return typeof webhookData.webhookId === 'number' || typeof webhookData.webhookId === 'string';
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials('syncXApi');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const sheetId = this.getNodeParameter('sheetId') as string;
				const stages = this.getNodeParameter('stages') as string[];

				const response = await this.helpers.httpRequestWithAuthentication('syncXApi', {
					method: 'POST',
					url: `${credentials.domain}/api/user/createWebhook`,
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
					body: {
						url: webhookUrl,
						action: 'StageChange',
						stageIds: stages.toString(),
						sheetId,
					},
					json: true,
				});

				const webhookId = (response?.data as IDataObject)?.id ?? (response as IDataObject)?.id;

				if (webhookId === undefined || webhookId === null) {
					throw new NodeOperationError(
						this.getNode(),
						`SyncX did not return a webhook ID. Full response: ${JSON.stringify(response)}`,
					);
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = webhookId;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials('syncXApi');
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					try {
						await this.helpers.httpRequestWithAuthentication('syncXApi', {
							method: 'POST',
							url: `${credentials.domain}/api/user/deleteWebhook`,
							headers: { 'Content-Type': 'application/json' },
							body: { id: webhookData.webhookId },
							json: true,
						});
					} catch {
						// Webhook may have already been removed on the SyncX side
					}
					delete webhookData.webhookId;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData() as IDataObject | IDataObject[];
		const items: IDataObject[] = Array.isArray(body) ? body : [body];
		return {
			workflowData: [items.map((item) => ({ json: item }))],
		};
	}
}
