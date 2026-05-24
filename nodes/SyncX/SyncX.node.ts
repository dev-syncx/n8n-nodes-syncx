import {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

// n8n's type for httpRequestWithAuthentication uses `this: IAllExecuteFunctions`,
// but the method is available at runtime in all helper contexts.
// This augmentation removes the constraint so it compiles in loadOptions/execute.
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
	columns?: Array<{ columnName: string }>;
}

interface SyncXPipeline {
	id: string | number;
	title: string;
}

interface SyncXStage {
	id: string | number;
	stageTitle: string;
}

interface SyncXTeamMember {
	invitedUserId: string | number;
	invitingUserId: string | number;
	name?: string;
	invitedUser?: { name: string };
}

interface SyncXAgent {
	id: string | number;
	name: string;
	stages?: Array<{ stageTitle: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────

export class SyncX implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SyncX',
		name: 'syncX',
		icon: 'file:syncx.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{{"createUpdateLead":"Create or Update Lead"}[$parameter["operation"]]}}',
		description: 'Create and update leads in SyncX',
		defaults: {
			name: 'SyncX',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'syncXApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create or Update Lead',
						value: 'createUpdateLead',
						description: 'Creates a new lead or updates an existing lead',
						action: 'Create or update a lead',
					},
				],
				default: 'createUpdateLead',
			},

			// ── Required fields ───────────────────────────────────────────
			{
				displayName: 'Smartsheet Name or ID',
				name: 'smartListId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getSmartsheets' },
				required: true,
				default: '',
				description: 'The smartsheet list the lead belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: { show: { operation: ['createUpdateLead'] } },
			},
			{
				displayName: 'Pipeline Name or ID',
				name: 'pipelineId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getPipelines' },
				required: true,
				default: '',
				description: 'The pipeline for the lead. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: { show: { operation: ['createUpdateLead'] } },
			},
			{
				displayName: 'Phone Number',
				name: 'phoneNumber',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { operation: ['createUpdateLead'] } },
			},

			// ── Standard lead fields ──────────────────────────────────────
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['createUpdateLead'] } },
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['createUpdateLead'] } },
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				displayOptions: { show: { operation: ['createUpdateLead'] } },
			},
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['createUpdateLead'] } },
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				displayOptions: { show: { operation: ['createUpdateLead'] } },
			},
			{
				displayName: 'Tag',
				name: 'tag',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['createUpdateLead'] } },
			},

			// ── Pipeline / stage ─────────────────────────────────────────
			{
				displayName: 'Stage Name or ID',
				name: 'stage',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPipelineStages',
					loadOptionsDependsOn: ['pipelineId'],
				},
				default: '',
				description: 'Pipeline stage for the lead — reloads when Pipeline changes. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: { show: { operation: ['createUpdateLead'] } },
			},

			// ── Appointment ───────────────────────────────────────────────
			{
				displayName: 'Appointment Date & Time',
				name: 'appointmentDateAndTime',
				type: 'string',
				placeholder: 'Dec 25, 2025, 5pm',
				description: 'Format: Dec 25, 2025, 5pm',
				default: '',
				displayOptions: { show: { operation: ['createUpdateLead'] } },
			},
			{
				displayName: 'Appointment Duration',
				name: 'appointment_duration',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['createUpdateLead'] } },
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['createUpdateLead'] } },
			},
			{
				displayName: 'Meeting Location',
				name: 'location',
				type: 'string',
				description: 'Google Meet or Zoom link',
				default: '',
				displayOptions: { show: { operation: ['createUpdateLead'] } },
			},

			// ── Assignment ────────────────────────────────────────────────
			{
				displayName: 'Team Names or IDs',
				name: 'teamsAssigned',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getTeams' },
				default: [],
				description: 'Team members to assign to this lead. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: { show: { operation: ['createUpdateLead'] } },
			},
			{
				displayName: 'Agent Names or IDs',
				name: 'mainAgentIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getAgents',
					loadOptionsDependsOn: ['pipelineId'],
				},
				default: [],
				description: 'Outbound agents to assign — reloads when Pipeline changes. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: { show: { operation: ['createUpdateLead'] } },
			},

			// ── Dynamic smartsheet columns ────────────────────────────────
			{
				displayName: 'Extra Smartsheet Columns',
				name: 'extraColumns',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Column',
				default: {},
				description: 'Column names reload when Smartsheet changes',
				displayOptions: { show: { operation: ['createUpdateLead'] } },
				options: [
					{
						name: 'values',
						displayName: 'Column',
						values: [
							{
								displayName: 'Column Name or ID',
								name: 'columnName',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getSmartsheetColumns',
									loadOptionsDependsOn: ['smartListId'],
								},
								default: '',
								description: 'Pick a column — reloads when Smartsheet changes. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getSmartsheets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('syncXApi');
				const response = await this.helpers.httpRequestWithAuthentication.call(this, 'syncXApi', {
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
				const response = await this.helpers.httpRequestWithAuthentication.call(this, 'syncXApi', {
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
				const response = await this.helpers.httpRequestWithAuthentication.call(this, 'syncXApi', {
					method: 'GET',
					url: `${credentials.domain}/api/pipeline/getPipeline`,
					qs: { pipelineId },
				});
				return ((response.data as { stages: SyncXStage[] }).stages).map((stage) => ({
					name: stage.stageTitle,
					value: stage.id,
				}));
			},

			async getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('syncXApi');
				const response = await this.helpers.httpRequestWithAuthentication.call(this, 'syncXApi', {
					method: 'GET',
					url: `${credentials.domain}/api/team/getTeamMembers`,
				});
				return (response.data as SyncXTeamMember[]).map((member) => ({
					name: member.invitedUser?.name ?? member.name ?? String(member.invitedUserId),
					value: member.invitingUserId,
				}));
			},

			async getAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('syncXApi');
				const pipelineId = this.getCurrentNodeParameter('pipelineId') as string;
				const response = await this.helpers.httpRequestWithAuthentication.call(this, 'syncXApi', {
					method: 'GET',
					url: `${credentials.domain}/api/agent/getAgents`,
					qs: { agentType: 'outbound', pipelineId, pipeline: true },
				});
				return (response.data as SyncXAgent[]).map((agent) => {
					const stages = (agent.stages ?? []).map((s) => s.stageTitle).join(', ');
					return {
						name: stages ? `${agent.name} (${stages})` : agent.name,
						value: agent.id,
					};
				});
			},

			async getSmartsheetColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('syncXApi');
				const smartListId = this.getCurrentNodeParameter('smartListId') as string;
				if (!smartListId) return [];
				const response = await this.helpers.httpRequestWithAuthentication.call(this, 'syncXApi', {
					method: 'GET',
					url: `${credentials.domain}/api/leads/getSheets`,
				});
				const sheet = (response.data as SyncXSheet[]).find(
					(s) => String(s.id) === String(smartListId),
				);
				if (!sheet?.columns?.length) return [];
				const builtIn = new Set(['First Name', 'Last Name', 'Phone Number', 'Email']);
				return sheet.columns
					.filter((col) => !builtIn.has(col.columnName))
					.map((col) => ({ name: col.columnName, value: col.columnName }));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('syncXApi');

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;

			if (operation === 'createUpdateLead') {
				const body: Record<string, unknown> = {
					smartListId: this.getNodeParameter('smartListId', i),
					pipelineId: this.getNodeParameter('pipelineId', i),
					phoneNumber: this.getNodeParameter('phoneNumber', i),
				};

				const optionalScalars = [
					'firstName', 'lastName', 'email', 'address', 'notes', 'tag',
					'stage', 'appointmentDateAndTime', 'appointment_duration',
					'timezone', 'location',
				];
				for (const key of optionalScalars) {
					const val = this.getNodeParameter(key, i) as string;
					if (val) body[key] = val;
				}

				const teamsAssigned = this.getNodeParameter('teamsAssigned', i) as string[];
				if (teamsAssigned?.length) body.teamsAssigned = teamsAssigned;

				const mainAgentIds = this.getNodeParameter('mainAgentIds', i) as number[];
				if (mainAgentIds?.length) body.mainAgentIds = mainAgentIds;

				const extraColumns = this.getNodeParameter('extraColumns', i) as {
					values?: Array<{ columnName: string; value: string }>;
				};
				if (extraColumns?.values?.length) {
					for (const col of extraColumns.values) {
						if (col.columnName) body[col.columnName] = col.value;
					}
				}

				const response = await this.helpers.httpRequestWithAuthentication('syncXApi', {
					method: 'PUT',
					url: `${credentials.domain}/api/leads/updateLead`,
					headers: { 'Content-Type': 'application/json' },
					body,
					json: true,
				});

				returnData.push({ json: response as IDataObject, pairedItem: { item: i } });
			}
		}

		return [returnData];
	}
}
