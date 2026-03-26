exports.handler = async (event) => {
  if (event.rawPath === '/health' || event.requestContext?.http?.path === '/health') {
    return { statusCode: 200, body: JSON.stringify({ status: 'ok', env: process.env.ENVIRONMENT }) };
  }
  return { statusCode: 200, body: JSON.stringify({ message: 'Gatherly API placeholder' }) };
};
