import express from 'express';
import passport from 'passport';

const router = express.Router();

// Discord OAuth routes
router.get('/discord', (req, res, next) => {
  // Get the origin from the request or use default
  const origin = req.get('Origin') || req.get('Referer') || 
    (process.env.NODE_ENV === 'production' ? process.env.VITE_APP_URL : 'http://localhost:5173');
  
  let baseUrl;
  try {
    baseUrl = new URL(origin).origin;
  } catch (error) {
    // Fallback if origin is invalid
    baseUrl = process.env.NODE_ENV === 'production' ? process.env.VITE_APP_URL : 'http://localhost:5173';
  }
  
  // Store the frontend origin in session for redirect after auth
  req.session.frontendOrigin = baseUrl;
  
  // Use the passport strategy which already has the correct callback URL configured
  passport.authenticate('discord')(req, res, next);
});

router.get('/discord/callback', 
  passport.authenticate('discord', {
    failureRedirect: '/auth/failure'
  }),
  (req, res) => {
    // Check if user is hub banned
    if (req.user && req.user.is_hub_banned) {
      return res.redirect(`${req.session.frontendOrigin}/banned?reason=${encodeURIComponent(req.user.hub_ban_reason || 'No reason provided')}`);
    }
    
    // Get the stored frontend origin or use default based on environment
    let frontendOrigin = req.session.frontendOrigin;
    
    if (!frontendOrigin) {
      frontendOrigin = process.env.NODE_ENV === 'production' 
        ? process.env.VITE_APP_URL
        : 'http://localhost:5173';
    }
    
    res.redirect(frontendOrigin);
  }
);

router.get('/failure', (req, res) => {
  const frontendOrigin = process.env.NODE_ENV === 'production' 
    ? process.env.VITE_APP_URL
    : 'http://localhost:5173';
  
  res.redirect(`${frontendOrigin}/auth-failed`);
});

router.post('/logout', (req, res) => {
  req.logout(() => {
      res.json({ success: true });
  });
});

// Get current user
router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    // Check if user is hub banned
    if (req.user.is_hub_banned) {
      return res.status(403).json({ 
        error: 'Hub banned',
        reason: req.user.hub_ban_reason || 'You have been banned from the hub.'
      });
    }
    
    const user = { ...req.user };
    user.roles = JSON.parse(user.roles || '[]');
    res.json(user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

export default router;