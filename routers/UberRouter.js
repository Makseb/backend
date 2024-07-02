// uberRoute.js
const express = require('express');
const router = express.Router();
const request = require('request');
const Order = require('../models/order.js');
const DeliveryQuote = require('../models/delivery.js');

router.post('/getUberToken', (req, res) => {
  const options = {
    method: 'POST',
    url: 'https://auth.uber.com/oauth/v2/token',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    form: {
      client_id: 'IA9Ao-3jrYRWPH1WiNQjZnyK3mnQj5H2',
      client_secret: 'wFczGm0OfeMqc4qTx6I1yl0NERNzgGBO4cIOW-3E',
      grant_type: 'client_credentials',
    //   scope: 'direct.organizations',
      scope: 'eats.deliveries',
    },
  };
  request(options, (error, response, body) => {
    if (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json({ accessToken: JSON.parse(body).access_token });
    }
  });
});
//Créer un devis
router.post('/Creer_devis/:orderID', async (req, res) => {
  try {
    const costumelID = "66d29428-580c-5ddf-9ee1-93482329f960";
    const orderId = req.params.orderID;
    // Récupération des détails de la commande
    const orderDetails = await Order.findById(orderId).exec();
    if (!orderDetails) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const token = req.headers.authorization;
    console.log("token",token)
    const url = `https://api.uber.com/v1/customers/${costumelID}/delivery_quotes`;
    // Construction de la demande
    const requestBody = {
      pickup_address: orderDetails.restaurantAdress,
      dropoff_address: orderDetails.deliveryAdress,
      pickup_phone_number: orderDetails.client_phone,
      manifest_total_value: orderDetails.price_total * 100,
      external_store_id: orderDetails.storeId
    };
console.log(requestBody)
    // Appel à l'API Uber
    const uberDirectResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify(requestBody)
    });
    const errorMessageMap = {
      400: 'The specified location is not in a deliverable area',
      401: 'Unauthorized',
      402: 'Customer suspended',
      403: 'Customer blocked',
      404: 'Customer not found',
      408: 'Request timeout',
      429: 'Customer limited',
      500: 'Internal server error',
      503: 'Couriers busy'
    };
    // Attente de la réponse
    if (uberDirectResponse.ok) {
      const uberDirectData = await uberDirectResponse.json();
      // Enregistrement dans la base de données
      /*const newDeliveryQuote = new DeliveryQuote({
        kind: uberDirectData.kind,
        id: uberDirectData.id,
        fee: uberDirectData.fee,
        orderID: orderId
      });
      await newDeliveryQuote.save();*/
      res.status(201).json({ message: 'Commande created successfully', uberDirectData });
    } else {
      const errorResponse = await uberDirectResponse.json();
    //   console.error('UberDirect API request failed:', errorResponse.message);
    //   const errorMessage = errorMessageMap[uberDirectResponse.status] || 'Unknown error';
      res.status(uberDirectResponse.status).json({ message: 'An error occurred while creating the Commande', error: errorResponse });
    }
  } catch (error) {

    console.error(error);
    res.status(500).json({ message: error?.message });
  }
});
//Créer une diffusion
router.post('/createdelivery/:orderId', async (req, res) => {
    try {
      console.log("orderId",req.params.orderId)
     // console.log("body",req.body)
      const costumelID = "66d29428-580c-5ddf-9ee1-93482329f960";
      const token = req.headers.authorization;
      // create uber delivery
      const url = `https://api.uber.com/v1/customers/${costumelID}/deliveries`;
      const uberDirectResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(req.body)
      });
      // console.log("uberDirectResponse",uberDirectResponse)
      if (!uberDirectResponse.ok) {
        throw new Error(`HTTP error! status: ${uberDirectResponse.status}`);
      }
      const uberDelivery = await uberDirectResponse.json()
      console.log(uberDelivery);
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: req.params.orderId },
        { uberId: uberDelivery.id },
        { new: true }
      );
      if (!updatedOrder) {
        return res.status(404).json({
          message: "Order not found."
        })
      }
      return res.status(200).json({
        // uberDelivery: uberDelivery,
        updatedOrder
      })
    } catch (error) {
      return res.status(500).json({ message: error?.message });
    }
  });
  //Lister les livraisons
  router.get('/deliveries/:storeid', async (req, res) => {
    try {
      const costumelID = "66d29428-580c-5ddf-9ee1-93482329f960";
      const token = req.headers.authorization;
      console.log(token)
      const storeId = req.params.storeid;
      console.log(storeId)
      const url = `https://api.uber.com/v1/customers/${costumelID}/deliveries`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
      });
     /* const allDeliveries = await response.json();
        console.log(allDeliveries);
        const filteredData = allDeliveries.data.filter(item => {
          return item.pickup && item.pickup.external_store_id === storeId;
      });
      console.log(filteredData);
        res.json(filteredData);*/
      if (response.ok) {
        const allDeliveries = await response.json();
        //console.log(allDeliveries);
        if ( allDeliveries !== null) {
          const deliveriesForStore =  allDeliveries.data.filter(item => {
            return item.pickup && item.pickup.external_store_id === storeId;
        });
          if (deliveriesForStore.length > 0) {
            res.json(deliveriesForStore);
          } else {res.status(404).json({ message: 'Aucune livraison pour ce magasin' }); }
        } else { res.status(500).json({ message: 'Les données de livraison ne sont pas au format attendu' });}
      } else {
        const errorData = await response.json();
        res.status(response.status).json(errorData);
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Une erreur s\'est produite' });
    }
  });
  //getdeleveryid
  router.get('/getUberDelivery/:delivery_id', async (req, res) => {
    try {
      const costumelID = "66d29428-580c-5ddf-9ee1-93482329f960";
        const {  delivery_id } = req.params;
        const token = req.headers.authorization;
  console.log(token)
        const url = `https://api.uber.com/v1/customers/${costumelID}/deliveries/${delivery_id}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': token
          };
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });
        if (response.ok) {
            const data = await response.json();
            res.json(data);
        } else {
            const errorData = await response.json();
            res.status(response.status).json(errorData);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Une erreur s\'est produite' });
    }
  });
  router.get('/deliveries', async (req, res) => {
    try {
      const costumelID = "66d29428-580c-5ddf-9ee1-93482329f960";
      const authToken = req.headers.authorization;
      console.log('Authorization Token:', authToken);
      const url = `https://api.uber.com/v1/customers/${costumelID}/deliveries`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${authToken}`
        },
      });
      if (response.ok) {
        const deliveries = await response.json();
        res.json(deliveries);
      } else {
        const errorData = await response.json();
        res.status(response.status).json(errorData);
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Une erreur s\'est produite' });
    }
  });
  //Créer une diffusion
  router.post('/Creer_diffusion/:devisID', async (req, res) => {
    try {
      const costumelID = "66d29428-580c-5ddf-9ee1-93482329f960";
      const devisID = req.params.devisID;
      const devisDetails = await DeliveryQuote.findById(devisID).exec();
      if (!devisDetails) { return res.status(404).json({ message: 'Order not found' }); }
      const authTokenn = req.headers.authorization;
      const url = `https://api.uber.com/v1/customers/${costumelID}/deliveries`;
      const uberDirectResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${authTokenn}`
        },
        body: JSON.stringify({
        })
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'An error occurred while creating the Commande' });
    }
  });
  router.post('/cancels/:deliveryId', async(req, res) => {
    const customerId = "66d29428-580c-5ddf-9ee1-93482329f960";
    const deliveryId = req.params.deliveryId;
    const token = req.headers.authorization;
    const url = `https://api.uber.com/v1/customers/${customerId}/deliveries/${deliveryId}/cancel`;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': token
    };
    // await fetch(url, {
    //     method: 'POST',
    //     headers: headers
    // }).then(response => {
    //     if (response.ok) {
    //         console.log('Livraison annulée avec succès');
    //     } else {
    //         console.error(response.message, response.status);
    //     }
    // }).catch(error => {
    //     console.error('Erreur lors de la requête d\'annulation de la livraison:', error);
    // });
    const response = await fetch(url, {
      method: 'POST',
      headers: headers
    });
    if (response.ok) {
      const deliveries = await response.json();
      res.json(deliveries);
    } else {
      const errorData = await response.json();
      res.status(response.status).json(errorData);
    }
  });
  router.post('/cancel/:deliveryId/:orderId', async (req, res) => {
    try {
      const customerId = "66d29428-580c-5ddf-9ee1-93482329f960";
      const deliveryId = req.params.deliveryId;
      const token = req.headers.authorization;
      const url = `https://api.uber.com/v1/customers/${customerId}/deliveries/${deliveryId}/cancel`;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': token
      }
      const response = await fetch(url, {
        method: 'POST',
        headers: headers
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json()
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: req.params.orderId },
        { uberId: null },
        { new: true }
      );
      if (!updatedOrder) {
        return res.status(404).json({
          message: "Order not found."
        })
      }
      return res.status(200).json({
        updatedOrder,
        uberDelivery: data,
        message: "Delivery has been canceled successfully."
      })
    } catch (err) {
      res.status(500).json({
        message: err?.message
      })
    }
  })
   //update
   router.post('/create-delivery/:delivery_id', async (req, res) => {
    try {
      const  delivery_id  = req.params;
      const token = req.headers.authorization;
      const customerId = "66d29428-580c-5ddf-9ee1-93482329f960";
      const url = `https://api.uber.com/v1/customers/${customerId}/deliveries/${delivery_id}`;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': token
      };
      const data = {
        "dropoff_notes": "Deuxième étage, porte noire à droite.",
        "dropoff_seller_notes": "Contenu fragile - veuillez manipuler la boîte avec soin lors de la livraison.",
        "manifest_reference": "REF0000002",
        "pickup_notes": "Suivez les grands panneaux verts 'Pickup' dans le parking",
        "dropoff_verification": {
          "barcodes": [{
            "value": "W1129082649-1",
            "type": "CODE39"
          }]
        },
        "tip_by_customer": 500
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
      });
      const responseData = await response.json();
      res.status(response.status).json(responseData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'An error occurred while creating the delivery' });
    }
  });
  module.exports = router;
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  