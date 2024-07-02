const express = require('express');
const router = express.Router();
const User = require('../models/user.js');
const Store = require('../models/store.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config.js');
const { checkSuperAdmin,checkOwner } = require('../middlewares/authMiddleware.js');
const GroupeOption = require('../models/optionGroupe.js');
const optionGroupe = require('../models/optionGroupe.js')

const multer = require('multer');
const path = require('path');
const Option = require('../models/productOption.js')
const Product = require('../models/product.js');
const Category = require('../models/category.js');
const mongoose = require('mongoose');
const Tax = require('../models/tax.js');
const fs = require('fs');
const fsPromises = require('fs/promises');
const ConsumationMode = require('../models/mode') 
const Order = require('../models/order.js');
const Menu = require('../models/menu.js');
const Promo = require('../models/promo.js');
const Coupon  = require('../models/coupon.js');
const voucherCode = require('voucher-code-generator');
const Company = require('../models/company.js');
const ProductOption = require('../models/productOption.js');
const stripe = require('stripe')('sk_test_51OdqTeD443RzoOO5zes08H5eFoRH1W4Uyv2sZU8YMmpGM7fU9FKqpIDF87xml7omZVugkMmjfW3YhBG7R5ylxQTJ00lH5Qdpji');
const { sendVerificationStripe } = require('../emailService.js'); 
const sharp = require('sharp');
const Specialite = require('../models/specialite.js');
const Tags = require('../models/tags.js');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const date = new Date().toISOString().split('T')[0];
    const originalname = file.originalname;
    const extension = path.extname(originalname);
    const filename = originalname.split('.')[0];
    const uniqueSuffix = date + '-' + Date.now();
    const newFilename = filename + '-' + uniqueSuffix + extension;

    // Remove the "uploads/" prefix from the newFilename
    const filenameWithoutPrefix = newFilename.replace('uploads/', '');

    cb(null, filenameWithoutPrefix);
  } 
});

// Create the multer upload instance
const upload = multer({ storage: storage });
const processImage = (req, res, next) => {
  if (!req.file) {
    return next();
  }
const imagePath = path.join('uploads/', req.file.filename);
const outputImagePath = path.join('uploads2/', `${req.file.filename.split('.')[0]}.avif`);

// Use sharp to resize, change format, and compress the image
sharp(imagePath)
    .toFormat('avif').avif({ quality: 100 }).toFile(outputImagePath, (err, info) => {
    if (err) {
      return next(err);
    }
    req.processedImageFileName = `${req.file.filename.split('.')[0]}.avif`;
    next();
  });

}


// Service de connexion
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    // Vérifier si le mot de passe est correct
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    // Générer un jeton JWT
    const token = jwt.sign({ id: user._id, role: user.role }, config.secret);

    // Envoyer le jeton JWT à l'utilisateur
    res.json({ token, user });
    // console.log(user);
  } catch (error) {
    next(error); // Passer l'erreur au middleware de capture des erreurs
  }
});
router.get('/stores/:ownerId', async (req, res) => {
  try {
    const ownerId = req.params.ownerId;
    const user = await User.findById(ownerId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Récupérer les ID des magasins de l'utilisateur
    const storeIds = user.stores;

    // Récupérer les détails de chaque magasin à l'aide de Promise.all
    const stores = await Promise.all(storeIds.map(async (storeId) => {
      // Récupérer le détail du magasin avec l'ID actuel
      const store = await Store.findById(storeId);
      return store; // Retourner le détail du magasin
    }));

    res.json({ stores });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la récupération des stores' });
  }
});
// Service pour créer un store
// router.post('/addStore', async (req, res) => {
//   try {
//     const { ownerId, name, address, phoneNumber, description } = req.body;
//     console.log("hi")
//     // Vérifier si le propriétaire existe
//     const owner = await User.findById(ownerId);
//     if (!owner) {
//       return res.status(404).json({ message: 'Propriétaire non trouvé' });
//     }

//     // Créer un nouveau store avec les détails fournis
//     const store = new Store({
//       owner: ownerId,
//       name,
//       description,
//       address,
//       phoneNumber
//     });

//     // Enregistrer le store dans la base de données
//     await store.save();

//     // Ajouter le store créé à la liste des stores de l'owner
//     owner.stores.push(store._id);
//     await owner.save();

//     res.status(201).json({ message: 'Store créé avec succès', store });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Une erreur est survenue lors de la création du store' });
//   }
// });


// Service pour récupérer tous les stores d'un owner
/*router.get('/stores/:ownerId', async (req, res) => {
  try {
    const ownerId = req.params.ownerId;
    const user = await User.findById(ownerId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    let stores = [];
    // Récupérer tous les magasins où l'utilisateur est propriétaire
    const ownerStores = await Store.find({ owner: ownerId });
    // Récupérer tous les magasins où l'utilisateur est gestionnaire
    const managerStores = await Store.find({ managers: ownerId });

    // Ajouter les magasins où l'utilisateur est propriétaire
    if (ownerStores.length > 0) {
      stores = stores.concat(ownerStores);
    }

    // Ajouter les magasins où l'utilisateur est gestionnaire
    if (managerStores.length > 0) {
      stores = stores.concat(managerStores);
    }

    res.json({ stores });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la récupération des stores' });
  }
});*/
/*router.get('/stores/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    let stores = [];
    // Récupérer tous les magasins où l'utilisateur est propriétaire
    const ownerStores = await Store.find({ owner: userId });
    // Récupérer tous les magasins où l'utilisateur est gestionnaire
    const managerStores = await Store.find({ managers: userId });

    // Ajouter les magasins où l'utilisateur est propriétaire
    if (ownerStores.length > 0) {
      stores = stores.concat(ownerStores);
    }

    // Ajouter les magasins où l'utilisateur est gestionnaire
    if (managerStores.length > 0) {
      stores = stores.concat(managerStores);
    }

    res.json({ stores });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la récupération des stores' });
  }
});*/

/*
router.get('/stores/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Récupérer tous les stores où l'utilisateur est soit propriétaire, soit gestionnaire
    let stores = await Store.find({ owner: userId });
    
    if (stores.length === 0 && user.managers && user.managers.length > 0) {
      stores = await Store.find({ managers: userId });
    }
    
    res.json({ stores });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la récupération des stores' });
  }
});
*/
router.post('/addCategory', upload.single('image'),processImage, async (req, res) => {
  try {
    const storeId = req.body.storeId;
    const name = req.body.name;
    const userId = req.body.userId;
    const description = req.body.description;
    const availabilitys = JSON.parse(req.body.availabilitys);
    const parentId = req.body.parentId;
    const image =req.processedImageFileName ;
// console.log(availabilitys);
// const userFolderPath = path.join('uploads', storeId); // Construire le chemin du dossier de l'utilisateur

//     // Vérifier si le dossier de l'utilisateur existe, sinon le créer
//     if (!fs.existsSync(userFolderPath)) {
//       fs.mkdirSync(userFolderPath);
//     }

//     if (req.file.size > 500 * 1024) {
//       // Taille de fichier supérieure à 500 Ko
//       return res.status(400).json({ error: 'La taille du fichier dépasse la limite autorisée.' });
//     }

//     const allowedMimeTypes = ['image/jpg', 'image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
//     if (!allowedMimeTypes.includes(req.file.mimetype)) {
//       // Type de fichier non autorisé
//       return res.status(400).json({ error: 'Seuls les fichiers PNG, JPEG, WebP, PDF et DOCX sont autorisés.' });
//     }

//     // Déplacer le fichier téléchargé dans le dossier de l'utilisateur
//     const destinationPath = path.join(userFolderPath, req.file.filename);
//     fs.renameSync(req.file.path, destinationPath);

    // Vérifier si la catégorie parente existe
    const parentCategory = parentId ? await Category.findById(parentId) : null;
    if (parentId && !parentCategory) {
      return res.status(404).json({ message: 'Catégorie parente non trouvée' });
    }
    // Vérifier si le magasin existe
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: 'Magasin non trouvé' });
    }
    // Créer une nouvelle catégorie avec la référence à la catégorie parente et au magasin
    const category = new Category({
      name,
      store: storeId,
      description,
      availabilitys,
      userId,
      image,
    });

    // Enregistrer la catégorie dans la base de données
    await category.save();

    // Ajouter la catégorie à la liste des sous-catégories de la catégorie parente (si elle existe)
    if (parentId) {
      parentCategory.subcategories.push(category._id);
      await parentCategory.save();
    }

    // Ajouter la catégorie au magasin
    store.categories.push(category._id);
    await store.save();

    // Ajouter la catégorie au menu
    const menu = await Menu.findOne({ store: storeId });
    if (menu) {
      menu.categorys.push(category._id);
      await menu.save();
    }

    // Récupérer l'ID de la catégorie parente
    const parentCategoryId = parentCategory ? parentCategory._id : null;
    await category.populate('availabilitys.mode');
    res.status(201).json({ message: 'Catégorie créée avec succès', category, parentCategoryId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la création de la catégorie' });
  }
});
// ...
router.post('/addOptionGroups', checkOwner, upload.single('image'), async (req, res) => {
  try {
    const { name, description ,storeId,force_max,force_min,allow_quantity,taxes  } = req.body;
    const ownerId = req.user.id; // Get the ownerId from the authenticated user
      // console.log(storeId);
    // Get the image file path from the request
  

    // Create a new option group with the provided details, image path, and ownerId
    const optionGroup = new GroupeOption({
      name,
      description,
      ownerId: ownerId,
      store:storeId,
      force_max: force_max,
      force_min:force_min,
      allow_quantity,
      taxes:JSON.parse(taxes),
    });

    // Save the option group to the database
    await optionGroup.save();

    res.status(201).json({ message: 'Groupe d\'options créé avec succès', optionGroup });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la création du groupe d\'options' });
  }
});
router.post('/addOptions', checkOwner, upload.single('image'), async (req, res) => {
  try {
    const { name, price, tax, isDefault, promoPercentage, unite } = req.body;
    const ownerId = req.user.id; // Get the ownerId from the authenticated user

    const parsedPromoPercentage = promoPercentage === "null" ? null : parseFloat(promoPercentage);

    // Get the image file path from the request
    const image = req.file.filename;

    // Create a new instance of the option
    const option = new Option({
      name,
      price,
      tax,
      isDefault,
      promoPercentage: parsedPromoPercentage,
      unite,
      image,// Save the image path to the option object
      ownerId 
    });

    // Save the option to the database
    await option.save();

    res.status(201).json({ message: 'Option créée avec succès', option });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la création de l\'option' });
  }
});
// Service pour affecter une option à un groupe d'options
router.post('/affectOptionToGroup/:groupId/options/:optionId', async (req, res) => {
  try {
    const groupId = req.params.groupId; // ID du groupe d'options
    const optionId = req.params.optionId; // ID de l'option à affecter
    const optionPrice = req.body.price; // Prix de l'option pour ce groupe
    const optionDefault = req.body.default;
    const group = await GroupeOption.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Groupe d\'options non trouvé' });
    }

    // Vérifier si l'option existe
    const option = await Option.findById(optionId);
    if (!option) {
      return res.status(404).json({ message: 'Option non trouvée' });
    }

    // Vérifier si l'option est déjà affectée au groupe
    const existingOption = group.options.find(opt => opt.option.equals(optionId));
    console.log(existingOption)
    if (existingOption) {
      return res.status(400).json({ message: 'Option déjà affectée au groupe d\'options' });
    }

    // Extract the attributes from the option that you want to save to the group
    const { name, tax, unite, promoPercentage, image, isDefault ,taxes} = option;
console.log("option",option);
console.log("taxes",taxes)

    // Ajouter l'option au groupe d'options avec le prix spécifique, l'ID du groupe et les autres attributs
    group.options.push({ 
      option: optionId, 
      price: optionPrice,
      name,
      tax,
      unite,
      promoPercentage,
      image,
      isDefault :optionDefault,
      taxes
    });
    await group.save();

    // Ajouter l'ID du groupe d'options à l'option
    option.optionGroups.push(groupId);
    await option.save();

    res.status(200).json({ message: 'Option affectée au groupe d\'options avec succès', name,image });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de l\'affectation de l\'option au groupe d\'options' });
  }
});
// router.get('/api/products/:productId', async (req, res) => {
//   try {
//     const productId = req.params.productId;

//     // Use the Product model to find a product by its _id and populate the related fields
//     const product = await Product.findById(productId)
//       .populate('category') // Replace 'category' with the actual field name for category
//       .populate({
//         path: 'size.optionGroups',
//         select: '-_id', // Exclude _id from optionGroups
//       })
//       .populate('taxes') // Replace 'taxes' with the actual field name for taxes
//       .exec();

//     if (!product) {
//       return res.status(404).json({ error: 'Product not found' });
//     }

