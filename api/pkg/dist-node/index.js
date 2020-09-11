'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = _interopDefault(require('path'));
var fs = _interopDefault(require('fs'));
var jsYaml = _interopDefault(require('js-yaml'));
var Fastify = _interopDefault(require('fastify'));
var FastifyCors = _interopDefault(require('fastify-cors'));
var FastifyAuth = _interopDefault(require('fastify-auth'));
var FastifyJWT = _interopDefault(require('fastify-jwt'));
var Logger = _interopDefault(require('@harmonyjs/logger'));
var aes256 = _interopDefault(require('aes256'));
var polyline = _interopDefault(require('@mapbox/polyline'));
var turf = _interopDefault(require('@turf/turf'));
var moment = _interopDefault(require('moment'));

function AuthenticationService() {
  const instance = {
    logger: Logger({
      name: 'Authentication',
      configuration: {
        console: true
      }
    }),
    account: null,

    configure(account) {
      this.account = account;
    },

    async authenticateAccount(args) {
      try {
        var _decoded$payload;

        // Decode JSON
        const decoded = await args.req.jwtVerify();

        if (decoded === null || decoded === void 0 ? void 0 : (_decoded$payload = decoded.payload) === null || _decoded$payload === void 0 ? void 0 : _decoded$payload.userId) {
          // Verify account is present
          if (!this.account || decoded.payload.userId === this.account.id) {
            const user = this.account;
            return Object.assign(args.req, {
              user
            });
          }
        } // Error


        return args.res.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error'
        });
      } catch (e) {
        return args.res.code(401).send({
          statusCode: 401,
          error: 'Credentials invalid',
          message: e.message
        });
      }
    }

  };
  return instance;
}

var AuthenticationService$1 = AuthenticationService();

// @ts-ignore

function EncryptionService() {
  const instance = {
    secret: '',

    configure(configuration) {
      this.secret = configuration.secret;
    },

    encryptPassword(args) {
      return aes256.encrypt(this.secret, args.password + args.salt).toString();
    },

    comparePassword(args) {
      return aes256.decrypt(this.secret, args.encrypted) === args.password + args.salt;
    }

  };
  return instance;
}

var EncryptionService$1 = EncryptionService();

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly) symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    });
    keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};

    if (i % 2) {
      ownKeys(Object(source), true).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(Object(source)).forEach(function (key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }

  return target;
}

const UPDATE_INTERVAL = 1000;
const SPEED_VARIATION = 2;
const TEMPERATURE_VARIATION = 1;

function VehicleService() {
  const instance = {
    logger: Logger({
      name: 'Vehicle',
      configuration: {
        console: true
      }
    }),
    vehicles: [],

    configure(vehicles) {
      // Initialize vehicles
      this.initializeVehicles(vehicles); // Update vehicles

      setInterval(() => this.updateVehicles(), UPDATE_INTERVAL);
    },

    initializeVehicles(vehicles) {
      this.vehicles = vehicles.map(vehicle => {
        const coordinates = polyline.decode(vehicle.polyline);
        const line = turf.lineString(coordinates);
        const options = {
          units: 'meters'
        };
        const location = turf.along(line, 0, options);
        return _objectSpread2(_objectSpread2({}, vehicle), {}, {
          defaultSpeed: vehicle.speed,
          defaultTemperature: vehicle.temperature,
          location: location.geometry.coordinates,
          line,
          distance: 0
        });
      });
    },

    updateVehicles() {
      this.vehicles.forEach(vehicle => {
        // Update only if vehicle is active
        if (vehicle.online) {
          // Update vehicle position
          const options = {
            units: 'meters'
          };
          const location = turf.along(vehicle.line, vehicle.distance, options);
          vehicle.location = location.geometry.coordinates; // Increment traveled distance

          const metersTraveled = vehicle.defaultSpeed / 3.6;
          vehicle.distance += metersTraveled; // Reinitialize position at end of route

          const routeLength = turf.length(vehicle.line, {
            units: 'meters'
          });

          if (vehicle.distance >= routeLength) {
            vehicle.distance = 0;
          } // Random speed


          const minSpeed = vehicle.defaultSpeed - SPEED_VARIATION;
          const maxSpeed = vehicle.defaultSpeed + SPEED_VARIATION;
          vehicle.speed = Math.floor(Math.random() * (maxSpeed - minSpeed + 1) + minSpeed); // Random temperature

          const minTemperature = vehicle.defaultTemperature - TEMPERATURE_VARIATION;
          const maxTemperature = vehicle.defaultTemperature + TEMPERATURE_VARIATION;
          vehicle.temperature = Math.floor(Math.random() * (maxTemperature - minTemperature + 1) + minTemperature); // Last update time

          vehicle.lastUpdate = moment().toISOString();
        } else {
          vehicle.speed = 0;
        }
      });
    },

    getDrivers() {
      return this.vehicles;
    },

    setVehicleOnline(id) {
      const vehicle = this.vehicles.find(vehicle => vehicle.id === id);

      if (!vehicle) {
        throw new Error('vehicle_not_found');
      }

      vehicle.online = true;
      this.logger.info(`Vehicle ${id} online`);
    },

    setVehicleOffline(id) {
      const vehicle = this.vehicles.find(vehicle => vehicle.id === id);

      if (!vehicle) {
        throw new Error('vehicle_not_found');
      }

      vehicle.online = false;
      this.logger.info(`Vehicle ${id} offline`);
    }

  };
  return instance;
}

var VehicleService$1 = VehicleService();

const ReadinessRoute = {
  method: 'GET',
  url: '/',

  async handler() {
    return true;
  }

};

const GeneralStatusRoute = {
  method: 'GET',
  url: '/general/status',

  async handler() {
    const response = {
      environment: 'PRODUCTION',
      status: 'OK'
    };
    return response;
  }

};

const GeneralVersionRoute = {
  method: 'GET',
  url: '/general/version',

  async handler() {
    const response = {
      buildDate: '17/05/2020 19:00:00 +02:00',
      buildVersion: '1.0.0',
      apiVersion: 'v1'
    };
    return response;
  }

};

const logger = Logger({
  name: 'AccountLogin',
  configuration: {
    console: true
  }
});

const LoginRoute = async (server, opts, next) => {
  server.route({
    method: 'POST',
    url: '/login',

    async handler(req, res) {
      try {
        const {
          user,
          password
        } = req.body; // Check user

        if (!user || user.trim().length === 0) {
          return res.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'internal_error'
          });
        } // Check password


        if (!password || password.trim().length === 0) {
          return res.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'internal_error'
          });
        } // Get account


        const account = req.conf.account; // Verify account is present

        if (!account || user !== account.email) {
          return res.code(401).send({
            statusCode: 401,
            error: 'Bad Request',
            message: 'user_not_found'
          });
        } // Decrypt password


        const passwordMatch = EncryptionService$1.comparePassword({
          password,
          salt: account.id,
          encrypted: account.password
        }); // Check password

        if (!passwordMatch) {
          return res.code(401).send({
            statusCode: 401,
            error: 'Bad Request',
            message: 'wrong_credentials'
          });
        } // Generate jwtToken


        const payload = {
          userId: account.id,
          name: account.name,
          isAdmin: false
        };
        const token = server.jwt.sign({
          payload
        });
        return res.code(200).send({
          token
        });
      } catch (err) {
        logger.error('Error', err);
        return res.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error'
        });
      }
    }

  });
  next();
};

