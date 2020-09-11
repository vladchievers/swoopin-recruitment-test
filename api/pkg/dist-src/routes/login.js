import Logger from '@harmonyjs/logger';
import EncryptionService from '../services/encryption'
const logger = Logger({
    name: 'AccountLogin',
    configuration: {
        console: true,
    },
});
const LoginRoute = async (server, opts, next) => {
    server.route({
        method: 'POST',
        url: '/login',
        async handler(req, res) {
            try {
                const { user, password } = req.body;
                // Check user
                if ((!user) || (user.trim().length === 0)) {
                    return res.code(400).send({
                        statusCode: 400,
                        error: 'Bad Request',
                        message: 'internal_error',
                    });
                }
                // Check password
                if ((!password) || (password.trim().length === 0)) {
                    return res.code(400).send({
                        statusCode: 400,
                        error: 'Bad Request',
                        message: 'internal_error',
                    });
                }
                // Get account
                const account = req.conf.account;
                // Verify account is present
                if ((!account) || (user !== account.email)) {
                    return res.code(401).send({
                        statusCode: 401,
                        error: 'Bad Request',
                        message: 'user_not_found',
                    });
                }
                // Decrypt password
                const passwordMatch = EncryptionService.comparePassword({
                    password,
                    salt: account.id,
                    encrypted: account.password,
                });
                // Check password
                if (!passwordMatch) {
                    return res.code(401).send({
                        statusCode: 401,
                        error: 'Bad Request',
                        message: 'wrong_credentials',
                    });
                }
                // Generate jwtToken
                const payload = {
                    userId: account.id,
                    name: account.name,
                    isAdmin: false,
                };
                const token = server.jwt.sign({ payload });
                return res.code(200).send({ token });
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
export default LoginRoute;
