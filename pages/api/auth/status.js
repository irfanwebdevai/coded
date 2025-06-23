export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // For now, return unauthenticated state
    // This will be updated when we integrate with the existing auth system
    res.status(200).json({
      isAuthenticated: false,
      user: null
    });
  } catch (error) {
    console.error('Auth status check error:', error);
    res.status(500).json({
      isAuthenticated: false,
      user: null,
      error: 'Authentication check failed'
    });
  }
} 