import {
	IDataObject,
	IHookFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	NodeOperationError,
} from 'n8n-workflow';

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
		// Shows the webhook URL and test button in the n8n UI
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
				const response = await this.helpers.httpRequest({
					method: 'GET',
					url: `${credentials.domain}/api/leads/getSheets`,
					headers: { 'X-API-KEY': credentials.apiKey as string },
				});
				return (response.data as any[]).map((sheet: any) => ({
					name: sheet.sheetName,
					value: sheet.id,
				}));
			},

			async getPipelines(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('syncXApi');
				const response = await this.helpers.httpRequest({
					method: 'GET',
					url: `${credentials.domain}/api/pipeline/getPipelines`,
					headers: { 'X-API-KEY': credentials.apiKey as string },
				});
				return (response.data as any[]).map((pipeline: any) => ({
					name: pipeline.title,
					value: pipeline.id,
				}));
			},

			async getPipelineStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('syncXApi');
				const pipelineId = this.getCurrentNodeParameter('pipelineId') as string;
				if (!pipelineId) return [];
				const response = await this.helpers.httpRequest({
					method: 'GET',
					url: `${credentials.domain}/api/pipeline/getPipeline`,
					headers: { 'X-API-KEY': credentials.apiKey as string },
					qs: { pipelineId },
				});
				return (response.data.stages as any[]).map((stage: any) => ({
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
				// Only consider it existing if we have a real saved ID
				return typeof webhookData.webhookId === 'number' || typeof webhookData.webhookId === 'string';
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials('syncXApi');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const sheetId = this.getNodeParameter('sheetId') as string;
				const stages = this.getNodeParameter('stages') as string[];

				const response = await this.helpers.httpRequest({
					method: 'POST',
					url: `${credentials.domain}/api/user/createWebhook`,
					headers: {
						'X-API-KEY': credentials.apiKey as string,
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
					body: {
						url: webhookUrl,
						action: 'StageChange',
						stageIds: stages.toString(), // comma-separated string matching Zapier's format
						sheetId,
					},
					json: true,
				});

				// Handle both { data: { id } } and { id } response shapes
				const webhookId = response?.data?.id ?? response?.id;

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
						await this.helpers.httpRequest({
							method: 'POST',
							url: `${credentials.domain}/api/user/deleteWebhook`,
							headers: {
								'X-API-KEY': credentials.apiKey as string,
								'Content-Type': 'application/json',
							},
							body: { id: webhookData.webhookId },
							json: true,
						});
					} catch {
						// Webhook may have already been removed on the SyncX side — safe to continue
					}
					delete webhookData.webhookId;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// getBodyData() is typed as IDataObject but SyncX may send an array,
		// so cast broadly and normalise to an array either way.
		const body = this.getBodyData() as IDataObject | IDataObject[];

		const items: IDataObject[] = Array.isArray(body) ? body : [body];

		return {
			workflowData: [items.map((item) => ({ json: item }))],
		};
	}
}
