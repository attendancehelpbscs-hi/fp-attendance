const constants = {
  apiBase: '/api',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: '7d',
  bcryptRounds: 12,
};

export default constants;