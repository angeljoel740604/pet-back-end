import React from 'react';
import ShipmentInfo from '../../Shipments/containers/ShipmentInfo/ShipmentInfo';
import ConfigContext from '../../src/context/config-context';
import getConfig from 'next/config';
import './shipments.scss';
import App from '../components/tableItems';

const { publicRuntimeConfig } = getConfig();

const Shipment = (props) => {
	return (
		<ConfigContext.Provider value={props.configData}>
			<App
				entityId={props.entityId}
				entityType={props.entityType}
				accountId={props.accountId}
			/>
		</ConfigContext.Provider>
	);
};

Shipment.getInitialProps = async function (context) {
	const entityId = context.query.id;
	const originUrl = context.req.headers.host;
	const entityType = context.query.entityType ? 'MgyShipment' : 'CargoRelease';

	return {
		configData: {
			urlPrefix: context.req.magayaContext.root,
			accountId: context.req.magayaContext.id,
			apiToken: context.req.magayaContext.apiToken,
			transactionType: entityType,
			transactionId: entityId,
			originUrl,
			...publicRuntimeConfig,
		},
		entityId,
		entityType,
	};
};

export default Shipment;