//     res.status(200).json(product);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });
router.get('/api/products', async (req, res) => {
  try {
    // Use the Product model to find all products and populate the related fields
    const products = await Product.find()
      .populate('category') // Replace 'category' with the actual field name for category
      .populate({
        path: 'size.optionGroups',
        select: '-_id', // Exclude _id from optionGroups
      })
      .populate('taxes') // Replace 'taxes' with the actual field name for taxes
      .exec();

    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.post('/api/products', async (req, res) => {
  try {
    // Create a new product instance using the request body
    const newProduct = new Product(req.body);

    // Save the new product to the database
    await newProduct.save();

    res.status(201).json(newProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/getProductsByStore/:storeId', async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const products = await Product.find({ storeId: storeId })
      .populate('category')
      
      .populate('taxes')
      .exec();

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});
router.get('/getProductByStore/:storeId', async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const page = parseInt(req.query.page) || 1; // Get the page number from query parameter, default to 1
    const pageSize = parseInt(req.query.pageSize) || 10; // Get the page size from query parameter, default to 10

    const skip = (page - 1) * pageSize;

    const products = await Product.find({ storeId: storeId })
      .populate('category')
      .populate('optionGroups')
      .populate('taxes')
      .skip(skip)
      .limit(pageSize)
      .exec();

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});
router.get('/getProducts', checkOwner, async (req, res) => {
  try {
    const productId = req.params.productId;

    // Rechercher le produit par son ID et effectuer le "populate" pour charger les données associées
    const product = await Product.findById(productId)
      .populate('category', 'name') // Charger uniquement le champ 'name' de la catégorie
      .populate({
        path: 'optionGroups',
        populate: {
          path: 'options',
          model: 'ProductOption',
        },
      });

    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    res.json({ product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la récupération du produit' });
  }
});
router.post('/:productId/optionGroups/:optionGroupId', async (req, res) => {
  try {
    const productId = req.params.productId;
    const optionGroupId = req.params.optionGroupId;

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find the option group
    const optionGroup = await GroupeOption.findById(optionGroupId);
    if (!optionGroup) {
      return res.status(404).json({ message: 'Option group not found' });
    }
        // Check if the option group already exists in the product's optionGroups array
        const optionGroupExists = product.optionGroups.some((group) => group.equals(optionGroupId));

        if (optionGroupExists) {
          return res.status(400).json({ message: 'Option group already exists in the product' });
        }

    // Add the option group to the product's optionGroups array
    product.optionGroups.push(optionGroup);
    await product.save();

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.delete('/products/:productId/optionGroups/:optionGroupId', async (req, res) => {
  const { productId, optionGroupId } = req.params;

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Find the index of the option group to be removed
    const index = product.optionGroups.findIndex(
      (groupId) => groupId.toString() === optionGroupId
    );

    if (index === -1) {
      return res.status(404).json({ error: 'Option group not found' });
    }

    // Remove the option group from the array
    product.optionGroups.splice(index, 1);

    // Save the updated product
    await product.save();

    return res.json({ message: 'Option group removed successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
});
router.get('/getProducts/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;

    // Rechercher le produit par son ID et effectuer le "populate" pour charger les données associées
    const product = await Product.findById(productId)
      .populate('category', 'name') // Charger uniquement le champ 'name' de la catégorie
      .populate({
        path: 'optionGroups',
        populate: {
          path: 'options',
          model: 'ProductOption',
        },
      });

    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    res.json({ product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la récupération du produit' });
  }
});
// Service pour récupérer tous les détails des catégories par magasin avec sous-catégories imbriquées
router.get('/getCategoriesByStore/:storeId/details', async (req, res) => {
  try {
    const storeId = req.params.storeId;

    // Vérifier si le magasin existe
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: 'Magasin non trouvé' });
    }

    // Récupérer toutes les catégories associées à ce magasin avec les sous-catégories
    const categories = await Category.find({ store: storeId })
      .populate({
        path: 'subcategories',
        populate: {
          path: 'subcategories',
          populate: {
            path: 'subcategories',
            // Continuer la hiérarchie des sous-catégories imbriquées si nécessaire
          }
        }
      });

    // Récupérer les produits de chaque catégorie
    const categoriesWithProducts = await Promise.all(
      categories.map(async category => {
        const products = await Product.find({ category: category._id });
        return { category, products };
      })
    );

    res.json({ categories: categoriesWithProducts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la récupération des détails des catégories par magasin' });
  }
});
router.get('/getCategoriesByStoreOnly/:storeId', async (req, res) => {
  try {
    const storeId = req.params.storeId;

    // Vérifier si le magasin existe
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: 'Magasin non trouvé' });
    }

    // Récupérer toutes les catégories associées à ce magasin avec les sous-catégories
    const categories = await Category.find({ store: storeId }).populate({
      path: 'products',
      populate: {
        path: 'size.optionGroups optionGroups',
        model: 'OptionGroup',
      },
    });
    // Récupérer les produits de chaque catégorie


    res.json({ categories: categories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la récupération des détails des catégories par magasin' });
  }
});
// Service pour récupérer tous les groupes d'options
router.get('/getOptionGroups/:storeId',  async (req, res) => {
  try {
    const storeId = req.params.storeId;
  // console.log(storeId);
    // Récupérer tous les groupes d'options associés à l'ownerId spécifié
   // const optionGroups = await GroupeOption.find();
    const optionGroups = await GroupeOption.find({ store: storeId }).populate('options.option').populate('options.subOptionGroup').exec();
    res.json({ optionGroups });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la récupération des groupes d\'options', });
  }
});
// Service pour supprimer un groupe d'options
router.delete('/optionGroups/:groupId', checkOwner, async (req, res) => {
  try {
    const groupId = req.params.groupId; // ID du groupe d'options

    // Vérifier si le groupe d'options existe
    const group = await GroupeOption.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Groupe d\'options non trouvé' });
    }

    // Trouver toutes les options qui ont cet ID de groupe d'options dans leur tableau `optionGroups`
    const optionsToUpdate = await Option.find({ optionGroups: groupId });

    // Supprimer l'ID du groupe d'options de chaque option trouvée
    optionsToUpdate.forEach(async (option) => {
      option.optionGroups = option.optionGroups.filter(
        (groupOptionId) => groupOptionId.toString() !== groupId.toString()
      );
      await option.save();
    });

    // Supprimer le groupe d'options de la base de données
    await GroupeOption.findByIdAndRemove(groupId);

    res.status(200).json({ message: 'Groupe d\'options supprimé avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la suppression du groupe d\'options' });
  }
});
router.post('/product-options', upload.single('image'), async (req, res) => {
  try {
    // Log pour vérifier le corps de la requête
    console.log('Request Body:', req.body);

    // Extraire les données du corps de la requête
    const { name, price, store, tax, isDefault, unite, ownerId, optionGroups } = req.body;
    const imagePath = req.file ? req.file.filename : null;
    const optiontaxes = JSON.parse(req.body.taxes);

    // Vérifier et formater chaque taxe
    const formattedTaxes = optiontaxes.map(t => ({
      tax: new mongoose.Types.ObjectId(t.tax),
      mode: new mongoose.Types.ObjectId(t.mode),
    }));

    console.log('Formatted Taxes:', formattedTaxes);

    // Créer une nouvelle instance de ProductOption avec le chemin de l'image et les taxes formatées
    const newProductOption = new Option({
      name,
      price,
      store: new mongoose.Types.ObjectId(store),
      tax,
      isDefault,
      unite,
      image: imagePath,
      ownerId,
      optionGroups,
      taxes: formattedTaxes,
    });

    // Enregistrer la nouvelle option de produit dans la base de données
    const savedProductOption = await newProductOption.save();

    console.log('savedProductOption:', savedProductOption);

    // Répondre avec l'option de produit enregistrée
    res.json(savedProductOption);
  } catch (error) {
    // Gérer les erreurs
    console.error('Error saving product option:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


/*router.post('/product-options', upload.single('image'), async (req, res) => {
  try {
    // console.log('h');
    // console.log(req.body)
    // Extract data from the request body
    const { name, price, store, tax, isDefault, unite,  ownerId, optionGroups,taxes } = req.body;

    // Get the file path from the uploaded image
    const imagePath = req.file.filename;
    let parsedTaxes = [];
    if (taxes) {
      parsedTaxes = JSON.parse(taxes).map(taxObj => ({
        tax: mongoose.Types.ObjectId(taxObj.tax),
        mode: mongoose.Types.ObjectId(taxObj.mode)
      }));
    }
console.log("parsedTaxes",parsedTaxes)
    // Create a new ProductOption instance with the image path
    const newProductOption = new Option({
      name,
      price,
      store,
      tax,
      isDefault,
      unite,

      image: imagePath, // Save the image path
      ownerId,
      optionGroups,
      taxes: parsedTaxes

    });

    // Save the new product option to the database
    const savedProductOption = await newProductOption.save();

    // Respond with the saved product option
    res.json(savedProductOption);
  } catch (error) {
    // Handle errors
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});*/
router.get('/options/:storeId', async (req, res) => {
  try {
    const storeId = req.params.storeId;

    // Find options associated with the given store ID
    const options = await Option.find({ store: storeId });

    res.json(options);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/getOptions/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Find all options associated with the user
    const options = await Option.find({ ownerId: userId });

    res.json({ options });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la récupération des options' });
  }
});
router.get('/options/:optionId', checkOwner, async (req, res) => {
  try {
    const optionId = req.params.optionId;

    // Find the option by its ID
    const option = await Option.findById(optionId);

    if (!option) {
      return res.status(404).json({ message: 'Option not found' });
    }

    res.json({ option });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while retrieving the option' });
  }
});
// Service to delete an option
// router.delete('/deleteOptions/:optionId', checkOwner, async (req, res) => {
//   try {
//     const optionId = req.params.optionId;

//     // Find the option by its ID
//     const option = await Option.findById(optionId);
//     if (!option) {
//       return res.status(404).json({ message: 'Option not found' });
//     }

//     // Delete the option from the database
//     await Option.findByIdAndRemove(optionId);

//     res.status(200).json({ message: 'Option deleted successfully' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'An error occurred while deleting the option' });
//   }
// });
router.delete('/deleteOptions/:optionId', checkOwner, async (req, res) => {
  try {
    const optionId = req.params.optionId;

    // Find the option by its ID
    const option = await Option.findById(optionId);
    if (!option) {
      return res.status(404).json({ message: 'Option not found' });
    }

    // Delete the option from the database
    await Option.findByIdAndRemove(optionId);

    // Remove the option reference from optionGroups
    await GroupeOption.updateMany(
      { 'options.option': optionId },
      { $pull: { options: { option: optionId } } }
    );

    res.status(200).json({ message: 'Option deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while deleting the option' });
  }
});
router.put('/updateOption/:optionId', checkOwner, upload.single('image'), async (req, res) => {
  try {
    const optionId = req.params.optionId;
    
    const { name, price, tax, isDefault, promoPercentage, unite } = req.body;

    // Vérifier si l'option existe
    const option = await Option.findById(optionId);
    if (!option) {
      return res.status(404).json({ message: 'Option non trouvée' });
    }

    // Mettre à jour les propriétés de l'option avec les nouvelles valeurs
    option.name = name;
    option.price = price;
    option.tax = tax;
    option.isDefault = isDefault;
    option.promoPercentage = promoPercentage === 'null' ? null : parseFloat(promoPercentage);
    option.unite = unite;

    // Vérifier si une nouvelle image a été fournie
    if (req.file) {
      // Supprimer l'ancienne image du serveur
      const oldImagePath = path.join(__dirname, '../uploads', option.image);
      fs.unlinkSync(oldImagePath);

      // Enregistrer le nouveau chemin d'image dans l'option
      option.image = req.file.filename;
    }

    // Enregistrer les modifications dans la base de données
    await option.save();

    res.status(200).json({ message: 'Option mise à jour avec succès', option });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la mise à jour de l\'option' });
  }
});
// Service pour récupérer un groupe d'options par son ID
router.get('/getOptionGroupById/:groupId', checkOwner, async (req, res) => {
  try {
    const groupId = req.params.groupId;

    // Rechercher le groupe d'options par son ID
    const optionGroup = await GroupeOption.findById(groupId);

    if (!optionGroup) {
      return res.status(404).json({ message: 'Groupe d\'options non trouvé' });
    }

    res.json({ optionGroup });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la récupération du groupe d\'options' });
  }
});
// Service to get the prices of options in an OptionGroup
router.get('/optionGroups/:groupId/optionPrices', checkOwner, async (req, res) => {
  try {
    const groupId = req.params.groupId;
    // Find the option group by its ID
    const optionGroup = await GroupeOption.findById(groupId);
    if (!optionGroup) {
      return res.status(404).json({ message: 'Option group not found' });
    }

    // Create an array to store the prices of each option
    const optionPrices = [];

    // Iterate through the options and extract their prices
    optionGroup.options.forEach(option => {
      const { option: optionId, price } = option;
      optionPrices.push({ optionId, price });
    });

    res.json({ optionPrices });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while retrieving the option prices' });
  }
});
// Service pour désaffecter une option d'un groupe d'options
router.delete('/desaffecteroptionGroups/:groupId/options/:optionId', checkOwner, async (req, res) => {
  try {
    const groupId = req.params.groupId; // ID du groupe d'options
    const optionId = req.params.optionId; // ID de l'option à désaffecter

    // Vérifier si le groupe d'options existe
    const group = await GroupeOption.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Groupe d\'options non trouvé' });
    }

    // Vérifier si l'option existe
    const option = await Option.findById(optionId);
    if (!option) {
      return res.status(404).json({ message: 'Option non trouvée' });
    }

    // Vérifier si l'option est déjà désaffectée du groupe
    const existingOption = group.options.find(opt => opt.option.equals(optionId));
    if (!existingOption) {
      return res.status(400).json({ message: 'Option déjà désaffectée du groupe d\'options' });
    }

    // Supprimer l'option du groupe d'options
    group.options = group.options.filter(opt => !opt.option.equals(optionId));
    await group.save();

    // Supprimer l'ID du groupe d'options de l'option
   // Supprimer l'ID du groupe d'options de l'option
// Supprimer l'ID du groupe d'options de l'option
option.optionGroups = option.optionGroups.filter(groupOptionId => groupOptionId.toString() !== groupId.toString());
await option.save();

    res.status(200).json({ message: 'Option désaffectée du groupe d\'options avec succès', group });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la désaffectation de l\'option du groupe d\'options' });
  }
});
// Service to get an option within an option group
router.get('/optionGroups/:groupId/options/:optionId', checkOwner, async (req, res) => {
  try {
    const groupId = req.params.groupId; // ID of the option group
    const optionId = req.params.optionId; // ID of the option to retrieve

    // Find the option group by its ID
    const optionGroup = await GroupeOption.findById(groupId);

    if (!optionGroup) {
      return res.status(404).json({ message: 'Option group not found' });
    }

    // Find the option within the option group by its ID
    const option = optionGroup.options.find(opt => opt.option.equals(optionId));

    if (!option) {
      return res.status(404).json({ message: 'Option not found' });
    }

    res.json({ option });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while retrieving the option' });
  }
});
// Service to update an option within an option group
router.put('/optionGroups/:groupId/options/:optionId', checkOwner, upload.single('image'), async (req, res) => {
  try {
    const groupId = req.params.groupId; // ID of the option group
    const optionId = req.params.optionId; // ID of the option to update

    // Find the option group by its ID
    const optionGroup = await GroupeOption.findById(groupId);

    if (!optionGroup) {
      return res.status(404).json({ message: 'Option group not found' });
    }

    // Find the option within the option group by its ID
    const option = optionGroup.options.find(opt => opt._id.equals(optionId));

    if (!option) {
      return res.status(404).json({ message: 'Option not found' });
    }
    option.name = req.body.name || option.name;
    option.price = req.body.price || option.price;
    option.tax = req.body.tax || option.tax;
    option.isDefault = req.body.isDefault || option.isDefault;
    option.unite = req.body.unite || option.unite;
    option.promoPercentage = req.body.promoPercentage || option.promoPercentage;
    // Update other properties as needed

    // Check if a new image has been provided
    if (req.file) {
      // Delete the old image from the server
      const oldImagePath = path.join(__dirname, '../uploads', option.image);
      fs.unlinkSync(oldImagePath);

      // Save the new image path to the option
      option.image = req.file.filename;
    }

    // Save the changes to the option group
    await optionGroup.save();

    res.status(200).json({ message: 'Option updated successfully', optionGroup });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating the option' });
  }
});
router.delete('/deleteproduct/:productId', async (req, res) => {
      const { productId } = req.params;
      try {
        // Find the product
        const product = await Product.findById(productId);
    
        if (!product) {
          return res.status(404).json({ error: 'Product not found' });
        }
    
        // Find the category
        const categoryId = product.category;
    
        const category = await Category.findById(categoryId);
    
        if (!category) {
          return res.status(404).json({ error: 'Category not found' });
        }
    
        // Find the index of the product in the products array
        const productIndex = category.products.indexOf(productId);
    
        if (productIndex === -1) {
          return res.status(404).json({ error: 'Product not found in the category' });
        }
    
        // Remove the product ID from the products array
        category.products.splice(productIndex, 1);
    
        // Save the updated category
        await category.save();
        const imagePath = path.join(__dirname, '../uploads', product.image);
        await fsPromises.unlink(imagePath);

      await Product.findByIdAndDelete(productId);

        res.json({ success: true, message: 'Product deleted from category' });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
router.delete('/categories/:categoryId', async (req, res) => {
  try {
    const categoryId = req.params.categoryId;

    // Fetch the category details to get the image filename (if needed)
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Delete the category from the database
    await Category.findByIdAndDelete(categoryId);
  // Delete all products associated with the category
 // await Product.deleteMany({ category: categoryId });

    // Remove the image file from the server (if needed)
    const imagePath = "uploads/"+category.image; // Assuming the filename is stored in the 'image' field
    if (imagePath && imagePath !== 'images/default.png') {
      const fs = require('fs');
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error('Error deleting image file:', err);
        }
      });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while deleting the category' });
  }
});
router.delete('/categoriesWithProduct/:categoryId', async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    // Fetch the category details to get the image filename (if needed)
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    // Delete the category from the database
    await Category.findByIdAndDelete(categoryId);
  // Delete all products associated with the category
  await Product.deleteMany({ category: categoryId });

    // Remove the image file from the server (if needed)
    const imagePath = "uploads/"+category.image; // Assuming the filename is stored in the 'image' field
    if (imagePath && imagePath !== 'images/default.png') {
      const fs = require('fs');
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error('Error deleting image file:', err);
        }
      });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while deleting the category' });
  }
});
router.put('/updateProduct/:productId', checkOwner, async (req, res) => {
  try {
    // Retrieve the product ID from the request parameters
    const productId = req.params.productId;
// console.log(req.body);
    // Retrieve the existing product from the database
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // If an image is uploaded, update the image
 
    // Update other product details if provided in the request body
    const { name, description, price, storeId, category, size  } = req.body;
    const sizeData = JSON.parse(req.body.size);
      const tags=JSON.parse(req.body.tags);
    if (name) product.name = name;
    if (description) product.description = description;
    if (!isNaN(parseFloat(price)) && isFinite(price)) {
      product.price = parseFloat(price);
    } else {
      // Handle the case where 'price' is not a valid number
      // For example, you can set a default value or skip updating the field
      // product.price = defaultPrice; // Set a default value
      // Or skip updating the field altogether
    }
    if (storeId) product.storeId = storeId;
    if (category) product.category = category;
    if (sizeData) product.size = sizeData;
    if(tags) product.tags=tags;
    // Save the changes to the database
    await product.save();

    // Construct the response
    let response = { message: 'Product updated successfully' };

    if (req.file) {
      response.imageURL = req.file.filename;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating the product' });
  }
});
// router.put('/updateProduct/:productId',checkOwner,upload.single('image'), async (req, res) => {
//   try {
//     // Récupérer l'ID de l'proudact à partir du token d'authentification
//     const productId = req.params.productId;
//     if(req.file.filename)
//     {
//     const image =req.file.filename;
//     console.log(image);
//     }
//     // Récupérer les nouvelles données du profil depuis le corps de la requête
//     const { name, description, price,storeId, category, size } = req.body;
//     const sizeData = JSON.parse(req.body.size);

//     // Récupérer l'admin à partir de la base de données en utilisant l'ID
//     const product = await Product.findById(productId);

//     if (!product) {
//       return res.status(404).json({ message: 'Product not found' });
//     }

//     // Mettre à jour les propriétés du Product
//      if(req.file.filename)
//      {
//     product.name = name;
//     product.description = description;
//     product.price = price;
//     product.storeId = storeId;
//     product.category = category;
//     product.size=sizeData;
//     product.image=image
//   }

//     // Sauvegarder les modifications dans la base de données
//     await product.save();
//     const imageFilePath =req.file.filename;

//     // Return a response containing the image details
//     res.status(200).json({ imageURL: imageFilePath }); 
   
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'An error occurred while updating Product ' });
//   }
// });
// router.put('/updateCategory/:categoryId',  async (req, res) => {
//   try {
//     const categoryId = req.params.categoryId;
//     const name = req.body.name;
//     const description = req.body.description;
//     const storeId = req.body.storeId;
//       console.log(name);
//       console.log(description);
//     // Find the category by ID
//     const category = await Category.findById(categoryId);

//     // Check if the category exists
//     if (!category) {
//       return res.status(404).json({ message: 'Catégorie non trouvée' });
//     }

//     // Update the category properties
//     if (name) category.name = name;
//     if (description) category.description = description;

   

//     if (storeId) category.store = storeId;

//     // Save the updated category to the database
//     await category.save();

//     // Construct the response
//     let response = { message: 'Catégorie mise à jour avec succès', category };

//     if (req.file) {
//       response.imageURL = req.file.filename;
//     }

//     res.status(200).json(response);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Une erreur est survenue lors de la mise à jour de la catégorie' });
//   }
// });
router.put('/updateCategory/:categoryId', async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const { name, description, storeId } = req.body;

    // Find the category by ID
    const category = await Category.findById(categoryId);

    // Check if the category exists
    if (!category) {
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }

    // Update the category properties
    if (name) category.name = name;
    if (description) category.description = description;
    if (storeId) category.store = storeId;

    // Save the updated category to the database
    await category.save();

    // Construct the response
    let response = { message: 'Catégorie mise à jour avec succès', category };

    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la mise à jour de la catégorie' });
  }
});
// router.put('/updateCategory/:categoryId', upload.single('image'), async (req, res) => {
//   try {
//     const categoryId = req.params.categoryId;
//     const name = req.body.name;
//     const description = req.body.description;
//     const storeId = req.body.storeId;
//     const image = req.file.filename;

//     // Find the category by ID
//     const category = await Category.findById(categoryId);

//     // Check if the category exists
//     if (!category) {
//       return res.status(404).json({ message: 'Catégorie non trouvée' });
//     }

//     // Update the category properties
//     category.name = name;
//     category.description = description;
//     category.image = image;
//     category.store = storeId;


//     // Save the updated category to the database
//     await category.save();

