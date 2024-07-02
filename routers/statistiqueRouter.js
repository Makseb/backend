const express = require("express");
const router = express.Router();
const Order = require("../models/order.js");
const mongoose = require("mongoose");
const Product = require('../models/product.js');
const Category = require('../models/category.js');
const Company = require("../models/company.js");
const Store = require('../models/store.js');

router.get('/orders/total/:storeId', async (req, res) => {
    try {
      const totalOrders = await Order.countDocuments({ storeId: req.params.storeId });
      res.json({ totalOrders });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  router.get('/orders/status/:storeId', async (req, res) => {
    try {
      const ordersByStatus = await Order.aggregate([
        { $match: { storeId: new mongoose.Types.ObjectId(req.params.storeId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $group: { _id: null, total: { $sum: '$count' }, statuses: { $push: { status: '$_id', count: '$count' } } } },
        {
          $project: {
            _id: 0,
            statuses: {
              $map: {
                input: '$statuses',
                as: 'status',
                in: {
                  status: '$$status.status',
                  count: '$$status.count',
                  percentage: { $multiply: [{ $divide: ['$$status.count', '$total'] }, 100] },
                },
              },
            },
          },
        },
      ]);
    
      res.json(ordersByStatus.length > 0 ? ordersByStatus[0].statuses : []);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  router.get('/orders/total/:storeId/:year/:month', async (req, res) => {
    try {
      const storeId = req.params.storeId;
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
  
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
  
      const totalOrders = await Order.countDocuments({
        storeId,
        createdAt: { $gte: startOfMonth, $lt: endOfMonth }
      });
  
      res.json({ totalOrders });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  router.get('/orders/total/:storeId/:year', async (req, res) => {
    try {
      const storeId = req.params.storeId;
      const year = parseInt(req.params.year);
  
      const monthlyOrders = [];
  
      for (let month = 1; month <= 12; month++) {
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
  
        const totalOrders = await Order.countDocuments({
          storeId,
          createdAt: { $gte: startOfMonth, $lt: endOfMonth },
          status: "accepted" // Filter by status "accepted"

        });
  
        monthlyOrders.push({ month, totalOrders });
      }
  
      res.json({ monthlyOrders });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  router.get("/weekly-comparison", async (req, res) => {
    try {
      // Assuming request contains parameters 'year' and 'week'
      const { year, week } = req.query;
  
      // Function to calculate cumulative amounts for a given week
      const calculateCumulativeAmounts = async (year, week) => {
        try {
          // Calculate the start and end dates for the specified week
          const startDate = new Date(`${year}-01-01`);
          startDate.setDate(startDate.getDate() - startDate.getDay() + 7 * (week - 1));
      
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
      
          // Initialize cumulativeAmounts with zero values for all days of the week
          const cumulativeAmounts = {};
          for (let i = 0; i < 7; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            cumulativeAmounts[currentDate.toLocaleDateString()] = 0;
          }
      
          const orders = await Order.find({
            createdAt: { $gte: startDate, $lte: endDate },
            status: "accepted" 

          });
      
          // Update cumulativeAmounts based on the orders
          orders.forEach((order) => {
            const orderDate = new Date(order.createdAt).toLocaleDateString();
            cumulativeAmounts[orderDate] += order.price_total;
          });
      
          return cumulativeAmounts;
        } catch (error) {
          console.error(error);
          throw new Error("Error calculating cumulative amounts");
        }
      };
  
      // Calculate cumulative amounts for each week
      const cumulativeAmountsWeek = await calculateCumulativeAmounts(year, week);
  
      res.json({ cumulativeAmountsWeek });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
// Custom rounding function to round up to the nearest 100
const roundToNearest100 = (value) => Math.ceil(value / 100) * 100;
// router.get("/date-range-comparison", async (req, res) => {
//   try {
//     // Assuming request contains parameters 'startWeek1', 'endWeek1', 'startWeek2', 'endWeek2'
//     const { startWeek1, endWeek1, startWeek2, endWeek2 } = req.query;

//     // Function to calculate cumulative amounts for a given date range
//     const calculateCumulativeAmounts = async (startDate, endDate) => {
//       try {
//         // Initialize cumulativeAmounts with zero values for all days within the date range
//         const cumulativeAmounts = {};
//         let currentDate = new Date(startDate);

//         while (currentDate <= new Date(endDate)) {
//           cumulativeAmounts[currentDate.toLocaleDateString()] = 0;
//           currentDate.setDate(currentDate.getDate() + 1);
//         }

//         const orders = await Order.find({
//           createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
//         });

//         // Update cumulativeAmounts based on the orders
//         orders.forEach((order) => {
//           const orderDate = new Date(order.createdAt).toLocaleDateString();
//           cumulativeAmounts[orderDate] += order.price_total;
//         });

//         // Calculate and store the maximum cumulative amount
//         const maxCumulativeAmount = Math.max(...Object.values(cumulativeAmounts));

//         return { cumulativeAmounts, maxCumulativeAmount };
//       } catch (error) {
//         console.error(error);
//         throw new Error("Error calculating cumulative amounts");
//       }
//     };

//     // Calculate cumulative amounts for each date range
//     const resultRange1 = await calculateCumulativeAmounts(startWeek1, endWeek1);
//     const resultRange2 = await calculateCumulativeAmounts(startWeek2, endWeek2);

//     // Find the overall maximum cumulative amount
//     const overallMaxCumulativeAmount = Math.max(
//       resultRange1.maxCumulativeAmount,
//       resultRange2.maxCumulativeAmount
//     );

//     // Round up to the nearest 100
//     const roundedOverallMaxCumulativeAmount = roundToNearest100(overallMaxCumulativeAmount);

//     res.json({
//       cumulativeAmountsRange1: resultRange1.cumulativeAmounts,
//       maxCumulativeAmountRange1: resultRange1.maxCumulativeAmount,
//       cumulativeAmountsRange2: resultRange2.cumulativeAmounts,
//       maxCumulativeAmountRange2: resultRange2.maxCumulativeAmount,
//       overallMaxCumulativeAmount: roundedOverallMaxCumulativeAmount,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });
router.get("/date-range-comparison", async (req, res) => {
  try {
    const { startWeek1, endWeek1, startWeek2, endWeek2, storeId } = req.query;

    const calculateCumulativeAmounts = async (startDate, endDate, storeId) => {
      try {
        const cumulativeAmounts = {};
        let currentDate = new Date(startDate);

        while (currentDate <= new Date(endDate)) {
          cumulativeAmounts[currentDate.toLocaleDateString()] = 0;
          currentDate.setDate(currentDate.getDate() + 1);
        }
        const orders = await Order.find({
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
          storeId: new mongoose.Types.ObjectId(storeId),
          status: "accepted",
        });
        
        orders.forEach((order) => {
          const orderDate = new Date(order.createdAt).toLocaleDateString();
          cumulativeAmounts[orderDate] += order.price_total;
        });

        const maxCumulativeAmount = Math.max(...Object.values(cumulativeAmounts));

        return { cumulativeAmounts, maxCumulativeAmount };
      } catch (error) {
        console.error(error);
        throw new Error("Error calculating cumulative amounts");
      }
    };

    const resultRange1 = await calculateCumulativeAmounts(startWeek1, endWeek1, storeId);
    const resultRange2 = await calculateCumulativeAmounts(startWeek2, endWeek2, storeId);

    const overallMaxCumulativeAmount = Math.max(
      resultRange1.maxCumulativeAmount,
      resultRange2.maxCumulativeAmount
    );

    const roundedOverallMaxCumulativeAmount = roundToNearest100(overallMaxCumulativeAmount);

    res.json({
      cumulativeAmountsRange1: resultRange1.cumulativeAmounts,
      maxCumulativeAmountRange1: resultRange1.maxCumulativeAmount,
      cumulativeAmountsRange2: resultRange2.cumulativeAmounts,
      maxCumulativeAmountRange2: resultRange2.maxCumulativeAmount,
      overallMaxCumulativeAmount: roundedOverallMaxCumulativeAmount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//comparaison par mois
router.get("/monthly-comparison", async (req, res) => {
  try {
    const { startMonth1, endMonth1, startMonth2, endMonth2, storeId } = req.query;

    // Convertir les dates au format "DD/MM/YYYY" en "YYYY-MM-DD"
    const convertDate = (dateString) => {
      const [day, month, year] = dateString.split('/');
      return `${year}-${month}-${day}`;
    };

    const convertedStartMonth1 = convertDate(startMonth1);
    const convertedEndMonth1 = convertDate(endMonth1);
    const convertedStartMonth2 = convertDate(startMonth2);
    const convertedEndMonth2 = convertDate(endMonth2);

    // Convertir les dates en objets Date
    const start1 = new Date(convertedStartMonth1);
    const end1 = new Date(convertedEndMonth1);
    const start2 = new Date(convertedStartMonth2);
    const end2 = new Date(convertedEndMonth2);

    console.log("start1", start1);
    console.log("end1", end1);
    console.log("start2", start2);
    console.log("end2", end2);

    if (isNaN(start1.getTime()) || isNaN(end1.getTime()) || isNaN(start2.getTime()) || isNaN(end2.getTime())) {
      return res.status(400).json({ error: "Invalid start or end date" });
    }

    const calculateCumulativeAmounts = async (startDate, endDate, storeId) => {
      try {
        // Convertir les dates au format ISO
        startDate = startDate.toISOString().split('T')[0];
        endDate = endDate.toISOString().split('T')[0];
    
        const cumulativeAmounts = {};
        let currentDate = new Date(startDate);
    
        while (currentDate <= new Date(endDate)) {
          cumulativeAmounts[currentDate.toLocaleDateString()] = 0;
          currentDate.setDate(currentDate.getDate() + 1);
        }
    
        const orders = await Order.find({
          createdAt: { $gte: startDate, $lte: endDate },
          storeId: new mongoose.Types.ObjectId(storeId),
          status: "accepted",
        });
    
        orders.forEach((order) => {
          // Vérifier si la date de la commande est valide
          if (!isNaN(new Date(order.createdAt).getTime())) {
            const orderDate = new Date(order.createdAt).toLocaleDateString();
            cumulativeAmounts[orderDate] += order.price_total;
          } else {
            console.error(`Invalid date for order: ${order._id}`);
            // Vous pouvez gérer cette erreur comme vous le souhaitez
          }
        });
    
        const maxCumulativeAmount = Math.max(...Object.values(cumulativeAmounts));
    
        return { cumulativeAmounts, maxCumulativeAmount };
      } catch (error) {
        console.error(error);
        throw new Error("Erreur lors du calcul des montants cumulatifs");
      }
    };
    
    // Appel de la fonction pour chaque mois
    const resultMonth1 = await calculateCumulativeAmounts(start1, end1, storeId);
    const resultMonth2 = await calculateCumulativeAmounts(start2, end2, storeId);

    // Calcul du montant cumulatif maximal global
    const overallMaxCumulativeAmount = Math.max(
      resultMonth1.maxCumulativeAmount,
      resultMonth2.maxCumulativeAmount
    );

    // Arrondi du montant cumulatif maximal global
    const roundedOverallMaxCumulativeAmount = roundToNearest100(overallMaxCumulativeAmount);
console.log( "cumulativeAmountsMonth1:", resultMonth1.cumulativeAmounts,
 " maxCumulativeAmountMonth1:" ,resultMonth1.maxCumulativeAmount,
  "cumulativeAmountsMonth2:" ,resultMonth2.cumulativeAmounts,
  "maxCumulativeAmountMonth2:", resultMonth2.maxCumulativeAmount,
  "overallMaxCumulativeAmount:" ,roundedOverallMaxCumulativeAmount,)
    res.json({
      cumulativeAmountsMonth1: resultMonth1.cumulativeAmounts,
      maxCumulativeAmountMonth1: resultMonth1.maxCumulativeAmount,
      cumulativeAmountsMonth2: resultMonth2.cumulativeAmounts,
      maxCumulativeAmountMonth2: resultMonth2.maxCumulativeAmount,
      overallMaxCumulativeAmount: roundedOverallMaxCumulativeAmount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur Interne du Serveur" });
  }
});
router.get("/year-range-comparison", async (req, res) => {
  try {
    const { startYear1, endYear1, startYear2, endYear2, storeId } = req.query;

    // Function to calculate cumulative amounts for a given year range and store
    const calculateCumulativeAmounts = async (startYear, endYear, storeId) => {
      try {
        // Initialize cumulativeAmounts with zero values for all months within the year range
        const cumulativeAmounts = {};
        let currentDate = new Date(`${startYear}-01-01`);

        while (currentDate <= new Date(`${endYear}-12-31`)) {
          cumulativeAmounts[currentDate.toLocaleDateString("en-US", { month: "long" })] = 0;
          currentDate.setMonth(currentDate.getMonth() + 1);
        }

        const orders = await Order.find({
          createdAt: { $gte: new Date(`${startYear}-01-01`), $lte: new Date(`${endYear}-12-31`) },
          storeId: storeId, // Filter by storeId
          status: "accepted" // Filter by status "accepted"
        });

        // Update cumulativeAmounts based on the valid orders
        orders.forEach((order) => {
          const orderDate = new Date(order.createdAt);
          // Check if orderDate is a valid date
          if (!isNaN(orderDate.valueOf())) {
            const orderMonth = orderDate.toLocaleDateString("en-US", { month: "long" });
            cumulativeAmounts[orderMonth] += order.price_total;
          }
        });

        // Calculate and store the maximum cumulative amount
        const maxCumulativeAmount = Math.max(...Object.values(cumulativeAmounts));

        return { cumulativeAmounts, maxCumulativeAmount };
      } catch (error) {
        console.error(error);
        throw new Error("Error calculating cumulative amounts");
      }
    };

    // Calculate cumulative amounts for the store and each year range
    const resultRange1 = await calculateCumulativeAmounts(startYear1, endYear1, storeId);
    const resultRange2 = await calculateCumulativeAmounts(startYear2, endYear2, storeId);

    // Find the overall maximum cumulative amount
    const overallMaxCumulativeAmount = Math.max(
      resultRange1.maxCumulativeAmount,
      resultRange2.maxCumulativeAmount
    );

    // Round up to the nearest 100
    const roundedOverallMaxCumulativeAmount = roundToNearest100(overallMaxCumulativeAmount);
    res.json({
      cumulativeAmountsRange1: resultRange1.cumulativeAmounts,
      maxCumulativeAmountRange1: resultRange1.maxCumulativeAmount,
      cumulativeAmountsRange2: resultRange2.cumulativeAmounts,
      maxCumulativeAmountRange2: resultRange2.maxCumulativeAmount,
      overallMaxCumulativeAmount: roundedOverallMaxCumulativeAmount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//ventes
router.get('/sales', async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const orders = await Order.find({
      storeId,
      createdAt: { $gte: start, $lte: end }
    });
    let totalHT = 0;
    let totalTTC = 0;

    orders.forEach(order => {
      totalHT += order.priceHt_total;
      totalTTC += order.price_total;
    });
        const finaltotalHT=totalHT.toFixed(2)
        const finaltotalTTC=totalTTC.toFixed(2)
    res.json({ finaltotalHT, finaltotalTTC });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.get("/most-bought-product/:storeId", async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const pipeline = [
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
        },
      },
      {
        $unwind: "$items",
      },
      {
        $group: {
          _id: "$items.id",
          totalQuantity: { $sum: "$items.quantity" },
        },
      },
      {
        $sort: { totalQuantity: -1 },
      },
      {
        $limit: 1,
      },
    ];
    const result = await Order.aggregate(pipeline);
    if (result.length > 0) {
      const mostBoughtProduct = result[0];
      res.json(mostBoughtProduct);
    } else {
      res.status(404).json({ message: "No orders found for the given store." });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.get("/store/:storeId/clients", async (req, res) => {
  try {
    const { storeId } = req.params;
    const { page = 1, pageSize = 10 } = req.query; 
    const skip = (page - 1) * pageSize;
    const clients = await Order.aggregate([
      { $match: { storeId: new mongoose.Types.ObjectId(storeId), status: "accepted" } }, 
      { $group: {
          _id: {
            client_first_name: "$client_first_name",
            client_last_name: "$client_last_name",
            client_email: "$client_email",
            client_phone: "$client_phone"
          },
          total_orders: { $sum: 1 }, 
          total_spent: { $sum: "$price_total" },
          last_order_date: { $max: "$createdAt" } 
      }},
      { $project: {
          _id: 0,
          client_first_name: "$_id.client_first_name",
          client_last_name: "$_id.client_last_name",
          client_email: "$_id.client_email",
          client_phone: "$_id.client_phone",
          total_orders: 1,
          total_spent: 1,
          last_order_date: {
            $dateToString: {
              format: "%d-%m-%Y", 
              date: "$last_order_date"
            }
          }
      }},
      { $skip: skip }, 
      { $limit: parseInt(pageSize) } 
    ]);

    res.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/date-range-comparison-store", async (req, res) => {
  try {
    const { startDate, endDate, storeId1, storeId2 } = req.query;

    const calculateCumulativeAmounts = async (startDate, endDate, storeId) => {
      try {
        const cumulativeAmounts = {};
        let currentDate = new Date(startDate);
        while (currentDate <= new Date(endDate)) {
          cumulativeAmounts[currentDate.toLocaleDateString()] = 0;
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Récupérer les commandes du magasin pour la plage de dates spécifiée
        const orders = await Order.find({
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
          storeId: new mongoose.Types.ObjectId(storeId),
          status: "accepted", // Filtre par le statut "accepted"

        });

        // Calculer les montants cumulatifs pour chaque jour
        orders.forEach((order) => {
          const orderDate = new Date(order.createdAt).toLocaleDateString();
          cumulativeAmounts[orderDate] += order.price_total;
        });

        // Récupérer le nom du magasin à partir de l'ID du magasin
        const store = await Store.findById(storeId);

        // Calculer le montant cumulatif maximum
        const maxCumulativeAmount = Math.max(...Object.values(cumulativeAmounts));

        return { cumulativeAmounts, maxCumulativeAmount, storeName: store.name };
      } catch (error) {
        console.error(error);
        throw new Error("Error calculating cumulative amounts");
      }
    };

    // Calculer les montants cumulatifs pour chaque magasin
    const resultStore1 = await calculateCumulativeAmounts(startDate, endDate, storeId1);
    const resultStore2 = await calculateCumulativeAmounts(startDate, endDate, storeId2);

    // Calculer le montant cumulatif maximum global
    const overallMaxCumulativeAmount = Math.max(resultStore1.maxCumulativeAmount, resultStore2.maxCumulativeAmount);
    const roundedOverallMaxCumulativeAmount = roundToNearest100(overallMaxCumulativeAmount);

    res.json({
      cumulativeAmountsStore1: resultStore1.cumulativeAmounts,
      maxCumulativeAmountStore1: resultStore1.maxCumulativeAmount,
      storeNameStore1: resultStore1.storeName, // Ajouter le nom du magasin
      cumulativeAmountsStore2: resultStore2.cumulativeAmounts,
      maxCumulativeAmountStore2: resultStore2.maxCumulativeAmount,
      storeNameStore2: resultStore2.storeName, // Ajouter le nom du magasin
      overallMaxCumulativeAmount: roundedOverallMaxCumulativeAmount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//par Mois
router.get("/comparison-store-parmois", async (req, res) => {
  try {
    let { startDate, endDate, storeId1, storeId2 } = req.query;

    // Convertir les dates au format "DD/MM/YYYY" en "YYYY-MM-DD"
    startDate = startDate.split('/').reverse().join('-');
    endDate = endDate.split('/').reverse().join('-');

    // Convertir les dates en objets Date
    const start = new Date(startDate);
    const end = new Date(endDate);

    console.log("start", start);
    console.log("end", end);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid start or end date" });
    }

    const calculateCumulativeAmounts = async (startDate, endDate, storeId) => {
      try {
        const cumulativeAmounts = {};
        let maxCumulativeAmount = 0; // Initialisez le montant cumulatif maximum à zéro
        let storeName = ''; // Initialisez le nom du magasin

        let currentDate = new Date(startDate);

        // Initialisez les montants cumulatifs pour chaque jour du mois
        while (currentDate <= new Date(endDate)) {
          cumulativeAmounts[currentDate.toISOString().split('T')[0]] = 0; // Initialisation à zéro
          currentDate.setDate(currentDate.getDate() + 1);
        }

        currentDate = new Date(startDate); // Réinitialisez la date actuelle

        // Récupérez les commandes du magasin pour la plage de dates spécifiée
        const orders = await Order.find({
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
          storeId: storeId,
          status: "accepted", // Filtre par le statut "accepted"
        });

        // Calculer les montants cumulatifs pour chaque jour
        orders.forEach((order) => {
          const orderDate = new Date(order.createdAt).toISOString().split('T')[0]; // Date de la commande
          cumulativeAmounts[orderDate] += order.price_total; // Ajouter le montant de la commande
        });

        // Trouver le montant cumulatif maximum
        maxCumulativeAmount = Math.max(...Object.values(cumulativeAmounts));

        // Récupérer le nom du magasin à partir de l'ID du magasin
        const store = await Store.findById(storeId);
        storeName = store.name;

        console.log("cumulativeAmounts", cumulativeAmounts);
        console.log("maxCumulativeAmount", maxCumulativeAmount);
        console.log("storeName", storeName);

        return { cumulativeAmounts, maxCumulativeAmount, storeName };
      } catch (error) {
        console.error(error);
        throw new Error("Error calculating cumulative amounts");
      }
    };

    // Calculer les montants cumulatifs pour chaque magasin
    const resultStore1 = await calculateCumulativeAmounts(startDate, endDate, storeId1);
    const resultStore2 = await calculateCumulativeAmounts(startDate, endDate, storeId2);

    // Générer les étiquettes pour les jours du mois
    const labels = Object.keys(resultStore1.cumulativeAmounts);

    // Votre logique de calcul des montants cumulatifs pour chaque magasin ici...
    console.log(resultStore1);
    console.log(resultStore2);

    res.json({
      labels: labels,
      cumulativeAmountsStore1: resultStore1.cumulativeAmounts,
      maxCumulativeAmountStore1: resultStore1.maxCumulativeAmount,
      storeNameStore1: resultStore1.storeName, // Ajouter le nom du magasin
      cumulativeAmountsStore2: resultStore2.cumulativeAmounts,
      maxCumulativeAmountStore2: resultStore2.maxCumulativeAmount,
      storeNameStore2: resultStore2.storeName, // Ajouter le nom du magasin
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
/*router.get("/date-range-comparison-store", async (req, res) => {
  try {
    const { startDate, endDate, storeId1, storeId2 } = req.query;
    const calculateCumulativeAmounts = async (startDate, endDate, storeId) => {
      try {
        const cumulativeAmounts = {};
        let currentDate = new Date(startDate);
        while (currentDate <= new Date(endDate)) {
          cumulativeAmounts[currentDate.toLocaleDateString()] = 0;
          currentDate.setDate(currentDate.getDate() + 1);
        }
        const orders = await Order.find({
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
          storeId: new mongoose.Types.ObjectId(storeId),
        });
        orders.forEach((order) => {
          const orderDate = new Date(order.createdAt).toLocaleDateString();
          cumulativeAmounts[orderDate] += order.price_total;
        });
        const maxCumulativeAmount = Math.max(...Object.values(cumulativeAmounts));
        console.log(cumulativeAmounts)
        console.log(maxCumulativeAmount)

        return { cumulativeAmounts, maxCumulativeAmount };
      } catch (error) {
        console.error(error);
        throw new Error("Error calculating cumulative amounts");
      }
    };
    const resultStore1 = await calculateCumulativeAmounts(startDate, endDate, storeId1);
    const resultStore2 = await calculateCumulativeAmounts(startDate, endDate, storeId2);
    const overallMaxCumulativeAmount = Math.max(resultStore1.maxCumulativeAmount, resultStore2.maxCumulativeAmount);
    const roundedOverallMaxCumulativeAmount = roundToNearest100(overallMaxCumulativeAmount);
    res.json({
      cumulativeAmountsStore1: resultStore1.cumulativeAmounts,
      maxCumulativeAmountStore1: resultStore1.maxCumulativeAmount,
      cumulativeAmountsStore2: resultStore2.cumulativeAmounts,
      maxCumulativeAmountStore2: resultStore2.maxCumulativeAmount,
      overallMaxCumulativeAmount: roundedOverallMaxCumulativeAmount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});*/
//getchaqueproduitbystore
router.get('/api/totalProductsSold/:storeId/:itemId', async (req, res) => {
  try {
    const { storeId, itemId } = req.params;
    const orders = await Order.find({ storeId });
    let totalProductsSold = 0;
   orders.forEach(order => {
    const item = order.items.find(item => item.id.toString() === itemId);
   if (item) { totalProductsSold += item.quantity;}
});
    res.json({ totalProductsSold });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
//get produit by store
router.get('/products/sales/:storeId/:startDate/:endDate', async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.params;
    const salesByProduct = await Order.aggregate([
      { 
        $match: { 
          storeId: new mongoose.Types.ObjectId(storeId), 
          status: "accepted",
          createdAt: { 
            $gte: new Date(startDate), // Date de début
            $lte: new Date(endDate)     // Date de fin
          } 
        } 
      }, 
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.id',
          productName: { $first: '$items.name' },
          priceproduct: { $first: '$items.price' },
          totalSales: { $sum: '$items.quantity' }
        }
      }
    ]);
    const totalSalesAllProducts = salesByProduct.reduce((acc, product) => acc + product.totalSales, 0);
    salesByProduct.forEach(product => {
      product.percentTotalSales = (product.totalSales / totalSalesAllProducts) * 100;
    });
    res.json(salesByProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
//regrouper orderbymode 
router.get('/salesbymode/:storeId/:startDate/:endDate', async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.params;

    // Convertir les dates de chaînes de caractères en objets Date
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Exécuter l'agrégation pour récupérer les ventes par mode
    const salesByMode = await Order.aggregate([
      { 
        $match: { 
          storeId: new mongoose.Types.ObjectId(storeId), 
          status: "accepted",
          createdAt: { 
            $gte: start, // Date de début
            $lte: end     // Date de fin
          } 
        } 
      }, 
      {
        $group: {
          _id: '$type', 
          totalSales: { $sum: 1 } 
        }
      }
    ]);

    // Calculer le total des ventes pour tous les modes
    const totalSalesAllModes = salesByMode.reduce((acc, mode) => acc + mode.totalSales, 0);

    // Calculer le pourcentage des ventes pour chaque mode
    salesByMode.forEach(mode => {
      mode.percentTotalMode = (mode.totalSales / totalSalesAllModes) * 100;
    });

    // Renvoyer les données au format JSON
    res.json(salesByMode);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
//status
router.get('/salesbystatus/:storeId/:startDate/:endDate', async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.params;

    // Convertir les dates de chaînes de caractères en objets Date
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Exécuter l'agrégation pour récupérer les ventes par statut
    const salesByStatus = await Order.aggregate([
      { 
        $match: { 
          storeId: new mongoose.Types.ObjectId(storeId), 
          createdAt: { 
            $gte: start, // Date de début
            $lte: end     // Date de fin
          } 
        } 
      }, 
      {$group: {
          _id: '$status', 
          totalstatus: { $sum: 1 } 
        }
      }
    ]);
    const totalSalesAllStatus = salesByStatus.reduce((acc, status) => acc + status.totalstatus, 0);
    salesByStatus.forEach(status => {
      status.percentTotalStatus = (status.totalstatus / totalSalesAllStatus) * 100;
    });
    res.json(salesByStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
//regrouper by categories
router.get('/salesbycategories/:storeId/:startDate/:endDate', async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.params;

    // Convertir les dates de chaînes de caractères en objets Date
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Récupérer les commandes dans la période spécifiée
    const orders = await Order.find({ 
      storeId, 
      status: "accepted",
      createdAt: { $gte: start, $lte: end } 
    });

    // Créer une carte des catégories avec les ventes
    const categoriesMap = {};
    for (const order of orders) {
      for (const product of order.items) {
        const productDetails = await Product.findById(product.id);
        if (productDetails && productDetails.category) {
          const categoryId = productDetails.category.toString();
          categoriesMap[categoryId] = categoriesMap[categoryId] ? categoriesMap[categoryId] + product.quantity : product.quantity;
        }
      }
    }

    // Calculer le total des ventes pour toutes les catégories
    const totalSalesAllCategories = Object.values(categoriesMap).reduce((total, sales) => total + sales, 0);

    // Créer un tableau de catégories avec les ventes et le pourcentage des ventes
    const categoriesWithSalesAndPercentage = [];
    for (const categoryId in categoriesMap) {
      const category = await Category.findById(categoryId);
      if (category) {
        const percentageSales = (categoriesMap[categoryId] / totalSalesAllCategories) * 100;
        categoriesWithSalesAndPercentage.push({
          _id: category._id,
          name: category.name,
          totalSales: categoriesMap[categoryId],
          percentageSales: percentageSales.toFixed(2) 
        });
      }
    }

    // Renvoyer les catégories avec les ventes au format JSON
    res.json(categoriesWithSalesAndPercentage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
//regrouper by mode payement 
router.get('/acceptedpayments/:storeId/:startDate/:endDate', async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.params;

    // Convertir les dates de chaînes de caractères en objets Date
    const start = new Date(startDate);
    const end = new Date(endDate);

    const acceptedPayments = await Order.aggregate([
      { 
        $match: { 
          storeId: new mongoose.Types.ObjectId(storeId),
          status: "accepted", // Filtrer par statut de paiement accepté
          createdAt: { 
            $gte: start, // Date de début
            $lte: end     // Date de fin
          } 
        } 
      }, 
      {
        $group: {
          _id: '$paymentMethod', 
          total: { $sum: 1 } 
        }
      }
    ]);

    // Calcul du nombre total de commandes
    const totalOrders = acceptedPayments.reduce((acc, payment) => acc + payment.total, 0);

    // Ajouter le pourcentage à chaque mode de paiement
    const paymentsWithPercentage = acceptedPayments.map(payment => ({
      ...payment,
      percentage: (payment.total / totalOrders) * 100
    }));

    res.json(paymentsWithPercentage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
//statistique pour company
/*router.get('/top-stores/:companyId/:year', async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const year = parseInt(req.params.year); // Convertir l'année en nombre entier

    const company = await Company.findById(companyId).populate('stores');
    const storeOrdersMap = {};

    // Initialiser la carte des commandes de magasin
    for (const store of company.stores) {
      storeOrdersMap[store._id] = { totalOrders: 0, percentage: 0 };
    }

    // Récupérer les commandes regroupées pour chaque magasin avec filtre par année
    const storeOrders = await Order.aggregate([
      { 
        $match: { 
          storeId: { $in: company.stores.map(store => store._id) },
          status: "accepted", // Filtre par le statut "accepted"
          createdAt: {
            $gte: new Date(year, 0, 1), // Début de l'année spécifiée
            $lt: new Date(year + 1, 0, 1) // Début de l'année suivante
          }
        } 
      },
      { 
        $group: { 
          _id: '$storeId',
          totalOrders: { $sum: 1 } 
        } 
      }
    ]);

    // Calculer le total des commandes de tous les magasins
    const totalOrdersAllStores = storeOrders.reduce((total, storeOrder) => total + storeOrder.totalOrders, 0);

    // Mettre à jour la carte des commandes de magasin avec les pourcentages
    storeOrders.forEach(storeOrder => {
      const storeId = storeOrder._id;
      const totalOrders = storeOrder.totalOrders;
      const percentage = (totalOrders / totalOrdersAllStores) * 100;
      storeOrdersMap[storeId] = { totalOrders, percentage };
    });

    // Créer un tableau des magasins triés par commandes
    const topStores = [];
    for (const store of company.stores) {
      const storeId = store._id;
      const storeName = store.name;
      const { totalOrders, percentage } = storeOrdersMap[storeId];

      const topStore = {
        storeId: storeId,
        storeName: storeName,
        totalOrders: totalOrders,
        percentage: percentage.toFixed(2) 
      };
      topStores.push(topStore);
    }
    res.status(200).json(topStores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});*/
router.post('/top-stores', async (req, res) => {
  try {
    const idStores = req.body.idStores; // Récupérer les identifiants des magasins depuis le corps de la requête
    const year = parseInt(req.body.year); // Récupérer l'année depuis le corps de la requête

    // Récupérer les commandes regroupées pour chaque magasin avec filtre par année
    const storeOrders = await Order.aggregate([
      { 
        $match: { 
          storeId: { $in: idStores }, // Utiliser directement le tableau d'identifiants
          status: "accepted", // Filtre par le statut "accepted"
          createdAt: {
            $gte: new Date(year, 0, 1), // Début de l'année spécifiée
            $lt: new Date(year + 1, 0, 1) // Début de l'année suivante
          }
        } 
      },
      { 
        $group: { 
          _id: '$storeId',
          totalOrders: { $sum: 1 } 
        } 
      }
    ]);

    // Calculer le total des commandes de tous les magasins
    const totalOrdersAllStores = storeOrders.reduce((total, storeOrder) => total + storeOrder.totalOrders, 0);

    // Créer un objet pour stocker les commandes de chaque magasin
    const storeOrdersMap = {};
    // Initialiser le storeOrdersMap avec les identifiants de magasin
    idStores.forEach(storeId => {
      storeOrdersMap[storeId] = { totalOrders: 0, percentage: 0 };
    });

    // Mettre à jour la carte des commandes de magasin avec les pourcentages
    storeOrders.forEach(storeOrder => {
      const storeId = storeOrder._id;
      const totalOrders = storeOrder.totalOrders;
      const percentage = (totalOrders / totalOrdersAllStores) * 100;
      storeOrdersMap[storeId] = { totalOrders, percentage };
    });

    // Créer un tableau des magasins triés par commandes
    const topStores = [];
    // TODO: Récupérer company.stores à partir de votre base de données
    for (const store of company.stores) {
      const storeId = store._id;
      const storeName = store.name;
      const { totalOrders, percentage } = storeOrdersMap[storeId];

      const topStore = {
        storeId: storeId,
        storeName: storeName,
        totalOrders: totalOrders,
        percentage: percentage.toFixed(2) 
      };
      topStores.push(topStore);
    }
    res.status(200).json(topStores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

//chiffre d'affaire par store
router.get('/ChiffreAnnee/:storeId/:year1/:year2', async (req, res) => {
  try {
    const { storeId, year1, year2 } = req.params;

    // Convert year1 and year2 to integers
    const startYear = parseInt(year1);
    const endYear = parseInt(year2);

    // Find orders for the selected store and years
    const orders = await Order.find({
      storeId,
      // Filter orders created within the specified year range
      createdAt: {
        $gte: new Date(startYear, 0), // Start of year1
        $lt: new Date(endYear + 1, 0) // Start of year2
      },
      status: { $in: ["accepted"] }
    });

   // Iterate over each order
   for (const order of orders) {
    // Calculate total revenue for this order
    const orderTotalRevenue = order.items.reduce((acc, item) => acc + item.price, 0);
    // Add order total revenue to total revenue for the company
    totalRevenue += orderTotalRevenue;

    // Calculate total HT revenue for this order
    const orderTotalHtRevenue = order.items.reduce((acc, item) => acc + item.priceHt, 0);
    // Add order total HT revenue to total HT revenue for the company
    totalHtRevenue += orderTotalHtRevenue;
  }

  // Limit totalRevenue to 2 decimal places
  totalRevenue = totalRevenue.toFixed(2);
  totalHtRevenue = totalHtRevenue.toFixed(2);

  res.status(200).json({ totalRevenue, totalHtRevenue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
//chiffre d'affaire de company
router.get('/ChiffreCompany/:companyId/:year', async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const year = parseInt(req.params.year);

    // Find company's stores
    const company = await Company.findById(companyId).populate('stores');

    // Initialize total revenue for the company
    let totalRevenue = 0;
    let totalHtRevenue = 0;

    // Iterate over company's stores
    for (const store of company.stores) {
      // Find orders for this store with status "accepted" and for the specified year
      const storeOrders = await Order.find({ 
        storeId: store._id, 
        status: { $in: ["accepted"] },
        createdAt: {
          $gte: new Date(year, 0, 1), // Start of the year
          $lt: new Date(year + 1, 0, 1) // Start of the next year
        }
      });
    
      // Calculate total revenue for this store's orders in the specified year
      for (const order of storeOrders) {
        const orderTotalRevenue = order.items.reduce((acc, item) => acc + item.price, 0);
        totalRevenue += orderTotalRevenue;
    
        const orderTotalHtRevenue = order.items.reduce((acc, item) => acc + item.priceHt, 0);
        totalHtRevenue += orderTotalHtRevenue;
      }
    }
    
    totalRevenue = totalRevenue.toFixed(2);
    totalHtRevenue = totalHtRevenue.toFixed(2);

    res.status(200).json({ totalRevenue, totalHtRevenue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


router.post('/total-revenue/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const storeIds = req.body.storeIds;

    if (!storeIds || storeIds.length === 0) {
      return res.status(400).json({ message: 'List of store IDs is required.' });
    }

    const mongooseStoreIds = storeIds.map(storeId => new mongoose.Types.ObjectId(storeId));

    // Utiliser l'agrégation pour calculer le chiffre d'affaires total pour chaque magasin et le chiffre d'affaires total de tous les magasins
    const result = await Order.aggregate([
      { 
        $match: { 
          storeId: { $in: mongooseStoreIds },
          status: "accepted", 
          createdAt: {
            $gte: new Date(year, 0, 1), 
            $lt: new Date(year + 1, 0, 1) 
          }
        } 
      },
      {
        $group: {
          _id: '$storeId',
          totalRevenue: { $sum: '$price_total' },
          totalHtRevenue: { $sum: '$priceHt_total' }
        }
      },
      {
        $group: {
          _id: null,
          storeRevenues: { $push: { storeId: '$_id', totalRevenue: '$totalRevenue', totalHtRevenue: '$totalHtRevenue' } },
          totalRevenueAllStores: { $sum: '$totalRevenue' },
          totalHtRevenueAllStores: { $sum: '$totalHtRevenue' }
        }
      },
      {
        $project: {
          _id: 0,
          storeRevenues: 1,
          totalRevenueAllStores: 1,
          totalHtRevenueAllStores: 1
        }
      }
    ]);
console.log(result[0])
    res.status(200).json(result[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});





//
router.post('/store-orders/:year', async (req, res) => {
  try {
    const idStores = req.body.idStores;
    const year = parseInt(req.params.year);

    const storeOrders = await Order.aggregate([
      { 
        $match: { 
          storeId: { $in: idStores.map(storeId => new mongoose.Types.ObjectId(storeId)) },
          status: "accepted", 
          createdAt: {
            $gte: new Date(year, 0, 1), 
            $lt: new Date(year + 1, 0, 1) 
          }
        } 
      },
      {
        $group: {
          _id: '$storeId',
          totalOrders: { $sum: 1 } 
        } 
      },
      {
        $lookup: {
          from: 'stores',
          localField: '_id',
          foreignField: '_id',
          as: 'store'
        }
      },
      {
        $unwind: '$store'
      },
      {
        $project: {
          storeName: '$store.name',
          totalOrders: 1
        }
      },
      {
        $group: {
          _id: null,
          totalOrdersAllStores: { $sum: '$totalOrders' },
          stores: { 
            $push: { 
              storeName: '$storeName',
              totalOrders: '$totalOrders' 
            } 
          }
        }
      },
      {
        $unwind: '$stores'
      },
    {
  $project: {
    storeName: '$stores.storeName',
    totalOrders: '$stores.totalOrders',
    totalOrdersAllStores: 1,
    percentage: { 
      $round: [
        {
          $multiply: [
            { $divide: ['$stores.totalOrders', '$totalOrdersAllStores'] },
            100
          ]
        },
        2 // Spécifie le nombre de chiffres après la virgule pour l'arrondi
      ]
    }
  }
}

    ]);

    res.status(200).json(storeOrders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


module.exports = router;