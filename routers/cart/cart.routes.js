const express = require('express');
const router = express.Router();
const { Cart, Product } = require('../../models/daos/index');
const cart = new Cart;
const product = new Product;
const {cart_statuses} = require('../../config');
require('dotenv').config();
const { sendNotification } = require('../../notifications/nodemailer.config');
const { sendSMS, sendWhatsapp } = require('../../notifications/twilio.config');
const fs = require('fs');
const ejs = require("ejs");

router.get('/', async (req, res) => {
    const user = req.user;
    if(user){
        const userCart = await cart.getCartByUserId(user._id, cart_statuses.CART_IN_PROCESS);

        if(userCart){
            const productPromises = userCart.products.map((item) => {
                return product.getById(item.product_id);
            });

            const productsInCart = await Promise.all(productPromises);
            
            const productsInCartData = productsInCart.map(product => {
                
                const item = userCart.products.find(productInCart => productInCart.product_id == product._id.toString());

                product.quantity = item.quantity;

                return product;
            });

            const totalSpent = productsInCartData.reduce((acc, item) => acc + item.quantity * item.price, 0);

            res.render('main', {productsInCart: productsInCartData, totalSpent: totalSpent, user: user, req: req});

        } else {
            res.render('main', {productsInCart: [], user: user, req: req});
        }
    } else {
        res.redirect('/');
    }
});


router.post('/:product_id/', (req, res) => {
    const { params: { product_id }, body: { quantity } } = req;
    const user_id = req.user._id;
    cart.createNewCart(user_id, product_id, quantity)
        .then(response => {res.status(200).redirect('/api/productos')})
        .catch(error => {res.status(500).json({success: false, error: error.message})});
});

router.delete('/:product_id', (req, res) =>{
    const { product_id } = req.params;
    const user_id = req.user._id;

    if(product_id){
        cart.deleteProductFromCart(user_id, product_id)
            .then(response => {res.status(200).json({success: true, response: response})})
            .catch(error => {res.status(500).json({success: false, error: error.message})});

    } else {
        return res.status(400).json({success: false, response: 'Por favor, ingrese un id válido'});
    }
});

router.get('/finalizarCompra', async (req, res) => {
    const user = req.user;
    const userCart = await cart.getCartByUserId(user._id, cart_statuses.CART_IN_PROCESS);

    if(userCart){
        const changeCartToPurchased = await cart.update(userCart._id, {'status': cart_statuses.CART_PURCHASED});
        
        if(changeCartToPurchased){
            const productPromises = userCart.products.map((item) => {
                return product.getById(item.product_id);
            });
    
            const productsInCart = await Promise.all(productPromises);
            const productsInCartData = productsInCart.map(product => {
                const item = userCart.products.find(productInCart => productInCart.product_id == product._id.toString());
                product.quantity = item.quantity;
                return product;
            });
    
            const totalSpent = productsInCartData.reduce((acc, item) => acc + item.quantity * item.price, 0);
            
            //new purchase email notification to admin
            const data = await ejs.renderFile("notifications/newPurchase.ejs", { products: productsInCartData, user: user, totalSpent: totalSpent });
            
            const mailOptions = {
                from: "Tienda Sweet 90's",
                to: process.env.ADMIN_EMAIL,
                subject: `Nuevo pedido de ${user.name} ${user.email}`,
                html: data
            };

            sendNotification(mailOptions);
            sendWhatsapp(process.env.ADMIN_WHATSAPP, `Nuevo pedido de ${user.name} ${user.email}`);
            sendSMS(user.phone, 'Tu pedido fue recibido y se encuentra en proceso');

            res.redirect('/api/productos');

        }
    }

})

// router.post('/:id/productos', async (req, res) => {
//     const { params: { id }, body: { productId } } = req;

//     if(!productId){
//         return res.status(400).json({success: false, error: 'Por favor, elija un producto'});
//     } else {

//         const existingCart = await cart.getById(id);
//         const existingProduct = await product.getById(productId);
        
//         if(existingCart){
//             const cartProducts = existingCart.products;
            
//             if(existingProduct){
//                 existingProduct.id = productId;
//                 cartProducts.push(existingProduct);

//                 cart.update(id, {products: cartProducts})
//                 .then(response => {res.status(200).json({success: true, response: response})})
//                 .catch(error => {res.status(500).json({success: false, error: error.message})});
//             } else {
//                 return res.status(400).json({success: false, response: 'Producto no encontrado'});
//             }

//         } else {
//             return res.status(400).json({success: false, response: 'Carrito no encontrado'});
//         } 
//     }
// });




// router.delete('/:id/productos/:id_prod', async (req, res) => {
//     const { id, id_prod } = req.params;

//     if(!id_prod){
//         return res.status(400).json({success: false, error: 'Por favor, elija un producto'});
//     } else {

//         const existingCart = await cart.getById(id);
        
//         if(existingCart){
//             const cartProducts = existingCart.products;
//             let productInCart = cartProducts.findIndex(product => product.id == id_prod);
            
//             if(productInCart > -1){
//                 cartProducts.splice(productInCart, 1);

//                 cart.update(id, {products: cartProducts})
//                     .then(response => {res.status(200).json({success: true, response: response})})
//                     .catch(error => {res.status(500).json({success: false, error: error.message})});
//             } else {
//                 return res.status(400).json({success: false, response: 'Producto no encontrado'});
//             }

            
//         } else {
//             return res.status(400).json({success: false, response: 'Carrito no encontrado'});
//         }

//     }
// });

module.exports = router;