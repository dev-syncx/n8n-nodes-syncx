import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SyncXApi implements ICredentialType {
	name = 'syncXApi';
	displayName = 'SyncX API';
	documentationUrl = 'https://syncx.dev';
	properties: INodeProperties[] = [
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: 'https://app.syncx.dev',
			placeholder: 'https://app.syncx.dev',
			description: 'Base URL of your SyncX instance, e.g. https://app.syncx.dev',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-KEY': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.domain}}',
			url: '/api/leads/getSheets',
		},
	};
}
