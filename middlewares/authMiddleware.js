const jwt = require('jsonwebtoken');
const config = require('../config.js');

const checkSuperAdmin = (req, res, next) => {
    // Récupérer le jeton JWT de l'en-tête de la requête
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      try {
        // Décoder le jeton JWT en utilisant la clé secrète
        const decodedToken = jwt.verify(token, config.secret);
  
        // Ajouter l'utilisateur décodé à la requête
        req.user = decodedToken;
  
        // Vérifier le rôle de l'utilisateur extrait du jeton
        if (decodedToken.role === 'admin') {
          // L'utilisateur est un super admin, passer à l'étape suivante
          next();
        } else {
          // L'utilisateur n'est pas un super admin, renvoyer une réponse d'erreur
          res.status(403).json({ message: 'Accès refusé. Vous devez être un super admin pour effectuer cette action.' });
        }
      } catch (error) {
        // Le jeton est invalide ou a expiré, renvoyer une réponse d'erreur
        res.status(401).json({ message: 'Accès non autorisé. Veuillez vous connecter.' });
      }
    } else {
      // Aucun jeton n'a été fourni, renvoyer une réponse d'erreur
      res.status(401).json({ message: 'Accès non autorisé. Veuillez vous connecter.' });
    }
  };

const checkOwner = (req, res, next) => {
    // Retrieve the JWT token from the request header
    const token = req.headers.authorization?.split(' ')[1];
  
    if (token) {
      try {
        // Decode the JWT token using the secret key
        const decodedToken = jwt.verify(token, config.secret);
  
        // Add the decoded user to the request
        req.user = decodedToken;
  
        // Check if the user has the owner role
        if (decodedToken.role === 'owner') {
          // The user is an owner, proceed to the next step
          next();
        } else {
          // The user is not an owner, send an error response
          res.status(403).json({ message: 'Access denied. You must be an owner to perform this action.' });
        }
      } catch (error) {
        // The token is invalid or has expired, send an error response
        res.status(401).json({ message: 'Unauthorized access. Please log in.' });
      }
    } else {
      // No token was provided, send an error response
      res.status(401).json({ message: 'Unauthorized access. Please log in.' });
    }
  };
  const checkClient = (req, res, next) => {
    // Récupérer le jeton JWT de l'en-tête de la requête
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      try {
        // Décoder le jeton JWT en utilisant la clé secrète
        const decodedToken = jwt.verify(token, config.secret);
  
        // Ajouter l'utilisateur décodé à la requête
        req.user = decodedToken;
  
        // Vérifier le rôle de l'utilisateur extrait du jeton
        if (decodedToken.role === 'client') {
          // L'utilisateur est un client passer à l'étape suivante
          next();
        } else {
          // L'utilisateur n'est pas un client, renvoyer une réponse d'erreur
          res.status(403).json({ message: 'Accès refusé. Vous devez être un client pour effectuer cette action.' });
        }
      } catch (error) {
        // Le jeton est invalide ou a expiré, renvoyer une réponse d'erreur
        res.status(401).json({ message: 'Accès non autorisé. Veuillez vous connecter.' });
      }
    } else {
      // Aucun jeton n'a été fourni, renvoyer une réponse d'erreur
      res.status(401).json({ message: 'Accès non autorisé. Veuillez vous connecter.' });
    }
  };
  module.exports = {
    checkSuperAdmin,
    checkOwner,
    checkClient
  };