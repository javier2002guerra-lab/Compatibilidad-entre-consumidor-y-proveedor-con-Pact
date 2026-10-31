// Desactiva la telemetría anónima de Pact (los workers de Jest heredan esta variable).
process.env.PACT_DO_NOT_TRACK = 'true';

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 60000,
  verbose: true,
};
