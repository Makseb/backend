const nodemailer = require('nodemailer');
var EmailTemplate = require('email-templates').EmailTemplate;
var hbs = require('nodemailer-express-handlebars');
const { reset } = require('nodemon');
const path = require('path')

const transporter = nodemailer.createTransport({
  host: 'stone.o2switch.net',
  port:465,
  auth: {
    type: 'custom',
    user: 'techsupport@eatorder.fr',
    pass: '&ofT+tW[i{}c',
  },
});
const handlebarOptions = {
  viewEngine: {
    extName: ".handlebars",
    partialsDir: path.resolve('./email-templates'),
    defaultLayout: false,
  },
  viewPath: path.resolve('./email-templates'),
  extName: ".handlebars",
}
transporter.use('compile', hbs(handlebarOptions));

// Fonction pour envoyer un e-mail de bienvenue à un propriétaire
const sendWelcomeEmail = (id,email ,firstName,lastName,password) => {



  const mailOptions = {
    from: 'techsupport@eatorder.fr',
    to: email,
    subject: 'Envoi de vos coordonnées de compte',
    template: 'welcomeMessage',
    context: {
      firstName:firstName,
      lastName:lastName,
      password:password,
      email:email,
     

      link : "http://localhost:4200/auth/lock-screen?id="+id+"",
     // text: "http://localhost:4200/auth/reset-password?id="+id+"&tk="+token+"",
    }
   // text: "Cher(e) "+ firstName.toString() +  "  "+ lastName.toString() +  " , \n J`èespère que ce message vous trouve bien. Nous vous remercions pour votre récente demande concernant l'envoi de vos coordonnées de compte. Nous comprenons l'importance de ces informations et nous sommes ravis de pouvoir vous les fournir. \n Veuillez trouver ci-dessous les détails de votre compte : \n Adresse e-mail associée : "+ email.toString() +  " \n Mot De passe : "+ password.toString() +  " \n Nous vous recommandons de garder ces informations confidentielles et de ne les partager qu'avec des personnes de confiance. Si vous avez des questions ou des préoccupations concernant votre compte, n'hésitez pas à nous contacter. Notre équipe du service clientèle est là pour vous aider et vous fournir toutes les informations dont vous pourriez avoir besoin. \n Nous vous remercions de votre confiance en notre entreprise et nous sommes là pour vous assister dans toutes vos démarches liées à votre compte. Si vous rencontrez des difficultés techniques, des problèmes de connexion ou si vous avez besoin d'une assistance supplémentaire, n'hésitez pas à nous contacter. \n Nous vous remercions encore une fois de votre confiance et nous nous engageons à vous offrir une expérience client exceptionnelle. \n Cordialement, \n Eat Order",
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Erreur lors de l\'envoi de l\'e-mail:', error);
    } else {
      console.log('E-mail envoyé avec succès:', info.response);
    }
  });
};
const sendVerification = (email,id,token) => {
  console.log(email);

  const mailOptions = {
    from: 'techsupport@eatorder.fr',
    to: email,
    subject: 'verification mail',
   template: 'verificationMessage',
   context: {
    title: 'Title Here',
    link: "http://localhost:4200/auth/lock-screen?id="+id+"",
  }
    // text:"http://localhost:4200/auth/reset-password?id="+id+"&tk="+token+"",
    

    };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Erreur lors de l\'envoi de l\'e-mail:', error);
    } else {
      console.log('E-mail envoyé avec succès:', info.response);
    }
  });
};
const sendVerificationClient = (email,id,token) => {
  console.log(email);

  const mailOptions = {
    from: 'techsupport@eatorder.fr',
    to: email,
    subject: 'verification mail',
   template: 'verificationMessage',
   context: {
    title: 'Title Here',
    link: `http://localhost:3000/verify-email/?id=${id}`,
  }
    // text:"http://localhost:4200/auth/reset-password?id="+id+"&tk="+token+"",
    

    };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Erreur lors de l\'envoi de l\'e-mail:', error);
    } else {
      console.log('E-mail envoyé avec succès:', info.response);
    }
  });
};
const sendForgetpassword = (email,id,token) => {
  console.log(email);

  const mailOptions = {
    from: 'techsupport@eatorder.fr',
    to: email,
    subject: 'réinitialisez votre mot de passe',
   template: 'resetPassword',
   context: {
    title: 'Title Here',
    text: "http://localhost:4200/auth/reset-password?id="+id+"&tk="+token+"",
  }
    // text:"http://localhost:4200/auth/reset-password?id="+id+"&tk="+token+"",
    

    };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Erreur lors de l\'envoi de l\'e-mail:', error);
    } else {
      console.log('E-mail envoyé avec succès:', info.response);
    }
  });
};
const sendForgetpasswordclient = (email,id,token) => {
  console.log(email);

  const mailOptions = {
    from: 'techsupport@eatorder.fr',
    to: email,
    subject: 'réinitialisez votre mot de passe',
   template: 'resetPassword',
   context: {
    title: 'Title Here',
    text: "http://localhost:3000/reset-password?id="+id+"&tk="+token+"",
  }

    };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Erreur lors de l\'envoi de l\'e-mail:', error);
    } else {
      console.log('E-mail envoyé avec succès:', info.response);
    }
  });
};
module.exports = { sendWelcomeEmail,sendForgetpassword,sendForgetpasswordclient, sendVerificationClient,sendVerification };