const logger$1 = Logger({
  name: 'Vehicles',
  configuration: {
    console: true
  }
});

const VehiclesRoute = async (server, opts, next) => {
  // Get Vehicles
  server.route({
    method: 'GET',
    url: '/vehicles',
    preHandler: server.auth([server.authenticateAccount]),

    async handler(req, res) {
      try {
        const vehicles = VehicleService$1.getDrivers().map(vehicle => {
          return {
            id: vehicle.id,
            name: vehicle.name,
            vehicle: vehicle.vehicle,
            speed: vehicle.speed,
            temperature: vehicle.temperature,
            location: vehicle.location,
            lastUpdate: vehicle.lastUpdate,
            plate: vehicle.plate,
            online: vehicle.online
          };
        });
        return vehicles;
      } catch (err) {
        logger$1.error('Error', err);
        return res.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error'
        });
      }
    }

  }); // Set vehicle online

  server.route({
    method: 'POST',
    url: '/vehicles/online/:id',
    preHandler: server.auth([server.authenticateAccount]),

    async handler(req, res) {
      try {
        VehicleService$1.setVehicleOnline(req.params.id);
        return {};
      } catch (err) {
        logger$1.error('Error', err);
        return res.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error'
        });
      }
    }

  }); // Set vehicle offline

  server.route({
    method: 'POST',
    url: '/vehicles/offline/:id',
    preHandler: server.auth([server.authenticateAccount]),

    async handler(req, res) {
      try {
        VehicleService$1.setVehicleOffline(req.params.id);
        return {};
      } catch (err) {
        logger$1.error('Error', err);
        return res.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error'
        });
      }
    }

  });
  next();
};

async function loadLogger() {
  return Logger({
    name: 'ApplicationImport',
    configuration: {
      console: true
    }
  });
}

async function loadConfiguration(confPath, logger) {
  logger.info('Loading configuration');
  let confAsYaml = null;

  try {
    confAsYaml = fs.readFileSync(confPath, 'utf-8');
  } catch (err) {
    logger.error('Unable to load configuration. Exiting.');
    process.exit(0);
  }

  const conf = jsYaml.safeLoad(confAsYaml);
  logger.info('Configuration loaded');
  return conf.app;
}

async function launchServer(conf, logger) {
  var _conf$encryption, _conf$authentication;

  logger.info('Launching server');
  const server = Fastify();
  server.register(FastifyCors);
  server.register(FastifyAuth);
  server.register(FastifyJWT, {
    secret: (_conf$encryption = conf.encryption) === null || _conf$encryption === void 0 ? void 0 : _conf$encryption.secret,
    sign: {
      algorithm: 'HS512',
      expiresIn: ((_conf$authentication = conf.authentication) === null || _conf$authentication === void 0 ? void 0 : _conf$authentication.expiresIn) ? conf.authentication.expiresIn : '1 hour'
    }
  }); // Readiness endpoint

  server.route(ReadinessRoute); // Mount general endpoints

  server.route(GeneralStatusRoute);
  server.route(GeneralVersionRoute); // Endpoints

  server.register(LoginRoute);
  server.register(VehiclesRoute); // Add conf

  server.decorateRequest('conf', conf); // Authenticate methods

  server.decorate('authenticateAccount', (req, res, done) => AuthenticationService$1.authenticateAccount({
    req,
    res,
    done
  }));
  await server.listen(conf.server.port, conf.server.host);
  logger.info(`Server ready at ${conf.server.host}:${conf.server.port}`);
}

async function run() {
  const logger = await loadLogger();
  const conf = await loadConfiguration(path.resolve('../conf/application.yml'), logger); // Configure services

  if (conf.encryption) {
    EncryptionService$1.configure(conf.encryption);
  }

  if (conf.account) {
    AuthenticationService$1.configure(conf.account);
  }

  if (conf.vehicles) {
    VehicleService$1.configure(conf.vehicles);
  }

  await launchServer(conf, logger);
}

run().catch(err => {
  console.error('Fatal error: ');
  console.error(err);
  process.exit(-1);
});
//# sourceMappingURL=index.js.map