//     res.status(200).json({ message: 'Catégorie mise à jour avec succès', category });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Une erreur est survenue lors de la mise à jour de la catégorie' });
//   }
// });
router.post('/category/:categoryId/add-subcategory', async (req, res) => {
  const categoryId = req.params.categoryId;
  const { subcategoryId } = req.body;
if (!subcategoryId) {
    return res.status(400).json({ error: 'Subcategory is required.' });
  }
  if (categoryId === subcategoryId) {
    return res.status(400).json({ error: 'Subcategory cannot be the same as the Category.' });
  }
  try {
    // Find the parent category
    const parentCategory = await Category.findById(categoryId);

    // If the parent category doesn't exist, return an error
    if (!parentCategory) {
      return res.status(404).json({ error: 'Parent category not found.' });
    }
   // Check if the subcategory already exists in the parent category's subcategories array
   const isSubcategoryExists = parentCategory.subcategories.includes(subcategoryId);

   // If the subcategory already exists, return an error
   if (isSubcategoryExists) {
     return res.status(400).json({ error: 'Subcategory already exists in the parent category' });
   }
    // Add the subcategory ID to the parent category's subcategories array
    parentCategory.subcategories.push(subcategoryId);
    await parentCategory.save();

    res.status(201).json({ message: 'Subcategory added successfully', subcategory: subcategoryId  });
  } catch (error) {
    console.error('Error adding subcategory:', error);
    res.status(500).json({ error: 'Failed to add subcategory' , subcategory: subcategoryId });
  }
});
router.delete('/category/:categoryId/delete-subcategory/:subcategoryId', async (req, res) => {
  const categoryId = req.params.categoryId;
  const subcategoryId = req.params.subcategoryId;
  try {
    // Find the parent category
    const parentCategory = await Category.findById(categoryId);

    // If the parent category doesn't exist, return an error
    if (!parentCategory) {
      return res.status(404).json({ error: 'Parent category not found.' });
    }

    // Check if the subcategory exists in the parent category's subcategories array
    const subcategoryIndex = parentCategory.subcategories.indexOf(subcategoryId);

    // If the subcategory doesn't exist, return an error
    if (subcategoryIndex === -1) {
      return res.status(404).json({ error: 'Subcategory not found in the parent category' });
    }

    // Remove the subcategory ID from the parent category's subcategories array
    parentCategory.subcategories.splice(subcategoryIndex, 1);
    await parentCategory.save();

    res.status(200).json({ message: 'Subcategory deleted successfully' });
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    res.status(500).json({ error: 'Failed to delete subcategory' });
  }
});
router.get('/category/:categoryId', async (req, res) => {
  const categoryId = req.params.categoryId;

  try {
    // Find the category by its ID
    const category = await Category.findById(categoryId).populate('subcategories').exec();

    // If the category doesn't exist, return an error
    if (!category) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error retrieving category:', error);
    res.status(500).json({ error: 'Failed to retrieve category' });
  }
});
router.post('/addTax', async (req, res) => {
  try {
    const { name, rate, storeId } = req.body;
// console.log(name);
// console.log(rate);
// console
    // Create the new tax with the provided details
    const tax = new Tax({
      name,
      rate,
      storeId,
    });

    // Save the tax to the database
    await tax.save();

    res.status(201).json({ tax });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while adding the tax' });
  }
});
router.get('/getTax/:taxId', async (req, res) => {
  try {
    const taxId = req.params.taxId;

    // Find the tax by its ID
    const tax = await Tax.findById(taxId);
    if (!tax) {
      return res.status(404).json({ message: 'Tax not found' });
    }
    res.status(200).json({ taxes, totalPages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while getting all taxes' });
  }
});
router.get('/getTaxbystore/:store', async (req, res) => {
  try {
    const store=req.params.store
    

    const taxes = await Tax.find({storeId:store})
    
    res.status(200).json({ taxes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while getting all taxes' });
  }
});
router.get('/getAllTax/:store', async (req, res) => {
  try {
    const store=req.params.store
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const totalDocuments = await Tax.countDocuments();
    const totalPages = Math.ceil(totalDocuments / limit);

    const taxes = await Tax.find({storeId:store})
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({ taxes, totalPages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while getting all taxes' });
  }
});
router.put('/updateTax/:taxId', async (req, res) => {
  try {
    const taxId = req.params.taxId;
    const { name, rate } = req.body;
    // Find the tax by its ID
    const existingTax = await Tax.findById(taxId);
    if (!existingTax) {
      return res.status(404).json({ message: 'Tax not found' });
    }

    // Update the tax properties
    existingTax.name = name || existingTax.name;
    existingTax.rate = rate || existingTax.rate;

    // Save the updated tax to the database
    const updatedTax = await existingTax.save();

    res.status(200).json(updatedTax);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating the tax' });
  }
});
router.delete('/deleteTax/:taxId', async (req, res) => {
  try {
    const taxId = req.params.taxId;

    // Find the tax by its ID
    const existingTax = await Tax.findById(taxId);
    if (!existingTax) {
      return res.status(404).json({ message: 'Tax not found' });
    }

    // // Find and update the products that have this tax in their taxes array
    // await Product.updateMany(
    //   { taxes: taxId },
    //   { $pull: { taxes: taxId } }
    // );

    // Delete the tax from the database
    await existingTax.deleteOne();

    res.status(200).json({ message: 'Tax deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while deleting the tax' });
  }
});
router.post('/product/:productId/addTax/:taxId', async (req, res) => {
  try {
    const { productId, taxId } = req.params;

    // Find the product by productId
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find the tax by taxId
    const tax = await Tax.findById(taxId);
    if (!tax) {
      return res.status(404).json({ message: 'Tax not found' });
    }

    // Add the tax to the product's taxes array if not already added
    if (!product.taxes.includes(taxId)) {
      product.taxes.push(taxId);
      await product.save();
      return res.status(200).json({ message: 'Tax added to the product', product });
    }

    return res.status(200).json({ message: 'Tax already added to the product', product });
                
  } catch (error) {
    console.error('Error adding tax to product:', error);
    res.status(500).json({ message: 'An error occurred while adding the tax to the product' });
  }
});
router.get("/getpoductwithdeatil",async(req,res)=>{
  try {
    const products = await Product.find().populate('modePrices.mode')
    if(!products)
    {
      return  res.status(404).json({message: "product not found "})
    
    }
    else 
    {
      return res.status(202).json(products)
    }
  } catch (error) {
    return res.status(504).json({message: "An error occurred "})
  }
  })
router.post('/addTaxToCategory/:categoryId/:taxId', async (req, res) => {
  try {
    const { categoryId, taxId } = req.params;

    // Find the category by its ID
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Find the tax by its ID
    const tax = await Tax.findById(taxId);
    if (!tax) {
      return res.status(404).json({ message: 'Tax not found' });
    }

    // Find all products in the category
    const productsInCategory = await Product.find({ category: categoryId });

    // Update the taxes array for each product
    for (const product of productsInCategory) {
      if (!product.taxes.includes(taxId)) {
        product.taxes.push(taxId);
        await product.save();
      }
    }

    res.status(200).json({ message: 'Tax added to products in the category' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while adding tax to the category' });
  }
});
router.delete('/product/:productId/tax/:taxId', async (req, res) => {
  try {
    const { productId, taxId } = req.params;

    // Find the product by its ID
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find the tax by its ID
    const tax = await Tax.findById(taxId);
    if (!tax) {
      return res.status(404).json({ message: 'Tax not found' });
    }

    // Remove the tax from the product's taxes array
    product.taxes.pull(taxId);
    await product.save();

    res.status(200).json({ message: 'Tax removed from product' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while removing tax from product' });
  }
});
router.get('/products/category/:categoryId', async (req, res) => {
  try {
    const categoryId = req.params.categoryId;

    // Find products by category ID
    const products = await Product.find({ category: categoryId });

    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching products by category' });
  }
});
router.put('/update/:productId', async (req, res) => {
  const productId = req.params.productId;

  try {
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.availability = !product.availability; // Toggle the availability

    await product.save();

    res.json({ message: 'Product availability updated successfully', product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.post('/addConsumationModes', async (req, res) => {
  try {
    const { name, description, frais, taux, applyTaux, applicationType, storeId,reduction,minOrder } = req.body;

    // Create and save the new consumation mode
    const newConsumationMode = new ConsumationMode({
      name,
      description,
      frais,
      taux,
      applyTaux,
      applicationType,
      store: storeId,
      reduction,
      minOrder,

    });
    await newConsumationMode.save();
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }
    store.consumationModes.push({ mode: newConsumationMode._id, enabled: false });
    await store.save();
    res.status(200).json({ message: 'Consumation mode added to the specified store with enabled set to false' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding consumation mode to the specified store', error });
  }
});
router.get('/getConsumationModes', async (req, res) => {
  try {
    const modes = await ConsumationMode.find();
    res.status(200).json(modes);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching consumption modes' });
  }
});
router.post('/:storeId/add-consumation-mode', async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const { modeId, enabled } = req.body; // Assuming you send modeId and enabled in the request body

    const store = await Store.findById(storeId);

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    store.consumationModes.push({ mode: modeId, enabled: enabled });
    const updatedStore = await store.save();

    res.status(200).json(updatedStore);
  } catch (error) {
    res.status(500).json({ message: 'Error adding consumation mode to store', error });
  }
});
router.post('/add-consumation-mode', async (req, res) => {
  try {
    const { name, description } = req.body;

    // Add the new consumation mode to the ConsumationMode model
    const newConsumationMode = new ConsumationMode({ name, description });
    await newConsumationMode.save();

    // Update all stores' consumation modes with enabled set to false
    const stores = await Store.find({});

    if (!stores || stores.length === 0) {
      return res.status(404).json({ message: 'No stores found' });
    }

    const updatePromises = stores.map(async store => {
      store.consumationModes.push({ mode: newConsumationMode._id, enabled: false });
      await store.save();
    });

    await Promise.all(updatePromises);

    res.status(200).json({ message: 'Consumation mode added to all stores with enabled set to false' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding consumation mode to stores', error });
  }
});
router.get('/:storeId/consumation-modes', async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const store = await Store.findById(storeId).populate('consumationModes.mode');
    
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    res.status(200).json(store.consumationModes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching consumation modes for store', error });
  }
});
  router.get('/stores/:storeId/consumation-modes', async (req, res) => {
    try {
      const storeId = req.params.storeId;

      // Find the store by ID
      const store = await Store.findById(storeId).populate('consumationModes.mode');

      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }

      // Extract and send the consumationModes
      const consumationModes = store.consumationModes;
      res.json(consumationModes);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });
// Update the enabled property of a consumationMode
router.put('/stores/:storeId/consumation-modes/:modeId/toggle', async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const modeId = req.params.modeId;

    // Find the store by ID
    const store = await Store.findById(storeId);

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    // Find the index of the mode in the consumationModes array
    const modeIndex = store.consumationModes.findIndex(mode => mode.mode.toString() === modeId);

    if (modeIndex === -1) {
      return res.status(404).json({ message: 'Consumation mode not found' });
    }

    // Toggle the enabled property
    store.consumationModes[modeIndex].enabled = !store.consumationModes[modeIndex].enabled;

    // Save the updated store
    await store.save();

    res.json({ message: 'Consumation mode toggled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.post('/stores', async (req, res) => {
  try {
    const { owner, name, description, address, longitude, latitude, phoneNumber, status } = req.body;
    const allConsumationModes = await ConsumationMode.find();
    const consumationModes = allConsumationModes.map(mode => ({
      mode: mode._id,
      enabled: false,
    }));
    const newStore = new Store({
      owner,
      name,
      description,
      address,
      longitude,
      latitude,
      phoneNumber,
      status,
      consumationModes,
    });
    // Save the new store
    const savedStore = await newStore.save();
    res.json(savedStore);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.delete('/consumation-modes/:modeId', async (req, res) => {
  try {
    const modeId = req.params.modeId;

    // Remove the mode from all stores' consumationModes arrays
    await Store.updateMany({}, { $pull: { consumationModes: { mode: modeId } } });

    // Delete the mode from the ConsumationMode collection
    await ConsumationMode.findByIdAndDelete(modeId);

    res.json({ message: 'Consumation mode deleted from all stores successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.post('/addprod',upload.single('image'), async (req, res) => {
  try {
    // Extract product data from request body
    //const { name, description, storeId, category, modePrices,optionGroups } = req.body;
    const name = req.body.name;
    const description = req.body.description;
    const storeId = req.body.storeId;
    const category = req.body.category;
    const modePrices = JSON.parse(req.body.modePrices);
    const optionGroups = req.body.optionGroups;
    const image = req.file.filename;
    const newProduct = new Product({
      name,
      description,
      storeId,
      category,
      modePrices,
      image,
      optionGroups
    });
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create product', error: error.message });
  }
});
router.post('/:productId/addModePrice', async (req, res) => {
  try {
    const productId = req.params.productId;
    const { mode, price } = req.body; // Assuming you send mode and price in the request body

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Add the new modePrice to the product's modePrices array
    product.modePrices.push({ mode, price });

    await product.save();

    return res.status(200).json({ message: 'ModePrice added successfully', product });
  } catch (error) {
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
});
router.get('/getProudectWithGroupOption/:storeId',async(req,res)=>
{
 try {
  const storeId= req.params.storeId;
  const product = await Product.findById(storeId)
  if(!product)
  {
    res.status(403).json({message:'product not found'})

  }
  else{
    res.status(202).json({product})
  }
 } catch (error) {
  res.status(504).json({message:'An error occurred'})
 }
}
);
router.get('/getProudectWithGroupOption/:storeId',async(req,res)=>{
  try {
    const storeId = req.params.storeId;
  const products = await Product.find({ storeId: storeId })
  .populate('optionGroups')
  if(!products)
  {
    res.status(404).json({message:'product not found'});

  }
  else
  {
    res.status(202).json({products})
  }
  } catch (error) {
    res.status(500).json({message:'An error occurred'})
  }
  
})
// router.put('/modifyOptionGroups/:id',async(req,res)=>
// {
//   try {
//     console.log(req.body)
//     const {name, description,force_max,force_min,allow_quantity} =req.body;
//    console.log(force_min);
//     const optionGroupId = req.params.id;
//     const optionGroup = await GroupeOption.findById(optionGroupId)
//     if(!optionGroup)
//     {
//       res.status(404).json({message:'Groupe d\'options non trouvé'})
//     }
//     optionGroup.name=name;
//     optionGroup.description=description;
//     optionGroup.force_max=force_max;
//     optionGroup.force_min=force_min;
//     optionGroup.allow_quantity=allow_quantity;
   
//     await optionGroup.save();
//     res.status(200).json({ message : 'groupe d\'option modifié avec succés', optionGroup })
//   } catch (error) {
//     res.status(500).json({ message: 'une erreur est survenue lors de la modification du groupe d\'option'})
//   }
// }
// );
router.put('/modifyOptionGroup/:id', upload.single('image'), async (req, res) => {
  try {
    const {name, description,force_max,force_min,allow_quantity} =req.body;
    const image = req.file ? req.file.filename : undefined;
    const optionGroup = await GroupeOption.findById(req.params.id);
    if (!optionGroup) {
      return res.status(404).json({ message: 'Groupe d\'options non trouvé' });  }
    optionGroup.name = name;
    optionGroup.description = description;
    optionGroup.force_max=force_max;
    optionGroup.force_min=force_min;
    optionGroup.allow_quantity=allow_quantity;
    if (image) {
      optionGroup.image = image;
    }
    await optionGroup.save();
    res.status(200).json({ message: 'Groupe d\'options modifié avec succès', optionGroup });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la modification du groupe d\'options' });
  }
});
router.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({}).populate({
      path: 'size.optionGroups', // Populate the optionGroups field within each size
    });

    res.json(products);
  } catch (error) {
    console.error('Error retrieving products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/api/products/:productId', async (req, res) => {
  const productId = req.params.productId;

  try {
    const product = await Product.findById(productId).populate({
      path: 'size.optionGroups', // Populate the optionGroups field within each size
    }).populate('optionGroups')

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error retrieving product:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/api/products/:productId/option-groups-with-sizes', async (req, res) => {
  const productId = req.params.productId;

  try {
    const product = await Product.findById(productId)
    .populate({
      path: 'size.optionGroups',
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product.size);
  } catch (error) {
    console.error('Error retrieving option groups with sizes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.post('/api/products/:productId/size/:sizeId/option-groups', async (req, res) => {
  const productId = req.params.productId;
  const sizeId = req.params.sizeId;
  const optionGroupId = req.body.optionGroupId; // Assuming option group ID is sent in the request body

  try {
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Find the size within the product's size array by its ID
    const size = product.size.find((s) => s._id.toString() === sizeId);

    if (!size) {
      return res.status(404).json({ error: 'Size not found' });
    }

    // Ensure the optionGroups array exists in the size object
    if (!size.optionGroups) {
      size.optionGroups = [];
    }

    // Add the new option group ID to the size's optionGroups array
    if (!size.optionGroups.includes(optionGroupId)) {
      size.optionGroups.push(optionGroupId);
    }

    // Save the updated product
    await product.save();

    res.json(product);
  } catch (error) {
    console.error('Error adding option group to size:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// router.post('/api/products/:productId/size/:sizeId/option-groups', async (req, res) => {
//   const productId = req.params.productId;
//   const sizeId = req.params.sizeId;
//   const optionGroupId = req.body.optionGroupId; // Assuming option group ID is sent in the request body

//   try {
//     const product = await Product.findById(productId);

//     if (!product) {
//       return res.status(404).json({ error: 'Product not found' });
//     }

//     // Find the size within the product's size array by its ID
//     const size = product.size.find((s) => s._id.toString() === sizeId);

//     if (size) {
//       // If size exists, add the new option group ID to the size's optionGroups array
//       if (!size.optionGroups) {
//         size.optionGroups = [];
//       }

//       if (!size.optionGroups.includes(optionGroupId)) {
//         size.optionGroups.push(optionGroupId);
//       }
//     } else {
//       // If size does not exist, add the new option group ID to the product's optionGroups array
//       if (!product.optionGroups) {
//         product.optionGroups = [];
//       }

//       if (!product.optionGroups.includes(optionGroupId)) {
//         product.optionGroups.push(optionGroupId);
//       }
//     }

//     // Save the updated product
//     await product.save();

//     res.json(product);
//   } catch (error) {
//     console.error('Error adding option group:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });
router.post('/addproduct', async (req, res) => {
  try {
    const productData = req.body;
    const product = new Product(productData);
    await product.save();
    const categoryId = productData.category;
    await Category.findByIdAndUpdate(
      categoryId,
      { $push: { products: product._id } },
      { new: true }
    );
    await Product.populate(product, [
      { path: 'availabilitys.mode' },
      { path: 'optionGroups' },
    ]);
    res.status(201).json(product);
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: 'Error adding product' });
  }
});

router.post('/uploadImage', upload.single('image'),processImage, (req, res) => {
  console.warn(req.file)
  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required' });
  }
  const imageFilePath =req.file.filename;
  const processedImageFileName = req.processedImageFileName;
  res.status(200).json({ imageURL: processedImageFileName }); 
});
router.get('/ProductsByCategory/:categoryId', async (req, res) => {
  const categoryId = req.params.categoryId;

  try {
    // Use Mongoose to find products by the specified category ID
    const products = await Product.find({ category: categoryId }).populate({
      path: 'size.optionGroups', // Populate the optionGroups field within each size
    }).populate('optionGroups');

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching products.' });
  }
});
router.post('/addorders', (req, res) => {
  const newOrder = new Order(req.body);

  newOrder.save((err) => {
    if (err) {
      res.status(400).send('Unable to add the order');
    } else {
      res.status(201).json(newOrder);
    }
  });
});
router.get('/categories/:storeId', async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const categories = await Category.find({ store:storeId }).populate('products');
    if (!categories || categories.length === 0) {
      return res.status(404).json({ message: 'Categories not found for the given store ID' });
    }
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
router.post('/duplicate/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;

    // Fetch the original product
    const originalProduct = await Product.findById(productId).exec();

    // Check if the original product exists
    if (!originalProduct) {
      return res.status(404).json({ success: false, message: 'Original product not found' });
    }

    // Convert the original product to a plain JavaScript object
    const originalProductObject = originalProduct.toObject();

    // Create a copy of the original product excluding the _id field
    const duplicatedProduct = new Product({
      ...originalProductObject,
      _id: new mongoose.Types.ObjectId(),
      name: `${originalProductObject.name} Copy`,
    });
    await duplicatedProduct.save();
    const originalImagePath = path.join(__dirname, '../uploads', originalProductObject.image);
    const newImageName = `copy_${Date.now()}_${path.basename(originalProductObject.image)}`;
    const newImagePath = path.join(__dirname, '../uploads', newImageName);

    // Use fs.promises.copyFile to ensure it returns a Promise
    await fsPromises.copyFile(originalImagePath, newImagePath);

    // Update the image property for the duplicated product
    duplicatedProduct.image = `${newImageName}`;

    // Save the duplicated product with the new image path
    await duplicatedProduct.save();
        // Add the duplicated product to the products array in the corresponding category

    await Category.findByIdAndUpdate(
      originalProduct.category,
      { $push: { products: duplicatedProduct._id } },
      { new: true }
    ).exec();
    const savedDuplicatedProduct = await Product.findById(duplicatedProduct._id).exec();

    // Define an array of paths to populate
    const pathsToPopulate = [
      { path: 'optionGroups', model: 'OptionGroup', select: '_id name' },
      { path: 'size.optionGroups', model: 'OptionGroup', select: '_id name' },
      { path: 'availabilitys.mode', model: 'ConsumationMode', select: '_id name' },
    ];
    
    // Use Mongoose's populate method to populate the specified paths
    await Product.populate(savedDuplicatedProduct, pathsToPopulate);
    
    return res.json({
      success: true,
      message: 'Product duplicated successfully',
      duplicatedProduct: savedDuplicatedProduct.toObject(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});
router.get("/orders/:storeId", async (req, res) => {
  try {
    const storeId = req.params.storeId;
    // Find orders for the given store ID
    const orders = await Order.find({ "storeId": storeId }).sort({ createdAt: -1 });
    if (!orders) {
      return res.status(404).json({ message: "No orders found for the given store ID" });
    }
    res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
router.delete('/products/:productId/size/:sizeId/optionGroup/:optionGroupId', async (req, res) => {
  const { productId, sizeId, optionGroupId } = req.params;

  try {
    // Find the product by ID
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find the size by ID
    const size = product.size.find(s => s._id.toString() === sizeId);

    if (!size) {
      return res.status(404).json({ message: 'Size not found' });
    }

    // Find the option group by ID in the size array
    const optionGroupIndex = size.optionGroups.indexOf(optionGroupId);

    if (optionGroupIndex === -1) {
      return res.status(404).json({ message: 'Option Group not found in the specified size' });
    }

    // Remove the option group from the size array
    size.optionGroups.splice(optionGroupIndex, 1);

    // Save the updated product
    await product.save();

    return res.status(200).json({ message: 'Option Group deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});
router.post('/addOptionGroupToProudect/:productId/addOptionGroup/:optionGroupId', async (req, res) => {
  const { productId, optionGroupId } = req.params;
  const { optionGroupData } = req.body;

  try {
    // Find the product by ID
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Find the option group by ID
    const optionGroup = await GroupeOption.findById(optionGroupId);

    if (!optionGroup) {
      return res.status(404).json({ error: 'Option group not found' });
    }

    // Add the option group to the product's optionGroups array
    product.optionGroups.push(optionGroup._id);

    // Save the updated product
    await product.save();

    res.status(201).json({ success: true, optionGroup: optionGroup });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.delete('/products/:productId/optionGroups/:optionGroupId', async (req, res) => {
  const { productId, optionGroupId } = req.params;

  try {
    // Find the product by ID
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find the index of the option group in the product's optionGroups array
    const optionGroupIndex = product.optionGroups.findIndex(
      (og) => og.toString() === optionGroupId
    );

    if (optionGroupIndex === -1) {
      return res.status(404).json({ message: 'Option group not found for this product' });
    }

    // Remove the option group from the array
    product.optionGroups.splice(optionGroupIndex, 1);

    // Save the updated product
    await product.save();

    res.json({ message: 'Option group deleted successfully', product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
router.post('/menu', async (req, res) => {
  try {
      const { name, store, currency, description, categorys } = req.body;

      const newMenu = new Menu({
          name,
          store,
          currency,
          description,
          categorys,
      });

      const savedMenu = await newMenu.save();
      res.status(201).json(savedMenu);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/getMenuByStore/:storeId', async (req, res) => {
  try {
      const storeId = req.params.storeId;

      const menu = await Menu.find({ "store": storeId })
          .populate({
              path: 'categorys',
              populate: [
                  {
                      path: 'products',
                      model: 'Product',
                      populate: [
                          {
                              path: 'size.optionGroups',
                              model: 'OptionGroup',
                          },
                          {
                              path: 'optionGroups',
                              model: 'OptionGroup',
                          },
                          {
                              path: 'taxes',
                              model: 'Tax',
                          },
                          {
                            path: 'availabilitys.mode',
                            model: 'ConsumationMode',
                          }
                      ],
                  },
                  {
                    path: 'availabilitys.mode',
                    model: 'ConsumationMode',
                  },
              ],
          })
          .exec();

      res.json(menu);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.post('/stores/:storeId/menus/:menuId', async (req, res) => {
  const { storeId, menuId } = req.params;
  const { schedule } = req.body;

  try {
    // Find the store by ID
    const store = await Store.findById(storeId);

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Find the menu by ID
    const menu = await Menu.findById(menuId);

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    // Create a new menu with schedule
    const newMenuWithSchedule = {
      menu: menu._id,
      schedule,
    };

    // Add the new menu to the store's consumationModes
    store.consumationModes[0].Menus.push(newMenuWithSchedule);

    // Save the updated store
    await store.save();

    res.status(201).json({ success: true, menuWithSchedule: newMenuWithSchedule });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Endpoint to add a banner with image upload
router.post('/stores/:storeId/banners', upload.single('image'), async (req, res) => {
  try {
    const { description, link } = req.body;
    const storeId = req.params.storeId;
    const imageUrl = req.file ? req.file.filename : null; // Save the image path

    const store = await Store.findById(storeId);

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Add the new banner to the store's banners array
    store.banners.push({ imageUrl, description, link });

    // Save the updated store
    await store.save();

    res.status(201).json(store);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/stores/:storeId/banners/images', async (req, res) => {
  const storeId = req.params.storeId;

  try {
    // Find the store
    const store = await Store.findById(storeId);

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Get an array of banner image URLs
    const bannerImages = store.banners.map(banner => ({
      imageUrl: banner.imageUrl,
      description: banner.description,
      link: banner.link,
    })).filter(banner => banner.imageUrl);

    res.json({ bannerImages });
  } catch (error) {
    console.error('Error retrieving banner images:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.put('/menu/:menuId/changeCategoryIndex', async (req, res) => {
  const { menuId } = req.params;
  const { oldIndex, newIndex } = req.body;

  try {
      const menu = await Menu.findById(menuId);

      // Ensure that the oldIndex and newIndex are valid indices
      if (oldIndex < 0 || oldIndex >= menu.categorys.length || newIndex < 0 || newIndex >= menu.categorys.length) {
          return res.status(400).json({ message: 'Invalid index values' });
      }

      // Remove the element from the old index
      const [removedCategory] = menu.categorys.splice(oldIndex, 1);

      // Insert the element at the new index
      menu.categorys.splice(newIndex, 0, removedCategory);

      // Save the updated menu
      await menu.save();

      res.json({ message: 'Category index changed successfully', menu });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
  }
});
router.post('/addOptionGroupToOG/:optionGroupId/:parentOptionGroupId/:optionId', async (req, res) => {
  try {
    const optionGroupId = req.params.optionGroupId; // ID of the OptionGroup to add
    const parentOptionGroupId = req.params.parentOptionGroupId; // ID of the parent OptionGroup
    const optionId = req.params.optionId; // ID of the option to associate with the OptionGroup

    // Check if the parent OptionGroup exists
    const parentOptionGroup = parentOptionGroupId
      ? await GroupeOption.findById(parentOptionGroupId)
      : null;

    if (!parentOptionGroup) {
      return res.status(404).json({ message: 'Parent OptionGroup not found' });
    }

    // Find the index of the specified option within the options array
    const optionIndex = parentOptionGroup.options.findIndex((opt) => opt._id.equals(optionId));

    // If the option is found, add the ID of the OptionGroup to the oG array of that option
    if (optionIndex !== -1) {
      parentOptionGroup.options[optionIndex].subOptionGroup.push(optionGroupId);
      // Add any additional fields you need in the parent OptionGroup's options array
    }

    await parentOptionGroup.save();
    const updatedParentOptionGroup = await GroupeOption.findById(optionGroupId);
    res.status(201).json({ message: 'OptionGroup ID added successfully to oG array', updatedParentOptionGroup });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while adding OptionGroup ID to oG array' });
  }
});
// Route to add a product
// router.post('/addProduct2', async (req, res) => {
//   try {
//     // Extract data from the request body
//     const { name, description, availability, storeId, category, modePrice, image, size, optionGroups, taxes } = req.body;

//     // Create a new product instance
//     const newProduct = new Product({
//       name,
//       description,
//       availability,
//       storeId,
//       category,
//       modePrice,
//       image,
//       size,
//       optionGroups,
//       taxes,
//     });

//     // Save the product to the database
//     const savedProduct = await newProduct.save();

//     res.json(savedProduct);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
// router.get('/product2/:productId/mode/:modeId', async (req, res) => {
//   try {
//     const productId = req.params.productId;
//     const modeId = req.params.modeId;

//     // Find the product by ID and use lean() to get a plain JavaScript object
//     const product = await Product.findById(productId).lean();

//     if (!product) {
//       return res.status(404).json({ message: 'Product not found' });
//     }

//     // Check if the mode is present in the modePrice array
//     const modeDetails = product.modePrice.find((modePrice) => modePrice.mode.toString() === modeId);

//     if (modeDetails) {
//       const result = {
//         name: product.name,
//         description: product.description,
//         sizeModeDetails: [],
//       };
//       res.json(result);
//       return;
//     }

//     // If not found in modePrice, check the mode in the size array
//     const result = {
//       name: product.name,
//       description: product.description,

//       sizeModeDetails: [],
//     };

//     product.size.forEach((size) => {
//       const modeInSize = size.modePrice.find((sizeMode) => sizeMode.mode.toString() === modeId);
//       if (modeInSize) {
//         result.sizeModeDetails.push({
//           sizeName: size.name,
//           modeDetails: modeInSize,
//         });
//       }
//     });

//     if (result.sizeModeDetails.length > 0) {
//       res.json(result);
//     } else {
//       res.status(404).json({ message: 'Mode not found in product' });
//     }
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
router.post('/add-product2', async (req, res) => {
  try {
    // Extracting data from the request body
    const {
      name,
      description,
      availabilitys,
      storeId,
      category,
      price,
      image,
      size,
      optionGroups,
      taxes,
    } = req.body;

    // Creating a new product instance
    const newProduct = new Product({
      name,
      description,
      availabilitys,
      storeId,
      category,
      price,
      image,
      size,
      optionGroups,
      taxes,
    });

    // Saving the new product to the database
    const savedProduct = await newProduct.save();

    // Sending the saved product as a response
    res.json(savedProduct);
  } catch (error) {
    // Handling errors
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/product-details/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;

    // Find the product by ID
    const product = await Product.findById(productId)
      .populate({
        path: 'taxes',
        model: Tax,
        populate: {
          path: 'mode',
          model: ConsumationMode,
        },
      })
      .populate({
        path: 'availabilitys.mode',
        model: ConsumationMode,
      })
      .exec();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})
// API endpoint to get product details with specific tax and availability modes based on a single mode ID
router.get('/product-details/:productId/:modeId', async (req, res) => {
  try {
    const productId = req.params.productId;
    const modeId = req.params.modeId;

    const product = await Product.findById(productId)
      .populate({
        path: 'taxes',
        match: { 'mode': modeId },
 
      })
      .populate({
        path: 'availabilitys',
        match: { 'mode': modeId },
      })
      .exec();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { _id, name, description, availabilitys, storeId, category, price, image, taxes } = product;

    // Extract only relevant details for the specified mode ID
    const filteredProduct = {
      _id,
      name,
      description,
      availabilitys: availabilitys.filter(avail => avail.mode.toString() === modeId),
      storeId,
      category,
      price,
      image,
      taxes: taxes.filter(tax => tax.mode.toString() === modeId),
    };

    res.json(filteredProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/products-by-category/:categoryId/:modeId', async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const modeId = req.params.modeId;

    const products = await Product.find({ category: categoryId }).populate({
      path: 'size.optionGroups', // Populate the optionGroups field within each size
    }).populate('optionGroups')
      .populate({
        path: 'taxes',
        match: { 'mode': modeId },
        select: 'mode',
       
      })
      .populate({
        path: 'availabilitys',
        match: { 'mode': modeId },
        select: 'mode',
      })
      .exec();

    // Filter products based on the specified mode ID
    const filteredProducts = products.map(product => {
      const { _id, name, description, availabilitys,size,optionGroups, storeId, category, price, image, taxes } = product;

      return {
        _id,
        name,
        description,
        availabilitys: availabilitys.filter(avail => avail.mode.toString() === modeId),
        size,
        optionGroups,
        storeId,
        category,

        price,
        image,
        taxes: taxes.filter(tax => tax.mod === modeId),
      };
    });

    res.json(filteredProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
//get product By Category
router.get("/productByCategory/:categoryId", async (req, res) => {
  const categoryId = req.params.categoryId;
  if (!categoryId) {
    return res.status(400).json({
      message: "category ID Not found .",
    });
  }
  const product = await Product.find({ category: categoryId }).populate({
    path: 'size.optionGroups', // Populate the optionGroups field within each size
  }).populate('optionGroups');

  if (!product) {
    return res.status(404).json({
      message: "Product not found.",
    });
  }
  return res.json(product);
});
// router.get('/products-by-store/:storeId/:modeId', async (req, res) => {
//   try {
//     const storeId = req.params.storeId;
//     const modeId = req.params.modeId;

//     const products = await Product.find({ storeId: storeId }).populate({
//       path: 'size.optionGroups',
//     }).populate('optionGroups')
//       .populate({
//         path: 'taxes',
//         match: { 'mode': modeId },
//         select: 'mode',
//       })
//       .populate({
//         path: 'availabilitys',
//         match: { 'mode': modeId },
//         select: 'mode',
//       })
//       .exec();

//     // Filter products based on the specified mode ID
//     const filteredProducts = products.map(product => {
//       const { _id, name, description, availabilitys, size, optionGroups, storeId, category, price, image, taxes } = product;

//       return {
//         _id,
//         name,
//         description,
//         availabilitys: availabilitys.filter(avail => avail.mode.toString() === modeId),
//         size,
//         optionGroups,
//         storeId,
//         category,
//         price,
//         image,
//         taxes: taxes.filter(tax => tax.mode.toString() === modeId),
//       };
//     });

//     res.json(filteredProducts);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });
router.put('/products/:productId/mode/:modeId/toggle-availability', async (req, res) => {
  try {
    const productId = req.params.productId;
    const modeId = req.params.modeId;

    // Find the product by ID
    const product = await Product.findById(productId);

    // Find the mode within the product's availabilitys array
    const mode = product.availabilitys.find((item) => item.mode.equals(modeId));

    if (!mode) {
      return res.status(404).json({ message: 'Mode not found in product availabilitys' });
    }

    // Toggle the availability
    mode.availability = !mode.availability;
    const etat =mode.availability
    await product.save();
    res.json({ message: 'Availability toggled successfully', etat });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.put('/category/:categoryId/mode/:modeId/toggle-availability', async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const modeId = req.params.modeId;
    const category = await Category.findById(categoryId);
    const mode = category.availabilitys.find((item) => item.mode.equals(modeId));
    if (!mode) {
      return res.status(404).json({ message: 'Mode not found in product availabilitys' });
    }
    mode.availability = !mode.availability;
    const etat =mode.availability
    await category.save();
    res.json({ message: 'Availability toggled successfully', etat });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.put('/products/:productId/toggle-availability', async (req, res) => {
  const { productId } = req.params;
  try {
    const product = await Product.findById(productId);
    if (!product) {
   return res.status(404).json({ error: 'Product not found' }); }
    product.availability = !product.availability;
    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.put('/categorys/:categoryId/toggle-availability', async (req, res) => {
  const { categoryId } = req.params;
  try {
    const category = await Category.findById(categoryId);
    if (!category) {  return res.status(404).json({ error: 'Product not found' }); }
    category.availability = !category.availability;
    const updatedCategory = await category.save();
    res.json(updatedCategory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
//deleteStores
//updattttttttttttttttttttttttttte
router.delete('/deleteStores/:storeId', checkOwner, async (req, res) => {
  try { const storeId = req.params.storeId;
    const store = await Store.findById(storeId);
    if (!store) {  return res.status(404).json({ message: 'Magasin non trouvé' }); }
    await Store.findByIdAndRemove(storeId);
    await ConsumationMode.deleteMany({ store: storeId });
    await Menu.deleteMany({ store: storeId });
    await User.updateOne({ _id: store.owner }, { $pull: { stores: storeId } });
    await User.updateMany(
      { role: 'manager', stores: storeId }, 
      { $pull: { stores: storeId } } 
    );
    await Company.updateMany({}, { $pull: { stores: storeId } });
    res.json({ message: 'Magasin et les modes de consommation associés ont été supprimés avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la suppression du magasin et de ses modes de consommation' });
  }
});
//getstoresById
router.get('/getStoresById/:id', async (req, res) => {
  try {
    const storesId = req.params.id;
    const stores = await Store.findById(storesId);
    if (!stores) {  return res.status(404).json({ message: 'stores not found' }); }
    res.json(stores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while retrieving the stores' });
  }
});
//addStores
router.post('/addStores', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), async (req, res) => {
  try {
    const { ownerId, name, description, latitude, longitude, rangeValue, primairecolor, secondairecolor, companyId, address, phoneNumber, uberOrganizationStoreId, specialites, email } = req.body;
    const owner = await User.findById(ownerId);
    const image = req.files['image'] ? req.files['image'][0].filename : '';

    // const image = req.file ? req.file.filename : '';
    const banner = req.files['banner'] ? req.files['banner'][0].filename : '';
    const campany = await Company.findById(companyId);
    const existingUser = await Store.findOne({ email: req.body.email });

    if (existingUser) {
      return res.status(400).json({ error: "Email already exists." });
    }

    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    const defaultGuestMode = [
      {
        guestmode: false,
        kiosk: {
          name: false,
          phone: false,
          email: false,
          address: false
        },
        other: {
          name: false,
          phone: false,
          email: false,
          address: false
        }
      }
    ];

    const defaultorganizations = [
      {
        name: "Uber direct",
        options: [
          {
            name: "Automatic",
            checked: false
          },
          {
            name: "Manual",
            checked: true
          }
        ]
      }
    ];

    const store = new Store({
      owner: ownerId,
      name,
      description,
      address,
      phoneNumber,
      latitude,
      longitude,
      rangeValue,
      logo: image,
      StoreBanner:banner,
      primairecolor,
      secondairecolor,
      companyId,
      uberOrganizationStoreId,
      specialites,
      guestmode: defaultGuestMode,
      email,
      managingacceptedorders: {  // Valeurs par défaut pour la gestion des commandes acceptées
        preparationTime: null,
        Manual: true,
        Automatic: false
      },
      organizations: defaultorganizations
    });

    // Ajouter le magasin à la base de données
    const savedStore = await store.save();

    // Créer et ajouter des taxes par défaut
    const defaultTaxes = [
      { name: 'Default TAX', rate: 0 }, // Exemple de taxe par défaut
      // Ajoutez d'autres taxes par défaut ici si nécessaire
    ];

    const createdTaxes = await Promise.all(defaultTaxes.map(async (taxData) => {
      const tax = new Tax({
        name: taxData.name,
        rate: taxData.rate,
        storeId: savedStore._id  // Assurez-vous de lier la taxe au magasin créé
      });
      return await tax.save();
    }));

    // Ajouter les IDs des taxes créées au magasin
    savedStore.taxes = createdTaxes.map(tax => tax._id);
    await savedStore.save();
    
    const defaultModes = [
      { name: 'Dine-in', description: 'Mode Dine-in' },
      { name: 'Delivery', description: 'Mode Livraison' },
      { name: 'Takeaway', description: 'Mode Takeaway' },
    ];
    let defaultModeId; 
    for (let i = 0; i < defaultModes.length; i++) {
      const modeData = defaultModes[i];
      const mode = new ConsumationMode({
        name: modeData.name,
        description: modeData.description,
        frais: 0,
        taux: 0,
        applyTaux: false,
        applicationType: 'product',
        reduction: 0,
        store: store._id,
      });
      await mode.save();
      if (i === 0) {
        defaultModeId = mode._id;
      }
      const isFirstMode = i === 0;
      store.consumationModes.push({
        mode: mode._id,
        enabled: isFirstMode,
      });
    }
    store.defaultMode = defaultModeId;
    await store.save();
    // Ajouter le magasin à la liste des magasins de l'owner et de la company
    owner.stores.push(savedStore._id);
    await owner.save();

    campany.stores.push(savedStore._id);
    await campany.save();

    res.status(201).json({ message: 'Store created successfully', store: savedStore });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while creating the store' });
  }
});
///storeancien
/*
router.post('/addStores', upload.single('image'), async (req, res) => {
  try {
    const { ownerId, name, description , latitude, longitude, rangeValue ,primairecolor,secondairecolor,companyId,address,phoneNumber,uberOrganizationStoreId,specialites,email} = req.body;
    const owner = await User.findById(ownerId);
    const image = req.file ? req.file.filename : '';
    const campany = await Company.findById(companyId);
    const existingUser = await Store.findOne({ email: req.body.email });
    if (existingUser) { return res.status(400).json({ error: "Email already exists." });  }
    if (!owner) {return res.status(404).json({ message: 'Owner not found' }); }
    const defaultGuestMode = [
      {
        guestmode: false,
        kiosk: {
          name: false,
          phone: false,
          email: false,
          address: false
        },
        other: {
          name: false,
          phone: false,
          email: false,
          address: false
        }
      }
    ];
    const defaultorganizations = [
      {
        name: "Uber direct",
        options: [
          {
            name: "Automatic",
            checked: false
          },
          {
            name: "Manual",
            checked: true
          }
        ]
      }
      ];
    const store = new Store({
      owner: ownerId,
      name,
      description,
      address ,
      phoneNumber,
      latitude,
      longitude,
      rangeValue,
      logo: image,
      primairecolor,
      secondairecolor,
      companyId,
      uberOrganizationStoreId,
       specialites,
       guestmode:defaultGuestMode,
       email,
        managingacceptedorders: {  // Ajout des valeurs par défaut
          preparationTime: null,
         Manual: true,
         Automatic: false
        },
        organizations:defaultorganizations
    });
    const defaultModes = [
      { name: 'Dine-in', description: 'Mode Dine-in' },
      { name: 'Delivery', description: 'Mode Livraison' },
      { name: 'Takeaway', description: 'Mode Takeaway' },
    ];
    let defaultModeId; 
    for (let i = 0; i < defaultModes.length; i++) {
      const modeData = defaultModes[i];
      const mode = new ConsumationMode({
        name: modeData.name,
        description: modeData.description,
        frais: 0,
        taux: 0,
        applyTaux: false,
        applicationType: 'product',
        reduction: 0,
        store: store._id,
      });
      await mode.save();
      if (i === 0) {
        defaultModeId = mode._id;
      }
      const isFirstMode = i === 0;
      store.consumationModes.push({
        mode: mode._id,
        enabled: isFirstMode,
      });
    }
    store.defaultMode = defaultModeId;
    await store.save();
    owner.stores.push(store._id);
    await owner.save();
     campany.stores.push(store._id);
     await campany.save();
    res.status(201).json({ message: 'Store created successfully', store });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while creating the store' });
  }
});
*/
//
// update Stores
router.put('/updateStores/:storesId', upload.single('logo'), async (req, res) => {
  const { ownerId, name, description, address, phoneNumber, latitude, longitude, rangeValue,primairecolor,secondairecolor,specialites,email } = req.body;
  const storesId = req.params.storesId;
  const image = req.file ? req.file.filename : '';
    try {
    const store = await Store.findById(storesId);
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }
    if (req.file) {store.logo = req.file.filename;}
    store.owner = ownerId.toString();
    store.name = name;
    store.description = description;
    store.address = address;
    store.phoneNumber = phoneNumber;
    store.latitude = latitude;
    store.longitude = longitude;
    store.rangeValue = rangeValue;
    store.primairecolor = primairecolor;
    store.secondairecolor = secondairecolor;
    store.specialites=specialites;
    store.email=email;

   await store.save();
    res.json({ message: 'Store information updated successfully', store });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.post('/api/products/:productId/availability', async (req, res) => {
  try {
    const productId = req.params.productId;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    if (req.body.hasOwnProperty('availability')) {
      product.availability = req.body.availability;
    }
    if (req.body.hasOwnProperty('availabilitys')) {
      const newAvailabilities = req.body.availabilitys.map((availability) => ({
        availability: availability.availability,
        mode: availability.mode,
      }));
      for (const newAvailability of newAvailabilities) {
        const isDuplicate = product.availabilitys.some(
          (existingAvailability) =>
            existingAvailability.mode.toString() === newAvailability.mode.toString()
        );

        if (!isDuplicate) {
          product.availabilitys.push(newAvailability);
        }
      }
    }
    const savedProduct = await product.save();
    res.json(savedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
router.post('/api/categorys/:categoryId/availability', async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const category = await Category.findById(categoryId);
    if (!category) {  return res.status(404).json({ message: 'category not found' }); }
    if (req.body.hasOwnProperty('availability')) {
      category.availability = req.body.availability;
    }
    if (req.body.hasOwnProperty('availabilitys')) {
      const newAvailabilities = req.body.availabilitys.map((availability) => ({
        availability: availability.availability,
        mode: availability.mode,
      }));
      for (const newAvailability of newAvailabilities) {
        const isDuplicate = category.availabilitys.some(
          (existingAvailability) =>
            existingAvailability.mode.toString() === newAvailability.mode.toString()
        );

        if (!isDuplicate) {
          category.availabilitys.push(newAvailability);
        }
      }
    }
    const savedCategory = await category.save();
    res.json(savedCategory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
//getcompanybyouners
router.get('/getcompanyByouners/:ownersId', async (req, res) => {
  const ownersId = req.params.ownersId;
  try {
    const owner = await User.findById(ownersId);
    if (!owner) {
      return res.status(404).json({ error: 'Owner not found' });
    }
    const company = await Company.findOne({ owners: ownersId });
    if (!company) {
      return res.status(404).json({ error: 'Company not found for the given owner' });
    }
    res.status(200).json({ company });
  } catch (error) {
    console.error('Error retrieving company:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
//Company
// AddCompany
router.get('/storesByCompany/:companyId', async (req, res) => {
  try {
      const companyId = req.params.companyId;
 const stores = await Store.find({ companyId: companyId });
       res.status(200).json({ stores });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'An error occurred while fetching stores by company' });
  }
});
//addcompany
router.post('/addCompany', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), async (req, res) => {
  let session = null;
  try {
    const { ownerId, name, legalstatus, duns, email, website } = req.body;
    const logo = req.files['image'] ? req.files['image'][0].filename : '';
    const banner = req.files['banner'] ? req.files['banner'][0].filename : '';
    const owner = await User.findById(ownerId);
    const address = JSON.parse(req.body.address);
    const phoneDetails = JSON.parse(req.body.phone_details);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }
    session = await mongoose.startSession();
    session.startTransaction();
    const company = new Company({
      owners: ownerId,
      name,
      legalstatus,
      duns,
      address: {
        street: address.street,
        city: address.city,
        state: address.state,
        zipcode: address.zipcode,
        country_iso2: address.country_iso2
      },
      phone_details: {
        country_code: phoneDetails.dialCode,
        phone_number: phoneDetails.number
      },
      email,
      website,
      CompanyLogo: logo,
      CompanyBanner: banner
    });
    // Appeler l'API Uber pour créer une organisation
    const url = 'https://api.uber.com/v1/direct/organizations';
    const token = req.headers.authorization;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': token
    };
    const uberData = {
      "info": {
        "name": name,
        "billing_type": "BILLING_TYPE_CENTRALIZED",
        "merchant_type": "MERCHANT_TYPE_RESTAURANT",
        "point_of_contact": {
          "email": email,
          "phone_details": {
            "phone_number":  phoneDetails.number,
            "country_code": phoneDetails.dialCode
          }
        },
        "address": {
          "street1": address.street.toString(),
          "street2": "",
          "city": address.city.toString(),
          "state": address.state.toString(),
          "zipcode": address.zipcode.toString(),
          "country_iso2": address.country_iso2.toString()
        }
      },
      "hierarchy_info": {
        "parent_organization_id": "66d29428-580c-5ddf-9ee1-93482329f960"
      },
      "options": {
        "onboarding_invite_type": "ONBOARDING_INVITE_TYPE_INVALID"
      }
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(uberData)
    });
    const responseData = await response.json();
        if (responseData.organization_id) {
      await company.save();
      const uberOrganizationId = responseData.organization_id;
      company.uberOrganizationId = uberOrganizationId;
      await company.save();
      const defaultGuestMode = [
        {
          guestmode: false,
          kiosk: {
            name: false,
            phone: false,
            email: false,
            address: false
          },
          other: {
            name: false,
            phone: false,
            email: false,
            address: false
          }
        }
      ];
      const defaultorganizations = [
        {
          name: "Uber direct",
          options: [
            {
              name: "Automatic",
              checked: false
            },
            {
              name: "Manual",
              checked: true
            }
          ]
        }
        ];
      // Créer un magasin par défaut pour l'entreprise
      const store = new Store({
        owner: ownerId,
        name: 'Default Store',
        description: 'Default Store Description',
        address: "Paris",
        phoneNumber: "00000",
        latitude: 0,
        longitude: 0,
        rangeValue: 7,
        primairecolor: '#000000',
        secondairecolor: '#000000',
        guestmode:defaultGuestMode,
        companyId: company._id,
        managingacceptedorders: {  
          preparationTime: null,
         Manual: true,
         Automatic: false
        },
        organizations:defaultorganizations
      });
      await store.save();
      const uberOrganizationStoreId = responseData.organization_id;
      store.uberOrganizationStoreId = uberOrganizationStoreId;
      await store.save();
         // Créer et ajouter des taxes par défaut
    const defaultTaxes = [
      { name: 'Default TAX', rate: 0 }, // Exemple de taxe par défaut
      // Ajoutez d'autres taxes par défaut ici si nécessaire
    ];

    const createdTaxes = await Promise.all(defaultTaxes.map(async (taxData) => {
      const tax = new Tax({
        name: taxData.name,
        rate: taxData.rate,
        storeId: savedStore._id  // Assurez-vous de lier la taxe au magasin créé
      });
      return await tax.save();
    }));

    // Ajouter les IDs des taxes créées au magasin
    savedStore.taxes = createdTaxes.map(tax => tax._id);
    await savedStore.save();
      // Créer les modes de consommation par défaut
      let defaultModeId;
      const defaultModes = [
        { name: 'Dine-in', description: 'Mode Dine-in' },
        { name: 'Delivery', description: 'Mode Livraison' },
        { name: 'Takeaway', description: 'Mode Takeaway' },
      ];
      for (let i = 0; i < defaultModes.length; i++) {
        const modeData = defaultModes[i];
        const mode = new ConsumationMode({
          name: modeData.name,
          description: modeData.description,
          frais: 0,
          taux: 0,
          applyTaux: false,
          applicationType: 'product',
          reduction: 0,
          store: store._id,
        });
        await mode.save();
        if (i === 0) {  defaultModeId = mode._id; }
        const isFirstMode = i === 0;
        store.consumationModes.push({
          mode: mode._id,
          enabled: isFirstMode,
        });
      }
      store.defaultMode = defaultModeId;
      await store.save();
      // Créer un menu par défaut pour le magasin
      const menu = new Menu({
        store: store._id,
        name: 'Menu Item',
        description: 'Menu Item',
        currency: 'USD',
      });
      await menu.save();
      // Mettre à jour les informations du propriétaire et de l'entreprise
      owner.stores.push(store._id);
      owner.company = company._id;
      await owner.save();
      company.stores = store._id;
      await company.save();
      // Valider la transaction MongoDB
      await session.commitTransaction();
      session.endSession();

      // Envoyer une réponse avec l'ID de l'organisation Uber
      res.status(201).json({ message: 'Company created successfully', organization_id: responseData.organization_id });
    } else {
      // Si la création de l'organisation Uber a échoué, renvoyer une erreur
      res.status(400).json({ message: 'Failed to create Uber organization' });
    }
    
  } catch (error) {
    // En cas d'erreur, annuler la transaction MongoDB et renvoyer une erreur
    console.error(error);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: 'An error occurred while creating the Company' });
  }
});
//getcompany by id
router.get('/getCompanyById/:id', async (req, res) => {
  try {
    const companyId = req.params.id;
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'company not found' });
    }
    res.json(company);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while retrieving the company' });
  }
});
//updatecompany
router.put('/updatecompany/:companyId', upload.single('image'), async (req, res) => {
  try {
    const { ownerId, name, legalstatus, duns , email, website} = req.body;
    const image = req.file ? req.file.filename : '';
    const owner = await User.findById(ownerId);
    const address = JSON.parse(req.body.address);
    const phone_details = JSON.parse(req.body.phone_details); // Parse phone_details as JSON
    const existingCompany = await Company.findById(req.params.companyId);
    if (!existingCompany) {
      return res.status(404).json({ message: 'Company not found' });
    }
    existingCompany.owners = ownerId;
    existingCompany.name = name;
    existingCompany.legalstatus = legalstatus;
    existingCompany.duns = duns;
    existingCompany.email = email;
    existingCompany.website = website;
    existingCompany.address = {
      street: address.street,
      city: address.city,
      state: address.state,
      zipcode: address.zipcode,
      country_iso2: address.country_iso2
    };
    existingCompany.phone_details = phone_details;
    if (req.file) {
      existingCompany.CompanyLogo = req.file.filename; }
    const updateCompany = await existingCompany.save();
    res.json({ message: 'Company information updated successfully', updateCompany });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
// Route pour supprimer une entreprise et ses dépendances
router.delete('/deleteCompany/:companyId', async (req, res) => {
  try {
      const companyId = req.params.companyId;
      const company = await Company.findById(companyId);
      if (!company) { return res.status(404).json({ message: 'Company not found' });  }
      const stores = await Store.find({ companyId: companyId });
      for (const store of stores) {
          await Menu.deleteMany({ store: store._id });
          await ConsumationMode.deleteMany({ store: store._id });
          await User.updateOne({ _id: store.owner }, { $pull: { stores: store._id } });
      }
            await Store.deleteMany({ companyId: companyId });
      await Company.findByIdAndDelete(companyId);
      res.status(200).json({ message: 'Company and associated stores and menus deleted successfully' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'An error occurred while deleting the Company' });
  }
});
//addcolor
router.post('/stores/:storeId/colors', async (req, res) => {
  try {
    const   primairecolor = req.body.primairecolor;
    const   secondairecolor = req.body.secondairecolor;
    const storeId = req.params.storeId;
    const store = await Store.findById(storeId);
    if (!store) { return res.status(404).json({ error: 'Store not found' }); }
    store.primairecolor=primairecolor,
    store.secondairecolor=secondairecolor;
    await store.save();
    res.status(201).json(store);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Get Color
router.get('/stores/:storeId/colors', async (req, res) => {
  const storeId = req.params.storeId;
  try {
    const store = await Store.findById(storeId);
    if (!store) { return res.status(404).json({ error: 'Store not found' });}
    res.status(200).json({
      primairecolor: store.primairecolor,
      secondairecolor: store.secondairecolor
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}); 
//orders
router.get("/orders/:storeId", async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const orders = await Order.find({ "storeId": storeId });
    if (orders.length === 0) {  return res.status(404).json({ message: "No orders found for the given store ID" }); }
    res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
//getorderbyid
router.get('/getOrdersById/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    if (!order) { return res.status(404).json({ message: 'stores not found' }); }
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while retrieving the stores' });
  }
});
//supprimer order
// Route pour supprimer une commande par ID
router.delete('/deleteOrder/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const deletedOrder = await Order.findByIdAndDelete(orderId);
    if (!deletedOrder) {
      return res.status(404).json({ message: 'Order not found' });  }
    res.json({ message: 'Order deleted successfully', deletedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while deleting the order' });
  }
});
//supprimer les order
router.delete('/deleteOrders', async (req, res) => {
  try {
    const orderIds = req.body.orderIds;
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: 'Invalid or empty order IDs provided' });
    }
    const deletedOrders = await Order.deleteMany({ _id: { $in: orderIds } });
    if (!deletedOrders) {
      return res.status(404).json({ message: 'No orders found for deletion' }); }
    res.json({ message: 'Orders deleted successfully', deletedOrders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while deleting the orders' });
  }
});
//update orders  status
// update Orders
router.put('/updateOrders/:storesId', async (req, res) => {
  const orderId = req.params.storesId;
  const status = req.body.Data;
  try {
    const order = await Order.findById(orderId);
    if (!order) {  return res.status(404).json({ message: 'Order not found' });}
    order.status = status;
    await order.save();
    res.json({ message: 'Order information updated successfully', order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.delete('/option-groups/:groupId/options/:optionId',async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const optionId = req.params.optionId;
    const optionGroup = await GroupeOption.findById(groupId);
    if (!optionGroup) {
      return res.status(404).json({ error: 'Option group not found' });
    }
    const optionIndex = optionGroup.options.findIndex(opt => opt._id.toString() === optionId);
    if (optionIndex === -1) {
      return res.status(404).json({ error: 'Option not found in the option group' });
    }
    optionGroup.options.splice(optionIndex, 1);
    await optionGroup.save();
    return res.status(200).json({ message: 'Option deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.put('/option/:groupId/:optionId', async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const optionId = req.params.optionId;
    const { price, isDefault } = req.body;
    const optionGroup = await GroupeOption.findById(groupId);
    if (!optionGroup) { return res.status(404).json({ message: 'OptionGroup not found' }); }
    const optionIndex = optionGroup.options.findIndex(
      (opt) => opt._id.toString() === optionId
    );
    if (optionIndex === -1) {return res.status(404).json({ message: 'Option not found within OptionGroup' }); }
    if (price !== undefined) {  optionGroup.options[optionIndex].price = price; }
    if (isDefault !== undefined) {optionGroup.options[optionIndex].isDefault = isDefault; }
    await optionGroup.save();
    res.json({ message: 'Option updated successfully', optionGroup });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
router.delete('/:optionGroupId/options/:optionId/subOptionGroups/:subOptionGroupId', async (req, res) => {
  const { optionGroupId, optionId, subOptionGroupId } = req.params;
  try {
    const optionGroup = await GroupeOption.findById(optionGroupId);
    if (!optionGroup) {
      return res.status(404).json({ error: 'OptionGroup not found' });}
    const option = optionGroup.options.find(opt => opt._id == optionId);
    if (!option) {  return res.status(404).json({ error: 'Option not found' }); }
    const subOptionGroupIndex = option.subOptionGroup.indexOf(subOptionGroupId);
    if (subOptionGroupIndex === -1) {return res.status(404).json({ error: 'SubOptionGroup not found' }); }
    option.subOptionGroup.splice(subOptionGroupIndex, 1);
    await optionGroup.save();
    res.json({ message: 'SubOptionGroup deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.put('/products/:productId/changeOptionGroupIndex', async (req, res) => {
  const { productId } = req.params;
  const { oldIndex, newIndex } = req.body;
  try {
    const product = await Product.findById(productId);
    if (oldIndex < 0 || oldIndex >= product.optionGroups.length || newIndex < 0 || newIndex >= product.optionGroups.length) {
      return res.status(400).json({ message: 'Invalid index values' });
    }
    const [removedOptionGroup] = product.optionGroups.splice(oldIndex, 1);
    product.optionGroups.splice(newIndex, 0, removedOptionGroup);
    await product.save();
    res.json({ message: 'OptionGroup index changed successfully', product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.post('/addOptionGroupsWithCategory/:categoryId', async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const category = await Category.findById(categoryId);
    if (!category) { return res.status(404).json({ message: 'Category not found' });}
    const optionGroupIdToAdd = req.body.optionGroup; 
    if (!optionGroupIdToAdd) {
      return res.status(400).json({ message: 'OptionGroup must be a valid ObjectId' });
    }
    await Product.updateMany({ category: categoryId }, { $addToSet: { optionGroups: optionGroupIdToAdd } });
    res.json({ message: 'Option group added to all products of the category' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.put('/products/:productId/changeSizeOptionGroupIndex', async (req, res) => {
  const { productId } = req.params;
  const { sizeIndex, oldIndex, newIndex } = req.body;
  try {
    const product = await Product.findById(productId);
      const [removedOptionGroup] = product.size[sizeIndex].optionGroups.splice(oldIndex, 1);
    product.size[sizeIndex].optionGroups.splice(newIndex, 0, removedOptionGroup);
    await product.save();
    res.json({ message: 'OptionGroup index changed successfully', product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
//Api openingHours
router.get('/opening-hours', async (req, res) => {
  try {
    const store = await Store.findById('storeId');
    const openingHours = store.openingdate.map(day => ({
      isOpen: day.isOpen,
      shifts: day.shifts
    }));
    res.json({ openingHours });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.post('/update-opening-hours/:storeId', async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    let currentOpeningDates = store.openingdate || [];
    if (currentOpeningDates.length >= 2) {
      currentOpeningDates.shift(); 
    }
    const newOpeningDate = req.body;
    const filteredDays = Object.entries(newOpeningDate.jour)
      .filter(([day, details]) => details.isOpen)
      .reduce((acc, [day, details]) => {
        acc[day] = details;
        return acc;
      }, {});
    currentOpeningDates.push({
      shifts: newOpeningDate.shifts,
      jour: filteredDays,
    });
    store.openingdate = currentOpeningDates;
    await store.save();
    res.json({ message: 'Opening hours updated successfully for selected days', store });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.get('/get-opening-hours/:storeId', async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    res.json({ openingHours: store.openingdate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.delete('/deletehours/:storeId/:idHours', async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const idHours = req.params.idHours;
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: 'Store non trouvé' });
    }
    const openingDateIndex = store.openingdate.findIndex(date => date._id == idHours);
    if (openingDateIndex === -1) {
      return res.status(404).json({ message: 'Opening date non trouvé' });
    }
    store.openingdate.splice(openingDateIndex, 1);
    await store.save();
    res.json({ message: 'hours supprimé avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la suppression du magasin' });
  }
});
router.get('/gethoursbyid/:storeId/:idHours', async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const idHours = req.params.idHours;
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    const foundHours = store.openingdate.find(hour => hour._id.toString() === idHours);
    if (!foundHours) {
      return res.status(404).json({ error: 'Opening hours not found' });
    }
    res.json({ openingHours: foundHours });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.put('/updatehoraire/:storeId/:idHours', async (req, res) => {
  const storeId = req.params.storeId;
  const idHours = req.params.idHours;
  try {
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: 'Store non trouvé' });
    }
    const heure = store.openingdate.find(item => item._id.toString() === idHours);
    if (!heure) {
      return res.status(404).json({ message: 'Horaire non trouvé' });
    }
    const filteredDays = {};
    Object.keys(req.body.jour).forEach(day => {
      if (req.body.jour[day].isOpen) {
        filteredDays[day] = req.body.jour[day];
      }
    });
    if (req.body.shifts && req.body.shifts.start && req.body.shifts.end) {
      heure.shifts.start = req.body.shifts.start;
      heure.shifts.end = req.body.shifts.end;
    } else {
      return res.status(400).json({ message: 'Données de shift invalides' });
    }
    heure.jour = filteredDays;
    await store.save();
    res.json({ message: 'Horaire mis à jour avec succès', store });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur interne du serveur', error });
  }
});
//finHours
//updatemode
router.put('/updateConsommation/:modeId', async (req, res) => {
  const modeId = req.params.modeId;
  try {
    const mode = await ConsumationMode.findById(modeId);
    if (!mode) {
      return res.status(404).json({ message: 'Mode not found' });
    }
    mode.name = req.body.name;
    mode.description = req.body.description;
    mode.frais = req.body.frais;
    mode.taux = req.body.taux;
    mode.applyTaux = req.body.applyTaux;
    mode.applicationType = req.body.applicationType;
    mode.reduction = req.body.reduction;
    await mode.save();
    res.json({ message: 'Mode information updated successfully', mode });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
//update Mode consommation
router.get('/getConsommation/:id', async (req, res) => {
  try {
    const modeId = req.params.id;
    const mode = await ConsumationMode.findById(modeId);
    if (!mode) { return res.status(404).json({ message: 'mode not found' }); }
    res.json(mode);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while retrieving the stores' });
  }
});
router.put('/categories/:categoryId/update-image', upload.single('image'), processImage,async (req, res) => {
  const categoryId = req.params.categoryId;
  try {
    const category = await Category.findById(categoryId);
    if (!category) { return res.status(404).json({ error: 'Category not found' }); }
    const oldImageFilename = category.image;
    category.image = req.processedImageFileName ;
    const updatedCategory = await category.save();
    const imagePath = path.join(__dirname, '../uploads', oldImageFilename);
    await fsPromises.unlink(imagePath);
    res.json(updatedCategory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.put('/products/:productId/update-image', upload.single('image'),processImage, async (req, res) => {
  const productId = req.params.productId;
  try {
    const product = await Product.findById(productId);
    if (!product) {return res.status(404).json({ error: 'Product not found' }); }
    const oldImageFilename = product.image;
    product.image = req.processedImageFileName 
    const updatedProduct = await product.save();
    const imagePath = path.join(__dirname, '../uploads', oldImageFilename);
    await fsPromises.unlink(imagePath);
    res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.put('/options/:optionId/update-image', upload.single('image'),processImage, async (req, res) => {
  const optionId = req.params.optionId;
  try {
    const option = await ProductOption.findById(optionId);
    if (!option) { return res.status(404).json({ error: 'option not found' });}
    const oldImageFilename = option.image;
    option.image = req.processedImageFileName 
    const updatedOption = await option.save();
    const imagePath = path.join(__dirname, '../uploads', oldImageFilename);
    await fsPromises.unlink(imagePath);
    res.json(updatedOption);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
//fin mode
//Api Promo
//addPromo
router.post('/promo', upload.single('image'), async (req, res) => {
  try {
    const { storeId, name, numberGroup, number2, discount, availability } = req.body;
    const image = req.file ? req.file.filename : '';
    const promos = JSON.parse(req.body.promos);
    const availabilitys = JSON.parse(req.body.availabilitys);
    const existingStore = await Store.findById(storeId);
    if (!existingStore) {
      return res.status(404).json({ message: 'Associated store not found' });
    }
    const promo = new Promo({
      storeId,
      name,
      numberGroup,
      number2,
      image: image,
      promos: promos,
      discount,
      availability,
      availabilitys: availabilitys,
    });
    const savedPromo = await promo.save();
    const menu = await Menu.findOne({ store: storeId });
    if (!menu) {
      console.error('Menu not found for the store ID:', storeId);
      return res.status(404).json({ message: 'Menu not found for the store' });
    }
    menu.promos = menu.promos || [];
    menu.promos.push(savedPromo._id);
    await menu.save();
    res.status(201).json({ message: 'Promo created successfully', promo: savedPromo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while creating the promo' });
  }
});
router.get('/getpromos/:storeId', async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const promos = await Promo.find({ storeId: storeId });
    if (!promos) {
      return res.status(404).json({ error: 'Promos not found for the specified storeId' });
    }
    res.json(promos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
//deletePromo
router.delete('/deletePromo/:prompId', checkOwner, async (req, res) => {
  try {
    const prompId = req.params.prompId;
    const promo = await Promo.findById(prompId);
    if (!promo) { return res.status(404).json({ message: 'Promo not found' });}
    await Menu.updateOne({ promos: prompId }, { $pull: { promos: prompId } });
    await Promo.findByIdAndRemove(prompId);
    res.json({ message: 'Promo deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while deleting the promo' });
  }
});
// update Promo
router.put('/updatePromoAvailability/:prompId', async (req, res) => {
  const prompId = req.params.prompId;
  try {
    const promo = await Promo.findById(prompId);
    if (!promo) {
      return res.status(404).json({ message: 'Promo not found' });
    }
    promo.availability = req.body.availability;
    await promo.save();
    res.json({ message: 'Promo availability updated successfully', promo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.get('/getPromoById/:promoId', checkOwner, async (req, res) => {
  try {
    const promoId = req.params.promoId;
    const promo = await Promo.findById(promoId);
    if (!promo) {
      return res.status(404).json({ message: 'promo not found' });
    }
    res.json(promo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while retrieving the promo' });
  }
});
router.get('/getcategorieById/:Id', checkOwner, async (req, res) => {
  try {
    const Id = req.params.Id;
    const categorie = await Category.findById(Id);
    if (!categorie) {
      return res.status(404).json({ message: 'categorie not found' });
    }
    res.json(categorie);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while retrieving the promo' });
  }
});
router.put('/updatePromo/:promoId', upload.single('image'), async (req, res) => {
  try {
    const { storeId, name, numberGroup, number2, discount, availability } = req.body;
    const image = req.file ? req.file.filename : '';
    const promos = JSON.parse(req.body.promos);
    const modelivraison = JSON.parse(req.body.availabilitys);
    const existingPromo = await Promo.findById(req.params.promoId);
    if (!existingPromo) {
      return res.status(404).json({ message: 'Promo not found' });
    }
    if (req.file) {
      existingPromo.image = req.file.filename;
    }
    existingPromo.storeId = storeId;
    existingPromo.name = name;
    existingPromo.numberGroup = numberGroup;
    existingPromo.number2 = number2;
    existingPromo.discount = discount;
    existingPromo.availability = availability;
    existingPromo.promos = promos;
    existingPromo.availabilitys = modelivraison;
    const updatedPromo = await existingPromo.save();
    res.json({ message: 'Promo information updated successfully', updatedPromo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
router.delete('/promo/:promoId/object/:objectId', async (req, res) => {
  try {
    const { promoId, objectId } = req.params;
    const promo = await Promo.findById(promoId);
    if (!promo) {
      return res.status(404).json({ message: 'Promo not found' });
    }
    let currentNumberGroup = promo.numberGroup || 0;
    await promo.updateOne({ $pull: { promos: { _id: objectId } }, $set: { numberGroup: currentNumberGroup - 1 } }).exec();
    res.status(200).json({ message: 'Object deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.post('/AddGrouppromo', async (req, res) => {
  try {
    const { promoid, selectedData2 } = req.body;
    const existingPromo = await Promo.findByIdAndUpdate(
      promoid,
      {$push: {
          promos: {
            products: selectedData2.products,
            category: selectedData2.categoryId,
            order: selectedData2.order
          } },  $inc: {  numberGroup: 1 }
      },  { new: true }
    );
    if (!existingPromo) {
      return res.status(404).json({ message: 'Promo not found' });
    }
    res.status(201).json({ message: 'Promos added successfully', promo: existingPromo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while adding promos' });
  }
});
router.put('/promogroup', async (req, res) => {
  try {
    const { promos } = req.body; 
    for (let i = 0; i < promos.length; i++) {
      const promoId = promos[i]._id;
      const newOrder = promos[i].order; 
      await Promo.updateOne({ 'promos._id': promoId }, { $set: { 'promos.$.order': newOrder } });
    }
    res.status(200).json({ message: 'Promotions updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.put('/orderPromo', async (req, res) => {
  try {
    const orderUpdates = req.body; 
    const promises = orderUpdates.map(async ({ promoId, newOrder }) => {
      const existingPromo = await Promo.findOneAndUpdate(
        { 'promos._id': promoId },
        { $set: { 'promos.$.order': newOrder } },
        { new: true } 
      );
      if (!existingPromo) {
        return { promoId, success: false };
      }
      await Promo.updateMany(
        { _id: existingPromo._id, 'promos.order': { $gt: existingPromo.promos.length } },
        { $inc: { 'promos.$.order': 1 } }
      );
      return { promoId, success: true };
    });
    await Promise.all(promises);
    res.status(200).json({ message: 'Promos updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating promos' });
  }
});
//fin Api Promo
// active or disactive store
router.put("/store/changestatus", async (req, res) => {
  const { _id, active } = req.body;
  try {
    if (_id && active !== undefined) {
      const updateStatus = await Store.findOneAndUpdate(
        { _id: _id },
        { active },
        { new: true }
      );
      if (!updateStatus) {
        return res.status(404).json({
          message: "Store not found.",
        });
      }
      return res.status(200).json({
        message: updateStatus.active ? "Store is active" : "Store is disactive",
        store: updateStatus,
      });
    }
    return res.status(400).json({
      message: "No data found. Failed to update store's status.",
    });
  } catch (err) {
    return res.status(500).json({
      message: err?.message,
    });
  }
});
router.post('/addcoupons', async (req, res) => {
  try {
    const { discount, storeId,prefix, startDate, endDate } = req.body;
    if (typeof discount !== 'number' || discount <= 0 || discount > 100) {
      return res.status(400).json({ error: 'Invalid discount value' });
    }
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ error: 'Invalid storeId' });
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: 'Invalid date range' });
    }
    const newCouponCode = voucherCode.generate({
      length: 8,
      count: 1,
      prefix: prefix+"-",
    })[0];
    const newCoupon = new Coupon({
      code: newCouponCode,
      discount,
      storeId,
      startDate,
      endDate,
    });
    await newCoupon.save();
    res.status(201).json({  newCoupon });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/coupons/:storeId', async (req, res) => {
  try {
    const storeId = req.params.storeId;
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ error: 'Invalid storeId' });
    }
    const coupons = await Coupon.find({ storeId });
    res.status(200).json(coupons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.delete('/coupons/:couponId', async (req, res) => {
  try {
    const couponId = req.params.couponId;
    if (!mongoose.Types.ObjectId.isValid(couponId)) {
      return res.status(400).json({ error: 'Invalid couponId' });
    }
    const deletedCoupon = await Coupon.findByIdAndDelete(couponId);
    if (!deletedCoupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.status(200).json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.post('/coupons/use/:couponCode', async (req, res) => {
  try {
    const couponCode = req.params.couponCode;
    if (typeof couponCode !== 'string' || couponCode.trim() === '') {return res.status(400).json({ error: 'Invalid couponCode' }); }
    const coupon = await Coupon.findOne({ code: couponCode });
    if (!coupon) {  return res.status(404).json({ error: 'Coupon not found' }); }
    const currentDate = new Date();
    if (coupon.startDate && currentDate < new Date(coupon.startDate)) {
      return res.status(400).json({ error: 'Coupon is not yet valid' });
    }
    if (coupon.endDate && currentDate > new Date(coupon.endDate)) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }
    coupon.numberOfUses += 1;
    await coupon.save();
    res.status(200).json({ message: 'Coupon used successfully', numberOfUses: coupon.numberOfUses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get("/total-customers/:storeId/", async (req, res) => {
  let storeid = req.params.storeId;
  try {
    storeid = storeid.trim();
    if (typeof storeid !== 'string') { return res.status(400).json({ error: "Invalid storeId" });}
    const result = await Order.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeid)
        },
      },
      {
        $group: {
          _id: "$client_email",
        },
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
        },
      },
    ]);
    if (result.length > 0) {  res.json({ totalCustomers: result[0].totalCustomers });
    } else {
      res.json({ totalCustomers: 0 });
    }
  } catch (error) {
    console.error("Error getting total customers:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.get('/getpromos/:storeId/:idMode', async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const idMode = req.params.idMode;
    const promos = await Promo.find({
      storeId: storeId,
    })
      .exec();
    res.status(200).json({
      message: 'Promos retrieved successfully.',
      promos: promos,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error?.message });
  }
});
router.get("/promos-by-store/:storeId/:modeId", async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const modeId = req.params.modeId;
        const promos = await Promo.find({ storeId: storeId })
    const filteredPromos = promos.map((promo) => {
      const {
        _id,
        name,
        numberGroup,
        number2,
        image,
        promos,
        category,
        order,
        discount,
        availability,
        availabilitys,
      } = promo;
      const filteredAvailabilitys = availabilitys.filter(
        (avail) => avail.mode.toString() === modeId
      );
      return {
        _id,
        name,
        numberGroup,
        number2,
        image,
        promos,
        category,
        order,
        discount,
        availability,
        availabilitys: filteredAvailabilitys,
      };
    });
    res.status(200).json(filteredPromos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.post('/create-account', async (req, res) => {
  try {
    const { email, country, storeId } = req.body;
    const restaurantAccount = await stripe.accounts.create({
      type: 'express',
      country: country,
      email: email,

    });
    const existingStore = await Store.findById(storeId);
    if (!existingStore) {return res.status(404).json({ error: 'Store not found' });}
    existingStore.stripeAccountId = restaurantAccount.id;
    await existingStore.save();
    res.json({ accountId: restaurantAccount.id, });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.post('/create-account-link', async (req, res) => {
  try {
    const { accountId,email } = req.body;
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: 'http://localhost:4200/store/payment',
      return_url: 'http://localhost:4200/store/payment',
      type: 'account_onboarding',
    });
    res.json({ url: accountLink.url });
    sendVerificationStripe(email, accountLink.url);
  } catch (error) {
    console.error('Error creating account link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.post('/clone-menu', async (req, res) => {
  try {
    const sourceMenuId = req.body.sourceMenuId; 
    const targetStoreId = req.body.targetStoreId; 
    const sourceMenu = await Menu.findById(sourceMenuId).populate({
      path: 'categorys',
      model: 'Category',
      populate: {
        path: 'products',
        model: 'Product',
        populate: [
          {
            path: "size.optionGroups",
            model: "OptionGroup",
          },
          {
            path: "optionGroups",
            model: "OptionGroup",
          },
          {
            path: "taxes",
            model: "Tax",
          },
        ], 
      },
    });
    const targetStore = await Store.findById(targetStoreId);
    if (!targetStore) { return res.status(404).json({ error: 'Target store not found' }); }
    const newMenu = new Menu({
      name: sourceMenu.name,
      store: targetStoreId,
      currency: sourceMenu.currency,
      description: sourceMenu.description,
    });
    const savedMenu = await newMenu.save();
    for (const sourceCategory of sourceMenu.categorys) {
      const newCategory = new Category({
        name: sourceCategory.name,
        store: targetStoreId,
        description: sourceCategory.description,
        availability: sourceCategory.availability,
        availabilitys: sourceCategory.availabilitys.map((availability, index) => ({
          ...availability,
          mode: targetStore.consumationModes[index].mode,
        })),
        parentId: sourceCategory.parentId,
        userId: sourceCategory.userId,
        status: sourceCategory.status,
        image: sourceCategory.image,
      });
      const savedCategory = await newCategory.save();
      savedMenu.categorys.push(savedCategory);
      for (const sourceProduct of sourceCategory.products) {
        const newProduct = new Product({
          name: sourceProduct.name,
          description: sourceProduct.description,
          availability: sourceProduct.availability,
          availabilitys: sourceProduct.availabilitys.map((availability, index) => ({
            ...availability,
            mode: targetStore.consumationModes[index].mode,
          })),
          storeId: targetStoreId,
          category: savedCategory._id,
          price: sourceProduct.price,
          image: sourceProduct.image,
          size: sourceProduct.size.map(async (sourceSizeGroup,index) => {
            const optiongroupes = sourceSizeGroup.optionGroups;
            const existingOptionGroup = await GroupeOption.findOne({
              name: optiongroupes.name,
              description: optiongroupes.description,
              store: targetStoreId,
              force_max: optiongroupes.force_max,
              force_min: optiongroupes.force_min,
              allow_quantity: optiongroupes.allow_quantity,
            });
            if (existingOptionGroup) {
              newProduct.size[index].name =sourceProduct.size[index].name;
              newProduct.size[index].price =sourceProduct.size[index].price;
              newProduct.size[index].optionGroups.push(existingOptionGroup._id);
                    } else {
              if(optiongroupes)
              {
              const newOptionGroup = new GroupeOption({
                name: sourceSizeGroup.name,
                description: sourceSizeGroup.description,
                store: targetStoreId,
                force_max: sourceSizeGroup.force_max,
                force_min: sourceSizeGroup.force_min,
                allow_quantity: sourceSizeGroup.allow_quantity,
                ownerId: sourceSizeGroup.ownerId,
              });
              const savedOptionGroup = await newOptionGroup.save();
                           newProduct.size[index].name =sourceProduct.size[index].name;
              newProduct.size[index].price =sourceProduct.size[index].price;
              newProduct.size[index].optionGroups.push(savedOptionGroup._id);
              return savedOptionGroup._id;
              } }
          }), taxes: sourceProduct.taxes,
        });
        const savedProduct = await newProduct.save();
        savedCategory.products.push(savedProduct);
        for (const sourceOptionGroup of sourceProduct.optionGroups) {
          const existingOptionGroup = await GroupeOption.findOne({
            name: sourceOptionGroup.name,
            description: sourceOptionGroup.description,
            store: targetStoreId,
            force_max: sourceOptionGroup.force_max,
            force_min: sourceOptionGroup.force_min,
            allow_quantity: sourceOptionGroup.allow_quantity,
          });
          if (existingOptionGroup) { savedProduct.optionGroups.push(existingOptionGroup);
          } else {
            const newOptionGroup = new GroupeOption({
              name: sourceOptionGroup.name,
              description: sourceOptionGroup.description,
              store: targetStoreId,
              force_max: sourceOptionGroup.force_max,
              force_min: sourceOptionGroup.force_min,
              allow_quantity: sourceOptionGroup.allow_quantity,
              ownerId: sourceOptionGroup.ownerId,
            });
            const savedOptionGroup = await newOptionGroup.save();
            savedProduct.optionGroups.push(savedOptionGroup);
          }
        }
        await savedProduct.save();
      }
      await savedCategory.save();
    }
    await savedMenu.save();
    res.status(200).json({ message: 'Menu cloned successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/company/:companyId/managers', async (req, res) => {
  const companyId = req.params.companyId;
  try {
    const managers = await User.find({ company: companyId, role: 'manager' });
    res.json(managers);
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.delete('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) { return res.status(400).json({ error: 'Invalid userId' }); }
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {  return res.status(404).json({ error: 'User not found' }); }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/getmanagerByid/:id', async (req, res) => {
  try {
    const managerId = req.params.id;
    const manager = await User.findById(managerId);
    if (!manager) { return res.status(404).json({ message: 'Manager not found' });}
    res.json(manager);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while retrieving the manager' });
  }
});
//Manager
router.post("/addmanager", upload.single('image'), async (req, res) => {
  try {
    const image = req.file ? req.file.filename : '';
    const stores = JSON.parse(req.body.stores);
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) { return res.status(400).json({ error: "Email already exists." });  }
    const hash = await bcrypt.hash(req.body.password, 10);
    const user = new User({
      stores: stores,
      company: req.body.company,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phoneNumber: req.body.phoneNumber,
      password: hash,
      sexe: req.body.sexe,
      role: req.body.role,
      status: req.body.status,
      image: image
    });
    await user.save();
     // Ajouter l'identifiant du nouveau gestionnaire (manager) aux magasins concernés
   /*  for (const storeId of stores) {
      const store = await Store.findById(storeId);
      if (!store) {
        throw new Error(`Store with ID ${storeId} not found.`);
      }
      store.managers.push(user._id);
      await store.save();
    }*/
    res.status(201).json({ message: "User created !", user });
  } catch (error) {
    console.error("Error adding manager:", error);
    res.status(500).json({ error: "An error occurred while adding the manager." });
  }
});
router.put("/updateImage/:userId", upload.single('image'), async (req, res) => {
  try {
    const userId = req.params.userId;
    const image = req.file ? req.file.filename : '';
    const user = await User.findById(userId);
    if (!user) {  return res.status(404).json({ error: "User not found." });}
    user.image = image;
    await user.save();
    res.status(200).json({ message: "User image updated successfully.", user });
  } catch (error) {
    console.error("Error updating user image:", error);
    res.status(500).json({ error: "An error occurred while updating user image." });
  }
});
router.get('/company/:companyId/managers', async (req, res) => {
  const companyId = req.params.companyId;
  try {
    const managers = await User.find({ company: companyId, role: 'manager' });
    res.json(managers);
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.delete('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid userId' }); }
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) { return res.status(404).json({ error: 'User not found' }); }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/getmanagerByid/:id', async (req, res) => {
  try {
    const managerId = req.params.id;
    const manager = await User.findById(managerId);
    if (!manager) {return res.status(404).json({ message: 'Manager not found' }); }
    res.json(manager);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while retrieving the manager' });
  }
});
//put manage
router.put("/updateManager/:id", upload.single('image'), (req, res) => {
  const stores = JSON.parse(req.body.stores);
  User.findOne({ email: req.body.email })
    .then(async (existingUser) => { // Rendre la fonction de rappel asynchrone
      if (existingUser && existingUser._id != req.params.id) {
        return res.status(400).json({ error: "Email already exists." });
      }
      let passwordUpdatePromise = Promise.resolve();
      if (req.body.password) {
        passwordUpdatePromise = bcrypt.hash(req.body.password, 10);
      }
      passwordUpdatePromise
        .then(async (hash) => { // Rendre la fonction de rappel asynchrone
          const updatedFields = {
            stores: stores,
            company: req.body.company,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            phoneNumber: req.body.phoneNumber,
            sexe: req.body.sexe,
            role: req.body.role,
            status: req.body.status,
          };

          // Mettre à jour les gestionnaires dans les magasins concernés
        /*  for (const storeId of stores) {
            const store = await Store.findById(storeId);
            if (!store) {
              throw new Error(`Store with ID ${storeId} not found.`);
            }
            // Vérifier si l'utilisateur est déjà un gestionnaire du magasin
            if (!store.managers.includes(req.params.id)) {
              store.managers.push(req.params.id); // Ajouter l'utilisateur aux gestionnaires du magasin
              await store.save(); // Sauvegarder le magasin mis à jour
            }
          }
          */

          // Mettre à jour l'utilisateur
          User.findByIdAndUpdate(req.params.id, updatedFields, { new: true })
            .then((updatedUser) => {
              if (!updatedUser) {
                return res.status(404).json({ message: "User not found" });
              }
              res.status(200).json({ message: "User updated", updatedUser });
            })
            .catch((error) => {
              console.error("Error updating user:", error);
              res.status(500).json({ error: "An error occurred while updating the user." });
            });
        })

        .catch((error) => {
          console.error("Error hashing password:", error);
          res.status(500).json({ error: "An error occurred while hashing the password." });
        });

    })

    .catch((error) => {
      console.error("Error checking existing email:", error);
      res.status(500).json({ error: "An error occurred while checking existing email." });
    });
});
router.post('/uploadavif', upload.single('image'), processImage, (req, res) => {
  // Your route logic here
  res.send('Image uploaded and processed successfully!');
})
router.post('/specialites', async (req, res) => {
  try {
    const newSpecialite = new Specialite(req.body);
    const savedSpecialite = await newSpecialite.save();
    res.status(201).json(savedSpecialite);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get('/specialites', async (req, res) => {
  try {
    const specialites = await Specialite.find({});
    res.status(200).json(specialites);
  } catch (error) {res.status(500).json({ error: error.message }); }
});
router.get('/specialites/:specialiteId', async (req, res) => {
  try {
    const specialiteId = req.params.specialiteId;
    const specialite = await Specialite.findById(specialiteId);
    if (!specialite) {return res.status(404).json({ message: 'Specialite not found' });}
    res.status(200).json(specialite);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get('/stores-specialites/:specialtyId', async (req, res) => {
  try {
    const specialtyId = req.params.specialtyId;
    const stores = await Store.find({ specialites: new  mongoose.Types.ObjectId(specialtyId) })
      .populate('specialites'); 
    res.json(stores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.put("/switchuber/:storeId", async (req, res) => {
  const { storeId } = req.params;
  try {
    const store = await Store.findById(storeId);
    if (!store) { return res.status(404).json({ message: "Store not found" }); }
    store.uberDirect = !store.uberDirect;
    const updatedStore = await store.save();
    res.json( store.uberDirect);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
router.put("/switchpaiement/:storeId", async (req, res) => {
  const { storeId } = req.params;
  try {
    const store = await Store.findById(storeId);
    if (!store) { return res.status(404).json({ message: "Store not found" });}
    store.paiementEnLigne = !store.paiementEnLigne;
    const updatedStore = await store.save();
    res.json( store.paiementEnLigne);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
//switchmode
router.put("/switchmodeuber/:storeId", async (req, res) => {
  const { storeId } = req.params;
  try {
    const store = await Store.findById(storeId);
    if (!store) { return res.status(404).json({ message: "Store not found" }); }
    store.modeUberdirect = !store.modeUberdirect;
    const updatedStore = await store.save();
    res.json( store.modeUberdirect);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
//retourner 20order
router.get("/orderss/:storeId", async (req, res) => {
  try {
    const storeId = req.params.storeId;
        const orders = await Order.find({ "storeId": storeId })
                              .sort({ createdAt: 1 }) 
    if (orders.length === 0) {
      return res.status(404).json({ message: "No orders found for the given store ID" });}
    res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
//switchguestmode
router.put("/switchguestmode/:storeId", async (req, res) => {
  const { storeId } = req.params;
  const newGuestMode = req.body[0]; // Obtenez le nouvel objet guestmode
  try {
    const store = await Store.findById(storeId);
    if (!store) {  return res.status(404).json({ message: "Store not found" }); }
    store.guestmode = newGuestMode;
    const updatedStore = await store.save();
    res.json(updatedStore);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
router.put("/automaticcommande/:storeId", async (req, res) => {
  const { storeId } = req.params;
  try { const store = await Store.findById(storeId);
    if (!store) {return res.status(404).json({ message: "Store not found" });}
    store.automaticCommande = !store.automaticCommande;
    const updatedStore = await store.save();
    res.json( store.automaticCommande);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
//put accountstripe meme id
router.put("/stripaccount", async (req, res) => {
const { store, stripeAccountId } = req.body;
  try {
    const storeid = await Store.findById(store);
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }
    storeid.stripeAccountId = stripeAccountId;
    const updatedStore = await storeid.save();
    res.json(updatedStore.stripeAccountId);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
//clone menu
router.post('/cloneMenuStore', async (req, res) => {
  const { newStoreID, OldStoreID } = req.body;
  const OldAndNew = [];
  //targetStoreId store qui get from him 
  try {
    const store = await Store.find({ _id: new mongoose.Types.ObjectId(OldStoreID) });
    if (!store || store.length === 0) {
      return res.status(400).json({ error: 'No store found with this ID' });
    }
    await ConsumationMode.deleteMany({ store: new mongoose.Types.ObjectId(newStoreID) });
    await optionGroupe.deleteMany({ store: new mongoose.Types.ObjectId(newStoreID) });
    await ProductOption.deleteMany({ store: new mongoose.Types.ObjectId(newStoreID) });
    await Tax.deleteMany({ store: new mongoose.Types.ObjectId(newStoreID) });
    await Product.deleteMany({ storeId: new mongoose.Types.ObjectId(newStoreID) });
    await Category.deleteMany({ store: new mongoose.Types.ObjectId(newStoreID) });
    await Menu.deleteMany({ store: new mongoose.Types.ObjectId(newStoreID) });
    const consoumation = []
    const consoumation2 = []
    const consoumation3 = []
    /// mode Consumation :
    const allModeConsumation = await ConsumationMode.find({ store: new mongoose.Types.ObjectId(OldStoreID) });
    for (const modeByMode of allModeConsumation) {
      const clonedMode = new ConsumationMode({
        ...modeByMode.toObject(),
        _id: new mongoose.Types.ObjectId(),
        store: new mongoose.Types.ObjectId(newStoreID),
        description: modeByMode.description + ' Cloned'
      });
      TheNewModeConsumation = await clonedMode.save();
      consoumation.push({
        mode: TheNewModeConsumation._id,
        enabled: true,
        _id: new mongoose.Types.ObjectId(),
      })
      consoumation2.push({
        availability: true,
        mode: TheNewModeConsumation._id,
        _id: new mongoose.Types.ObjectId(),
      })
      consoumation3.push({
        availability: true,
        mode: TheNewModeConsumation._id,
        _id: new mongoose.Types.ObjectId(),
      })
      const newold = {
        OldOne: modeByMode._id,
        NewOne: TheNewModeConsumation._id
      }
      OldAndNew.push(newold);
    }
    //   optionGroup  : 
    const allOptionGroup = await optionGroupe.find({ store: new mongoose.Types.ObjectId(OldStoreID) });
    for (const OptionByOption of allOptionGroup) {
      const clonedOptionGroup = new optionGroupe({
        ...OptionByOption.toObject(),
        _id: new mongoose.Types.ObjectId(),
        store: new mongoose.Types.ObjectId(newStoreID),
        name: OptionByOption.name + " Cloned"
      });
      TheNewOptionGroup = await clonedOptionGroup.save();
      const newold = {
        OldOne: OptionByOption._id,
        NewOne: TheNewOptionGroup._id
      }
      OldAndNew.push(newold);
    }
    // productOption   : 
    const allProductOption = await ProductOption.find({ store: new mongoose.Types.ObjectId(OldStoreID) });
    for (const PrOptionByOption of allProductOption) {
      const clonedProductOption = new ProductOption({
        ...PrOptionByOption.toObject(),
        _id: new mongoose.Types.ObjectId(),
        store: new mongoose.Types.ObjectId(newStoreID),
        name: PrOptionByOption.name + " Cloned"
      });
      TheNewProductOption = await clonedProductOption.save();
      const newold = {
        OldOne: PrOptionByOption._id,
        NewOne: TheNewProductOption._id
      }
      OldAndNew.push(newold);
    }
    //Taxe 
    const allTax = await Tax.find({ storeId: new mongoose.Types.ObjectId(OldStoreID) });
    for (const TaxByTax of allTax) {
      const clonedTax = new Tax({
        ...TaxByTax.toObject(),
        _id: new mongoose.Types.ObjectId(),
        storeId: new mongoose.Types.ObjectId(newStoreID),
        name: TaxByTax.name + " Cloned"
      });
      TheNewTax = await clonedTax.save();
      const newold = {
        OldOne: TaxByTax._id,
        NewOne: TheNewTax._id
      }
      OldAndNew.push(newold);
    }
    //Product 
    const Productfor = []
    const Allproduct = await Product.find({ storeId: new mongoose.Types.ObjectId(OldStoreID) });
    for (const ProductByProduct of Allproduct) {
      const clonedProduct = new Product({
        ...ProductByProduct.toObject(),
        _id: new mongoose.Types.ObjectId(),
        storeId: new mongoose.Types.ObjectId(newStoreID),
        name: ProductByProduct.name + " Cloned"
      });
      TheNewProduct = await clonedProduct.save();
      const newold = {
        OldOne: ProductByProduct._id,
        NewOne: TheNewProduct._id
      }
      Productfor.push(TheNewProduct._id)
      OldAndNew.push(newold);
    }
    //Category
    const AllCategory = await Category.find({ store: new mongoose.Types.ObjectId(OldStoreID) });
    for (const CatByCat of AllCategory) {
      const clonedCategory = new Category({
        ...CatByCat.toObject(),
        _id: new mongoose.Types.ObjectId(),
        store: new mongoose.Types.ObjectId(newStoreID),
        name: CatByCat.name + " Cloned"
      });
      TheNewCategory = await clonedCategory.save();
      const newold = {
        OldOne: CatByCat._id,
        NewOne: TheNewCategory._id
      }
      OldAndNew.push(newold);
    }
    //Menu
    const AllMenu = await Menu.find({ store: new mongoose.Types.ObjectId(OldStoreID) });
    for (const MenuByMenu of AllMenu) {
      const clonedMenu = new Menu({
        ...MenuByMenu.toObject(),
        _id: new mongoose.Types.ObjectId(),
        store: new mongoose.Types.ObjectId(newStoreID),
        name: MenuByMenu.name + " Cloned"
      });
      TheNewMenu = await clonedMenu.save();
      const newold = {
        OldOne: MenuByMenu._id,
        NewOne: TheNewMenu._id
      }
      OldAndNew.push(newold);
    }
    console.log("Cloned .")
    console.log("Update ModeConsumation .")
    console.log("-----------------------------")
    console.log("Update OptionGroup .")
    /// Update OptionGroup
    const allNewsoptionGroup = await optionGroupe.find({ store: new mongoose.Types.ObjectId(newStoreID) });
    for (const optionGroupByoptionGroup of allNewsoptionGroup) {
      const pp = []
      for (let i = 0; i < optionGroupByoptionGroup.options.length; i++) {
        const item = optionGroupByoptionGroup.options[i];
        const TheNewOptionGroup = {
          option: item.option,
          price: item.price,
          name: item.name + " Cloned",
          tax: item.tax,
          unite: item.unite,
          promoPercentage: item.promoPercentage,
          image: item.image,
          isDefault: item.isDefault,
          subOptionGroup: item.subOptionGroup
        }
        for (const IDByID of OldAndNew) {
          if (item.option.toString() === IDByID.OldOne.toString()) {
            TheNewOptionGroup.option = IDByID.NewOne;
          }
        }
        const pm = []
        for (let j = 0; j < optionGroupByoptionGroup.options[i].subOptionGroup.length; j++) {
          const item2 = optionGroupByoptionGroup.options[i].subOptionGroup[j];
          for (const IDByID of OldAndNew) {
            if (item2.toString() === IDByID.OldOne.toString()) {
              pm.push(IDByID.NewOne)
            }
          }
        }
        TheNewOptionGroup.subOptionGroup = pm;
        pp.push(TheNewOptionGroup)
      }
      await optionGroupe.updateOne(
        { _id: optionGroupByoptionGroup._id },
        { $set: { options: pp } }
      );
    }
    console.log("-----------------------------")
    console.log("Update ProductOption .")
    /// Update   ProductOption
    const allNewProductOption = await ProductOption.find({ store: new mongoose.Types.ObjectId(newStoreID) });
    for (const ProductOptionByProductOptionp of allNewProductOption) {
      const ppp = [];
      for (let i = 0; i < ProductOptionByProductOptionp.optionGroups.length; i++) {
        const item = ProductOptionByProductOptionp.optionGroups[i];
        for (const IDByID of OldAndNew) {
          if (item.toString() === IDByID.OldOne.toString()) {
            ppp.push(IDByID.NewOne)
            //ProductOptionByProductOptionp.optionGroups[i] = IDByID.NewOne;
          }
        }
      }
      await ProductOption.updateOne(
        { _id: ProductOptionByProductOptionp._id },
        { $set: { optionGroups: ppp } }
      );
    }
    console.log("-----------------------------")
    console.log("Update Tax .")
    console.log("-----------------------------")
    console.log("Update Product .")
    const allNewProduct = await Product.find({ storeId: new mongoose.Types.ObjectId(newStoreID) });
    for (const ProductByProduct of allNewProduct) {
      const objProduct1Size = []
      const objProduct1taxes = []
      const objProduct1OptionGroup = []
      for (let i = 0; i < ProductByProduct.size.length; i++) {
        const newSize = {
          name: ProductByProduct.size[i].name,
          price: ProductByProduct.size[i].price,
          optionGroups: ProductByProduct.size[i].optionGroups,
          _id: new mongoose.Types.ObjectId(),
        }
        const ppp = []
        for (let j = 0; j < ProductByProduct.size[i].optionGroups.length; j++) {
          const item = ProductByProduct.size[i].optionGroups[j];
          if (item != null) {
            for (const IDByID of OldAndNew) {
              if (item.toString() === IDByID.OldOne.toString()) {
                ppp.push(IDByID.NewOne)
              }
            }
          }
        }
        newSize.optionGroups = ppp
        objProduct1Size.push(newSize)
      }
      if (ProductByProduct.optionGroups.length > 0) {
        for (let i = 0; i < ProductByProduct.optionGroups.length; i++) {
          const item = ProductByProduct.optionGroups[i];
          for (const IDByID of OldAndNew) {
            if (item.toString() === IDByID.OldOne.toString()) {
              objProduct1OptionGroup.push(IDByID.NewOne);
              // ProductByProduct.optionGroups[i] = IDByID.NewOne;
            }
          }
        }
      }
      for (let i = 0; i < ProductByProduct.taxes.length; i++) {
        const newtax = {
          tax: ProductByProduct.taxes[i].tax,
          mode: ProductByProduct.taxes[i].mode,
          _id: new mongoose.Types.ObjectId()
        }
        const item = ProductByProduct.taxes[i].tax;
        const item2 = ProductByProduct.taxes[i].mode;
        if (item != undefined && item2 != undefined) {
          for (const IDByID of OldAndNew) {
            if (item.toString() === IDByID.OldOne.toString()) {
              newtax.tax = IDByID.NewOne;
            }
            if (item2.toString() === IDByID.OldOne.toString()) {
              newtax.mode = IDByID.NewOne;
            }
          }
          objProduct1taxes.push(newtax);
        }
      }
      const cc = ProductByProduct.category;
      const aa = []
      for (const IDByID of OldAndNew) {
        if (cc.toString() === IDByID.OldOne.toString()) {
          aa.push(IDByID.NewOne)
        }
      }
      await Product.updateOne(
        { _id: ProductByProduct._id },
        { $set: { optionGroups: objProduct1OptionGroup, availabilitys: consoumation2, size: objProduct1Size, taxes: objProduct1taxes, category: aa[0] } }
      );
    }
    console.log("-----------------------------")
    console.log("Update Category .")
    const allNewCat = await Category.find({ store: new mongoose.Types.ObjectId(newStoreID) });
    for (const CatByCat of allNewCat) {
      const productByCat = []
      if (CatByCat.products.length > 0) {
        for (let i = 0; i < CatByCat.products.length; i++) {
          const item = CatByCat.products[i];
          for (const IDByID of OldAndNew) {
            if (item.toString() === IDByID.OldOne.toString()) {
              // CatByCat.products[i] = IDByID.NewOne;
              productByCat.push(IDByID.NewOne);
            }
          }
        }
      }
      const subcategories = []
      if (CatByCat.subcategories.length > 0) {
        for (let i = 0; i < CatByCat.subcategories.length; i++) {
          const item = CatByCat.subcategories[i];
          for (const IDByID of OldAndNew) {
            if (item.toString() === IDByID.OldOne.toString()) {
              //CatByCat.subcategories[i] = IDByID.NewOne;
              subcategories.push(IDByID.NewOne);
            }
          }
        }
      }
      await Category.updateOne(
        { _id: CatByCat._id },
        { $set: { subcategories: subcategories, availabilitys: consoumation3, products: productByCat } }
      );
    }
    console.log("-----------------------------")
    console.log("Update Menu .")
    const allNewMenu = await Menu.find({ store: new mongoose.Types.ObjectId(newStoreID) });
    for (const menuBymenu of allNewMenu) {
      const ppppa = []
      if (menuBymenu.categorys.length > 0) {
        for (let i = 0; i < menuBymenu.categorys.length; i++) {
          const item = menuBymenu.categorys[i];
          for (const IDByID of OldAndNew) {
            if (item.toString() === IDByID.OldOne.toString()) {
              ppppa.push(IDByID.NewOne)
            }
          }
        }
      }
      await Menu.updateOne(
        { _id: menuBymenu._id },
        { $set: { categorys: ppppa } }
      );
    }
    console.log("-----------------------------")
    console.log("Update Store .")
    const storeUp = await Store.findOne({ _id: new mongoose.Types.ObjectId(OldStoreID) });
    const obj1 = [];
    for (let i = 0; i < storeUp.categories.length; i++) {
      //   console.log(i);
      const item = storeUp.categories[i];
      for (const IDByID of OldAndNew) {
        if (item.toString() === IDByID.OldOne.toString()) {
          obj1.push(IDByID.NewOne);
        }
      }
    }
    const obj2 = [];
    for (let i = 0; i < storeUp.products.length; i++) {
      const item = storeUp.products[i];
      if (item != undefined) {
        for (const IDByID of OldAndNew) {
          if (item.toString() === IDByID.OldOne.toString()) {
            obj2.push(IDByID.NewOne);
          }
        }
      }
    }
    const Guest = []
    if (Array.isArray(storeUp.guestmode)) {
      for (let i = 0; i < storeUp.guestmode.length; i++) {
        const kiosk = {
          guestmode: storeUp.guestmode[i].guestmode,
          kiosk: storeUp.guestmode[i].kiosk,
          other: storeUp.guestmode[i].other
        };
        Guest.push(kiosk);
      }
    }
    if (storeUp.guestmode === undefined) {
      const kiosk = {
        guestmode: false,
        kiosk: {
          name: false,
          phone: false,
          email: false,
          address: false
        },
        other: {
          name: false,
          phone: false,
          email: false,
          address: false
        },
      };
      Guest.push(kiosk);
    }
const kkk =[]
 for (const IDByID of OldAndNew) {
          if (storeUp.defaultMode.toString() === IDByID.OldOne.toString()) {
            kkk.push(IDByID.NewOne) 
          }
        }
    await Store.updateOne(
      { _id: new mongoose.Types.ObjectId(newStoreID) },
      { $set: { guestmode: Guest, categories: obj1, consumationModes: consoumation, products: obj2,defaultMode:kkk[0] } }
    );
    res.status(200).json({});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
//tags
router.post('/tags', async (req, res) => {
  try {
    const { name, storeId } = req.body;
    const storeExists = await Store.findById(storeId);
    if (!storeExists) {
      return res.status(404).json({ message: 'Store not found' });
    }
    const newTag = new Tags({ name, storeId });
    await newTag.save();
    res.status(201).json({ message: 'Tag added successfully', tag: newTag });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.get('/tags/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const storeExists = await Store.findById(storeId);
    if (!storeExists) {
      return res.status(404).json({ message: 'Store not found' });
    }
    const tags = await Tags.find({ storeId });
res.status(200).json(tags);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.delete('/tags/:tagId', async (req, res) => {
  try {
    const { tagId } = req.params;

    // Vérifier si le tag existe
    const tag = await Tags.findById(tagId);
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    // Supprimer le tag
    await Tags.findByIdAndDelete(tagId);

    // Trouver tous les produits contenant le tag à supprimer
    const productsWithDeletedTag = await Product.find({ tags: tagId });

    // Parcourir les produits et supprimer l'ID du tag
    for (const product of productsWithDeletedTag) {
      const index = product.tags.indexOf(tagId);
      if (index !== -1) {
        product.tags.splice(index, 1); // Supprimer l'ID du tag du tableau des tags du produit
        await product.save(); // Enregistrer le produit mis à jour
      }
    }

    res.status(200).json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.put('/tags/:tagId', async (req, res) => {
  try {
    const { tagId } = req.params;
    const { name } = req.body;

    // Vérifier si le tag existe
    const tag = await Tags.findById(tagId);
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    // Mettre à jour le nom du tag
    tag.name = name; // Mettez à jour d'autres propriétés si nécessaire

    // Enregistrer les modifications dans la base de données
    await tag.save();

    // Retourner le tag mis à jour
    res.status(200).json({ message: 'Tag updated successfully', tag });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
//automatique manuelle
router.put("/managingacceptedorders", async (req, res) => {
  try {
    const { preparationTime, Manual, Automatic, storeId } = req.body
    const updateStore = await Store.findOneAndUpdate({ _id: storeId }, { managingacceptedorders: { preparationTime, Manual, Automatic } }, { new: true })
    if (!updateStore) {
      return res.status(400).json({
        message: "Update store was failed."
      })
    }
    return res.status(200).json({
      message: "Update store does successfully.",
      data: updateStore.managingacceptedorders
    })
  } catch (err) {
    res.status(500).json({
      message: err?.message
    })
  }
})
router.put("/updateorganization", async (req, res) => {
  try {
    const { name, storeId, option } = req.body
    const store = await Store.findOne({ _id: storeId })
    if (!store) {
      return res.status(404).json({
        message: "Store not found."
      })
    }
    const index = store.organizations.findIndex(organization => organization.name === name)
    if (index !== -1) {
      const updatedOrganizations = store.organizations.map((org, idx) => ({
        ...org,
        options: org.options.map(option => ({ ...option, checked: idx !== index && false }))
      }));
      store.organizations = updatedOrganizations
      let data = store.organizations[index].options
      if (data.filter(option => option.checked).length === 0) {
        for (let i = 0; i < data.length; i++) {
          if (option === data[i].name) {
            data[i].checked = !data[i].checked
          }
        }
      } else {
        for (let i = 0; i < data.length; i++) {
          data[i].checked = !data[i].checked
        }
      }
      store.organizations[index].options = data
      const updateStore = await Store.updateOne({ _id: storeId }, { organizations: store.organizations }, { new: true })
      if (!updateStore) {
        return res.status(400).json({
          message: "Update store was failed."
        })
      }
      return res.status(200).json({
        message: "Update store does successfully.",
        data: updateStore.organizations
      })
    }
  } catch (err) {
    res.status(500).json({
      message: err?.message
    })
  }
})
router.put("/updateorganizationstooff", async (req, res) => {
  try {
    const { storeId } = req.body
    const store = await Store.findOne({ _id: storeId })
    if (!store) {
      return res.status(404).json({
        message: "Store not found."
      })
    }
    const updatedOrganizations = store.organizations.map((org) => ({
      ...org,
      options: org.options.map(option => ({ ...option, checked: false }))
    }));
    store.organizations = updatedOrganizations
    const updateStore = await Store.updateOne({ _id: storeId }, { organizations: store.organizations }, { new: true })
    if (!updateStore) {
      return res.status(400).json({
        message: "Update store was failed."
      })
    }
    return res.status(200).json({
      message: "Update store does successfully.",
      data: updateStore.organizations
    })
  } catch (err) {
    res.status(500).json({
      message: err?.message
    })
  }
});

//deletemenu
router.delete('/menu/store/:storeId', checkOwner, async (req, res) => {
  const { storeId } = req.params;

  try {
    // Find and delete the menu associated with the store
    const deletedMenu = await Menu.findOneAndDelete({ store: storeId });

    if (!deletedMenu) {
      return res.status(404).json({ message: 'Menu not found' });
    }

    res.status(200).json({ message: 'Menu deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu:', error);
    res.status(500).json({ message: 'Error deleting menu', error });
  }
});


module.exports = router;
