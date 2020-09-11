import Logger from '@harmonyjs/logger';
import VehicleService from '../services/vehicle'
const logger = Logger({
    name: 'Vehicles',
    configuration: {
        console: true,
    },
});
const VehiclesRoute = async (server, opts, next) => {
    // Get Vehicles
    server.route({
        method: 'GET',
        url: '/vehicles',
        preHandler: server.auth([server.authenticateAccount]),
        async handler(req, res) {
            try {
                const vehicles = VehicleService.getDrivers().map((vehicle) => {
                    return {
                        id: vehicle.id,
                        name: vehicle.name,
                        vehicle: vehicle.vehicle,
                        speed: vehicle.speed,
                        temperature: vehicle.temperature,
                        location: vehicle.location,
                        lastUpdate: vehicle.lastUpdate,
                        plate: vehicle.plate,
                        online: vehicle.online,
                    };
                });
                return vehicles;
            }
            catch (err) {
                logger.error('Error', err);
                return res.code(500).send({
                    statusCode: 500,
                    error: 'Internal Server Error',
                });
            }
        },
    });
    // Set vehicle online
    server.route({
        method: 'POST',
        url: '/vehicles/online/:id',
        preHandler: server.auth([server.authenticateAccount]),
        async handler(req, res) {
            try {
                VehicleService.setVehicleOnline(req.params.id);
                return {};
            }
            catch (err) {
                logger.error('Error', err);
                return res.code(500).send({
                    statusCode: 500,
                    error: 'Internal Server Error',
                });
            }
        },
    });
    // Set vehicle offline
    server.route({
        method: 'POST',
        url: '/vehicles/offline/:id',
        preHandler: server.auth([server.authenticateAccount]),
        async handler(req, res) {
            try {
                VehicleService.setVehicleOffline(req.params.id);
                return {};
            }
            catch (err) {
                logger.error('Error', err);
                return res.code(500).send({
                    statusCode: 500,
                    error: 'Internal Server Error',
                });
            }
        },
    });
    next();
};
export default VehiclesRoute;
